import { useState, useTransition, useEffect } from 'react';
import type { AppTab, AnalysisRecord, MediaType, WorkspaceStatus, SelectedMediaFile, SuspiciousTimestamp, ClassificationCategory } from './types';
import { SAMPLE_ANALYSES } from './data/sampleAnalyses';
import { extractMediaTelemetry } from './utils/forensicsEngine';
import { 
  analyzeImageApi, 
  analyzeVideoApi, 
  analyzeAudioApi, 
  type ApiImageAnalysisResponse, 
  type ApiVideoAnalysisResponse, 
  type ApiAudioAnalysisResponse 
} from './utils/api';
import { soundManager } from './utils/soundEffects';
import { loadStoredHistory, saveStoredHistory, clearStoredHistory } from './utils/historyStorage';
import { useAuth } from './contexts/useAuth';
import { saveRecordToCloud, fetchUserCloudHistory, syncLocalHistoryToCloud, deleteCloudRecord } from './utils/cloudHistory';

import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ProcessingState } from './components/ProcessingState';
import { AnalysisResultSummary } from './components/AnalysisResultSummary';
import { HistoryView } from './components/HistoryView';
import { AboutView } from './components/AboutView';
import { HelpView } from './components/HelpView';
import { PasswordResetModal } from './components/PasswordResetModal';

import { AlertCircle, RotateCcw, FileUp, Sparkles, ShieldCheck } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function App() {
  const [, startTransition] = useTransition();

  // User State from Centralized Auth Context
  const {
    user,
    accessToken,
    signOut,
    isConfigured,
    isPasswordRecovery
  } = useAuth();

  const [dismissedRecovery, setDismissedRecovery] = useState<boolean>(false);
  const showPasswordResetModal = isPasswordRecovery && !dismissedRecovery;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [greeting] = useState(getGreeting);
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');

  // Workflow State Machine
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>('EMPTY');
  const [selectedFileMeta, setSelectedFileMeta] = useState<SelectedMediaFile | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // History & Active Analysis (loaded from localStorage with fallback)
  const [historyRecords, setHistoryRecords] = useState<AnalysisRecord[]>(() => loadStoredHistory());
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisRecord | null>(() => {
    const loaded = loadStoredHistory();
    return loaded[0] || SAMPLE_ANALYSES[0] || null;
  });
  const [isDetailedOpen, setIsDetailedOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load user's private cloud history upon authentication
  useEffect(() => {
    if (user && isConfigured && !user.id.startsWith('usr_demo_')) {
      fetchUserCloudHistory().then(({ data }) => {
        if (data && data.length > 0) {
          setHistoryRecords(prev => {
            const cloudIds = new Set(data.map(d => d.id));
            const localNonDup = prev.filter(p => !cloudIds.has(p.id));
            return [...data, ...localNonDup];
          });
        }
      });
    }
  }, [user, isConfigured]);

  // Start analysis processing
  const handleStartAnalysis = async (selected: { file: File; previewUrl: string; mediaType: MediaType; name: string; size: string }) => {
    soundManager.playDropChime();
    setSelectedFileMeta(selected);
    setWorkspaceStatus('PROCESSING');
    setScanProgress(15);
    setErrorMessage('');

    try {
      const telemetry = await extractMediaTelemetry(selected.file, selected.previewUrl, selected.mediaType);

      // Attempt real inference via FastAPI backend (with verified token)
      let realApiResult: ApiImageAnalysisResponse | null = null;
      let realVideoResult: ApiVideoAnalysisResponse | null = null;
      let realAudioResult: ApiAudioAnalysisResponse | null = null;

      if (selected.mediaType === 'image') {
        const res = await analyzeImageApi(selected.file, accessToken);
        if (res.error) {
          setWorkspaceStatus('FAILED');
          setErrorMessage(res.isOffline 
            ? 'DeepGuard AI backend inference service is offline or unreachable at http://127.0.0.1:8000. Please start the backend server.' 
            : res.error
          );
          return;
        }
        realApiResult = res.data;
      } else if (selected.mediaType === 'video') {
        const res = await analyzeVideoApi(selected.file, accessToken);
        if (res.error) {
          setWorkspaceStatus('FAILED');
          setErrorMessage(res.isOffline 
            ? 'DeepGuard AI backend inference service is offline or unreachable at http://127.0.0.1:8000. Please start the backend server.' 
            : res.error
          );
          return;
        }
        realVideoResult = res.data;
      } else if (selected.mediaType === 'audio') {
        const res = await analyzeAudioApi(selected.file, accessToken);
        if (res.error) {
          setWorkspaceStatus('FAILED');
          setErrorMessage(res.isOffline 
            ? 'DeepGuard AI backend inference service is offline or unreachable at http://127.0.0.1:8000. Please start the backend server.' 
            : res.error
          );
          return;
        }
        realAudioResult = res.data;
      }

      const stepInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 95) {
            clearInterval(stepInterval);
            setTimeout(() => {
              let newRecord: AnalysisRecord;

              if (realApiResult && realApiResult.success) {
                const isInconclusive = realApiResult.predicted_label === 'Inconclusive';
                const isReal = realApiResult.predicted_label === 'Real';
                const confidencePct = Math.round(realApiResult.confidence_score * 100);
                const fakeScore = realApiResult.scores.find(s => s.label === 'Fake');
                const realScore = realApiResult.scores.find(s => s.label === 'Real');
                const fakeProbPct = fakeScore ? Math.round(fakeScore.percentage) : (isReal ? 100 - confidencePct : confidencePct);

                let classification: ClassificationCategory = 'LIKELY_AI_GENERATED';
                let trustLabel: 'VERY LOW TRUST' | 'LOW TRUST' | 'UNCERTAIN' | 'MODERATE TRUST' | 'HIGH TRUST' = 'VERY LOW TRUST';
                let overallTrust = Math.max(1, 100 - fakeProbPct);

                if (isInconclusive) {
                  classification = 'UNCERTAIN';
                  trustLabel = 'UNCERTAIN';
                  overallTrust = 50;
                } else if (isReal) {
                  classification = 'LIKELY_AUTHENTIC';
                  trustLabel = 'HIGH TRUST';
                  overallTrust = confidencePct;
                }

                let summaryText = `Image analyzed via ${realApiResult.model_info.model_id} on ${realApiResult.device_used.toUpperCase()}. Flagged as AI-Generated Synthetic Media.`;
                if (isInconclusive) {
                  summaryText = `Image analyzed via ${realApiResult.model_info.model_id} on ${realApiResult.device_used.toUpperCase()}. Verdict is INCONCLUSIVE: Model activation fell within the ambiguous margin (0.70 - 0.76). Manual expert inspection advised.`;
                } else if (isReal) {
                  summaryText = `Image analyzed via ${realApiResult.model_info.model_id} on ${realApiResult.device_used.toUpperCase()}. Classified as Likely Authentic (Absence of synthetic artifacts above threshold; does not guarantee photographic authenticity).`;
                }

                newRecord = {
                  id: `DG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  title: selected.name,
                  mediaType: 'image',
                  mediaUrl: selected.previewUrl,
                  thumbnailUrl: selected.previewUrl,
                  classification,
                  confidence: confidencePct,
                  summaryText,
                  simpleWhySummary: [
                    `${realApiResult.model_info.active_engine === 'candidate' ? 'ViT Candidate' : 'SigLIP Baseline'} on ${realApiResult.device_used.toUpperCase()} (${realApiResult.inference_time_ms} ms)`,
                    `Verdict: ${realApiResult.predicted_label} (${confidencePct}% class activation)`,
                    `SHA-256 Digest: ${realApiResult.sha256.substring(0, 16)}...`
                  ],
                  trustBreakdown: {
                    overallTrustScore: overallTrust,
                    trustLabel,
                    authenticityScore: overallTrust,
                    aiGenerationRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 10 : 85),
                    provenanceConfidence: 75,
                    metadataReliability: 70
                  },
                  evidenceChain: [
                    {
                      id: `ev-real-${Date.now()}-1`,
                      findingNumber: '01',
                      title: `${realApiResult.model_info.active_engine === 'candidate' ? 'ViT Neural Classifier' : 'SigLIP Neural Model Prediction'} (${realApiResult.predicted_label})`,
                      type: 'Neural Classifier',
                      simpleExplanation: `Model output: ${realApiResult.predicted_label} with ${confidencePct}% confidence on ${realApiResult.device_used.toUpperCase()}.`,
                      technicalExplanation: `Model: ${realApiResult.model_info.model_id} (${realApiResult.model_info.architecture}). Raw Logits: Real=${realScore?.raw_logit?.toFixed(4) || 'N/A'}, Fake=${fakeScore?.raw_logit?.toFixed(4) || 'N/A'}. Inference time: ${realApiResult.inference_time_ms} ms.`,
                      confidence: confidencePct,
                      impact: isReal ? 'INFORMATIONAL' : 'HIGH',
                      riskContribution: isReal ? 0 : fakeProbPct,
                      iconName: isReal ? 'ShieldCheck' : 'ShieldAlert'
                    },
                    {
                      id: `ev-real-${Date.now()}-2`,
                      findingNumber: '02',
                      title: 'Cryptographic SHA-256 Digest',
                      type: 'Hash Integrity',
                      simpleExplanation: 'Calculated SHA-256 hash for media identification and tamper verification.',
                      technicalExplanation: `SHA-256: ${realApiResult.sha256}`,
                      confidence: 100,
                      impact: 'INFORMATIONAL',
                      riskContribution: 0,
                      iconName: 'FileCheck'
                    }
                  ],
                  suspiciousRegions: [],
                  passport: {
                    passportId: `DG-2026-${Math.floor(Math.random() * 900000 + 100000)}`,
                    analysisDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    fileName: selected.name,
                    fileType: selected.file.type || 'Image File',
                    resolution: realApiResult.image_dimensions || telemetry.resolution || 'N/A',
                    fileSize: selected.size,
                    sha256: realApiResult.sha256,
                    classification: isInconclusive ? 'UNCERTAIN' : (isReal ? 'LIKELY_AUTHENTIC' : 'LIKELY_AI_GENERATED'),
                    confidence: confidencePct,
                    trustScore: isInconclusive ? 50 : (isReal ? confidencePct : Math.max(1, 100 - fakeProbPct)),
                    aiRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 10 : 85),
                    provenanceStatus: 'NOT VERIFIED'
                  },
                  modelInfo: {
                    modelName: realApiResult.model_info.model_id,
                    modelVersion: realApiResult.model_info.active_engine === 'candidate' ? 'v2.0-ViT-Candidate' : 'v1.0-SigLIP',
                    detectorType: `${realApiResult.model_info.active_engine === 'candidate' ? 'PyTorch ViT Candidate' : 'PyTorch SigLIP Baseline'} Image Classifier (${realApiResult.device_used.toUpperCase()})`,
                    aiProbability: fakeProbPct,
                    inferenceTimestamp: new Date().toISOString()
                  },
                  exifData: {
                    'File Name': selected.name,
                    'File Size': selected.size,
                    'Resolution': realApiResult.image_dimensions || 'N/A',
                    'Inference Device': realApiResult.device_used.toUpperCase(),
                    'Inference Latency': `${realApiResult.inference_time_ms} ms`
                  },
                  noiseDistributionScore: isReal ? 85 : 25,
                  frequencyAnomalyScore: isReal ? 90 : 30
                };
              } else if (realVideoResult && realVideoResult.success) {
                const isInconclusive = realVideoResult.video_classification.includes('Inconclusive');
                const isReal = realVideoResult.video_classification.includes('Authentic');
                const confidencePct = Math.round(realVideoResult.overall_confidence * 100);
                const fakeProbPct = Math.round(realVideoResult.fake_probability_percentage);

                let classification: ClassificationCategory = 'LIKELY_AI_GENERATED';
                let trustLabel: 'VERY LOW TRUST' | 'LOW TRUST' | 'UNCERTAIN' | 'MODERATE TRUST' | 'HIGH TRUST' = 'VERY LOW TRUST';
                let overallTrust = Math.max(1, 100 - fakeProbPct);

                if (isInconclusive) {
                  classification = 'UNCERTAIN';
                  trustLabel = 'UNCERTAIN';
                  overallTrust = 50;
                } else if (isReal) {
                  classification = 'LIKELY_AUTHENTIC';
                  trustLabel = 'HIGH TRUST';
                  overallTrust = confidencePct;
                }

                let summaryText = `Video analyzed via Frame-Based Keyframe Analysis on ${realVideoResult.device_used.toUpperCase()} (${realVideoResult.sampled_frames_count} frames). Flagged as AI-Generated Video (${realVideoResult.suspicious_frames_count}/${realVideoResult.sampled_frames_count} suspicious frames).`;
                if (isInconclusive) {
                  summaryText = `Video analyzed via Frame-Based Keyframe Analysis on ${realVideoResult.device_used.toUpperCase()} (${realVideoResult.sampled_frames_count} frames). Verdict is INCONCLUSIVE: Keyframe spatial evidence is ambiguous across sampled frames.`;
                } else if (isReal) {
                  summaryText = `Video analyzed via Frame-Based Keyframe Analysis on ${realVideoResult.device_used.toUpperCase()} (${realVideoResult.sampled_frames_count} frames). Classified as Likely Authentic Video (Frame-based check only; lacks 3D temporal detection).`;
                }

                const suspiciousTimestamps = realVideoResult.frame_results
                  .filter(f => f.predicted_label === 'Fake')
                  .map((f, idx: number) => ({
                    id: `susp-vid-${idx}`,
                    startTime: f.timestamp_str,
                    endTime: f.timestamp_str,
                    description: `Keyframe #${f.frame_index} flagged as synthetic (${Math.round(f.confidence_score * 100)}% match)`,
                    confidence: Math.round(f.confidence_score * 100),
                    type: 'Spatial Synthesis Artifact'
                  }));

                newRecord = {
                  id: `DG-VID-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  title: selected.name,
                  mediaType: 'video',
                  mediaUrl: selected.previewUrl,
                  thumbnailUrl: selected.previewUrl,
                  classification,
                  confidence: confidencePct,
                  summaryText,
                  simpleWhySummary: [
                    `Frame-Based Keyframes: ${realVideoResult.sampled_frames_count} frames across ${realVideoResult.duration_seconds}s (${realVideoResult.inference_time_ms} ms)`,
                    `Spatial Fake Activation: ${fakeProbPct}% across keyframe sample`,
                    `Flagged Keyframes: ${realVideoResult.suspicious_frames_count} / ${realVideoResult.sampled_frames_count} frames (No temporal 3D model)`
                  ],
                  trustBreakdown: {
                    overallTrustScore: overallTrust,
                    trustLabel,
                    authenticityScore: overallTrust,
                    aiGenerationRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 15 : 85),
                    provenanceConfidence: 70,
                    metadataReliability: 65
                  },
                  evidenceChain: [
                    {
                      id: `ev-vid-${Date.now()}-1`,
                      findingNumber: '01',
                      title: `Multi-Keyframe SigLIP Video Analysis (${realVideoResult.video_classification})`,
                      type: 'Video Frame Classifier',
                      simpleExplanation: `Sampled ${realVideoResult.sampled_frames_count} keyframes. ${realVideoResult.suspicious_frames_count} frames showed synthetic spatial artifacts.`,
                      technicalExplanation: `Model: ${realVideoResult.model_info.model_id}. Total Video Frames: ${realVideoResult.total_frames_in_video}; FPS: ${realVideoResult.fps}. Processing Time: ${realVideoResult.inference_time_ms} ms on ${realVideoResult.device_used.toUpperCase()}.`,
                      confidence: confidencePct,
                      impact: isReal ? 'INFORMATIONAL' : 'HIGH',
                      riskContribution: isReal ? 0 : fakeProbPct,
                      iconName: isReal ? 'ShieldCheck' : 'ShieldAlert'
                    },
                    {
                      id: `ev-vid-${Date.now()}-2`,
                      findingNumber: '02',
                      title: 'Video Container SHA-256 Digest',
                      type: 'Hash Integrity',
                      simpleExplanation: 'Computed immutable SHA-256 digest for video identification.',
                      technicalExplanation: `SHA-256: ${realVideoResult.sha256}`,
                      confidence: 100,
                      impact: 'INFORMATIONAL',
                      riskContribution: 0,
                      iconName: 'FileCheck'
                    }
                  ],
                  suspiciousRegions: [],
                  videoData: {
                    duration: `${Math.floor(realVideoResult.duration_seconds / 60).toString().padStart(2, '0')}:${Math.floor(realVideoResult.duration_seconds % 60).toString().padStart(2, '0')}`,
                    totalFramesAnalyzed: realVideoResult.total_frames_in_video,
                    suspiciousFramesCount: realVideoResult.suspicious_frames_count,
                    fps: Math.round(realVideoResult.fps),
                    suspiciousTimestamps: suspiciousTimestamps
                  },
                  passport: {
                    passportId: `DG-2026-${Math.floor(Math.random() * 900000 + 100000)}`,
                    analysisDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    fileName: selected.name,
                    fileType: selected.file.type || 'Video File',
                    resolution: telemetry.resolution || '1920 × 1080',
                    fileSize: selected.size,
                    sha256: realVideoResult.sha256,
                    classification: isInconclusive ? 'UNCERTAIN' : (isReal ? 'LIKELY_AUTHENTIC' : 'LIKELY_AI_GENERATED'),
                    confidence: confidencePct,
                    trustScore: isInconclusive ? 50 : (isReal ? confidencePct : Math.max(1, 100 - fakeProbPct)),
                    aiRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 15 : 85),
                    provenanceStatus: 'NOT VERIFIED'
                  },
                  modelInfo: {
                    modelName: realVideoResult.model_info.model_id,
                    modelVersion: 'v1.1-SigLIP-Video',
                    detectorType: `Multi-Keyframe SigLIP Video Classifier (${realVideoResult.device_used.toUpperCase()})`,
                    aiProbability: fakeProbPct,
                    inferenceTimestamp: new Date().toISOString()
                  },
                  exifData: {
                    'File Name': selected.name,
                    'File Size': selected.size,
                    'Duration': `${realVideoResult.duration_seconds}s`,
                    'FPS': `${realVideoResult.fps}`,
                    'Total Frames': `${realVideoResult.total_frames_in_video}`,
                    'Sampled Frames': `${realVideoResult.sampled_frames_count}`,
                    'Inference Latency': `${realVideoResult.inference_time_ms} ms`
                  },
                  noiseDistributionScore: isReal ? 80 : 30,
                  frequencyAnomalyScore: isReal ? 85 : 35
                };
              } else if (realAudioResult && realAudioResult.success) {
                const isInconclusive = realAudioResult.predicted_label === 'Inconclusive';
                const isReal = realAudioResult.predicted_label === 'Real';
                const confidencePct = Math.round(realAudioResult.confidence_score * 100);
                const fakeProbPct = Math.round(realAudioResult.fake_probability_percentage);
                const fakeScore = realAudioResult.scores.find(s => s.label === 'Fake');
                const realScore = realAudioResult.scores.find(s => s.label === 'Real');

                let classification: ClassificationCategory = 'LIKELY_AI_GENERATED';
                let trustLabel: 'VERY LOW TRUST' | 'LOW TRUST' | 'UNCERTAIN' | 'MODERATE TRUST' | 'HIGH TRUST' = 'VERY LOW TRUST';
                let overallTrust = Math.max(1, 100 - fakeProbPct);

                if (isInconclusive) {
                  classification = 'UNCERTAIN';
                  trustLabel = 'UNCERTAIN';
                  overallTrust = 50;
                } else if (isReal) {
                  classification = 'LIKELY_AUTHENTIC';
                  trustLabel = 'MODERATE TRUST'; // Not HIGH TRUST because audio deepfakes can evade Wav2Vec2 without perceptible artifacts
                  overallTrust = Math.min(confidencePct, 75);
                }

                let summaryText = `Audio analyzed via ${realAudioResult.model_info.model_id} on ${realAudioResult.device_used.toUpperCase()}. Flagged as AI-Generated Synthetic Voice (${fakeProbPct}% voice clone risk).`;
                if (isInconclusive) {
                  summaryText = `Audio analyzed via ${realAudioResult.model_info.model_id} on ${realAudioResult.device_used.toUpperCase()}. Verdict is INCONCLUSIVE: Acoustic confidence fell in ambiguous margin (40% - 60%). Manual listening required.`;
                } else if (isReal) {
                  summaryText = `Audio analyzed via ${realAudioResult.model_info.model_id} on ${realAudioResult.device_used.toUpperCase()}. No synthetic vocoder signatures detected above threshold (Authenticity Caveat: absence of artifacts is not proof of authentic human origin).`;
                }

                const suspiciousSegments: SuspiciousTimestamp[] = (realAudioResult.segments || [])
                  .filter(seg => seg.fake_probability_percentage > 50 || seg.predicted_label === 'Fake')
                  .map(seg => ({
                    id: `aud-seg-${seg.segment_index}`,
                    startTime: seg.timestamp_str.split(' - ')[0] || '00:00',
                    endTime: seg.timestamp_str.split(' - ')[1] || '00:03',
                    type: 'Synthetic Vocoder Artifact',
                    description: `Segment flagged as ${seg.predicted_label} (${Math.round(seg.fake_probability_percentage)}% clone probability)`,
                    confidence: Math.round(seg.fake_probability_percentage)
                  }));

                newRecord = {
                  id: `DG-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  title: selected.name,
                  mediaType: 'audio',
                  mediaUrl: selected.previewUrl,
                  thumbnailUrl: selected.previewUrl,
                  classification,
                  confidence: confidencePct,
                  summaryText,
                  simpleWhySummary: [
                    `Wav2Vec2 Neural Classifier on ${realAudioResult.device_used.toUpperCase()} (${realAudioResult.inference_time_ms} ms)`,
                    `Prediction: ${realAudioResult.predicted_label} (${confidencePct}% activation)`,
                    `Exploratory Spectral Index: ${realAudioResult.spectral_anomaly_score}/100; SHA-256: ${realAudioResult.sha256.substring(0, 16)}...`
                  ],
                  trustBreakdown: {
                    overallTrustScore: overallTrust,
                    trustLabel,
                    authenticityScore: overallTrust,
                    aiGenerationRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 15 : 88),
                    provenanceConfidence: 75,
                    metadataReliability: 70
                  },
                  evidenceChain: [
                    {
                      id: `ev-aud-${Date.now()}-1`,
                      findingNumber: '01',
                      title: `Wav2Vec2 Neural Classifier (${realAudioResult.predicted_label})`,
                      type: 'Neural Acoustic Classifier',
                      simpleExplanation: `Model output: ${realAudioResult.predicted_label} with ${confidencePct}% confidence on ${realAudioResult.device_used.toUpperCase()}.`,
                      technicalExplanation: `Model: ${realAudioResult.model_info.model_id} (${realAudioResult.model_info.architecture}). Raw Logits: Real=${realScore?.raw_logit?.toFixed(4) || 'N/A'}, Fake=${fakeScore?.raw_logit?.toFixed(4) || 'N/A'}. Latency: ${realAudioResult.inference_time_ms} ms.`,
                      confidence: confidencePct,
                      impact: isReal ? 'INFORMATIONAL' : 'HIGH',
                      riskContribution: isReal ? 0 : fakeProbPct,
                      iconName: isReal ? 'ShieldCheck' : 'ShieldAlert'
                    },
                    {
                      id: `ev-aud-${Date.now()}-2`,
                      findingNumber: '02',
                      title: 'Acoustic Spectral Anomaly Analysis',
                      type: 'Harmonic Roll-Off',
                      simpleExplanation: `High-frequency harmonic spectrum evaluated (Score: ${realAudioResult.spectral_anomaly_score}/100).`,
                      technicalExplanation: `FFT energy distribution at ${realAudioResult.sample_rate} Hz. Vocoder cut-off index: ${realAudioResult.spectral_anomaly_score}.`,
                      confidence: Math.round(realAudioResult.spectral_anomaly_score),
                      impact: realAudioResult.spectral_anomaly_score > 60 ? 'HIGH' : 'INFORMATIONAL',
                      riskContribution: isReal ? 0 : Math.round(realAudioResult.spectral_anomaly_score / 2),
                      iconName: 'Activity'
                    },
                    {
                      id: `ev-aud-${Date.now()}-3`,
                      findingNumber: '03',
                      title: 'Audio File SHA-256 Digest',
                      type: 'Hash Integrity',
                      simpleExplanation: 'Computed immutable cryptographic SHA-256 checksum for audio verification.',
                      technicalExplanation: `SHA-256: ${realAudioResult.sha256}`,
                      confidence: 100,
                      impact: 'INFORMATIONAL',
                      riskContribution: 0,
                      iconName: 'FileCheck'
                    }
                  ],
                  suspiciousRegions: [],
                  audioData: {
                    duration: `${Math.floor(realAudioResult.duration_seconds / 60).toString().padStart(2, '0')}:${Math.floor(realAudioResult.duration_seconds % 60).toString().padStart(2, '0')}`,
                    sampleRate: `${(realAudioResult.sample_rate / 1000).toFixed(1)} kHz`,
                    channels: realAudioResult.channels === 1 ? 'Mono' : 'Stereo',
                    syntheticVoiceProbability: fakeProbPct,
                    spectralAnomalyScore: Math.round(realAudioResult.spectral_anomaly_score),
                    suspiciousSegments: suspiciousSegments
                  },
                  passport: {
                    passportId: `DG-2026-${Math.floor(Math.random() * 900000 + 100000)}`,
                    analysisDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    fileName: selected.name,
                    fileType: selected.file.type || 'Audio File',
                    resolution: `${realAudioResult.channels === 1 ? 'Mono' : 'Stereo'} @ ${(realAudioResult.sample_rate / 1000).toFixed(1)} kHz`,
                    fileSize: selected.size,
                    sha256: realAudioResult.sha256,
                    classification: isInconclusive ? 'UNCERTAIN' : (isReal ? 'LIKELY_AUTHENTIC' : 'LIKELY_AI_GENERATED'),
                    confidence: confidencePct,
                    trustScore: isInconclusive ? 50 : (isReal ? confidencePct : Math.max(1, 100 - fakeProbPct)),
                    aiRisk: isInconclusive ? 50 : fakeProbPct,
                    manipulationRisk: isInconclusive ? 50 : (isReal ? 10 : 90),
                    provenanceStatus: 'NOT VERIFIED'
                  },
                  modelInfo: {
                    modelName: realAudioResult.model_info.model_id,
                    modelVersion: 'v2.0-Wav2Vec2-Audio',
                    detectorType: `Wav2Vec2 Deepfake Audio Classifier (${realAudioResult.device_used.toUpperCase()})`,
                    aiProbability: fakeProbPct,
                    inferenceTimestamp: new Date().toISOString()
                  },
                  exifData: {
                    'File Name': selected.name,
                    'File Size': selected.size,
                    'Duration': `${realAudioResult.duration_seconds}s`,
                    'Sample Rate': `${realAudioResult.sample_rate} Hz`,
                    'Channels': `${realAudioResult.channels}`,
                    'Inference Latency': `${realAudioResult.inference_time_ms} ms`
                  },
                  noiseDistributionScore: isReal ? 85 : 35,
                  frequencyAnomalyScore: Math.round(realAudioResult.spectral_anomaly_score)
                };
              } else {
                setWorkspaceStatus('FAILED');
                setErrorMessage('Inference returned an incomplete response from the analysis service.');
                return;
              }

              setCurrentAnalysis(newRecord);
              setHistoryRecords(prev => {
                const updated = [newRecord, ...prev];
                saveStoredHistory(updated);
                return updated;
              });

              // Persist to user's isolated cloud history if authenticated with Supabase
              if (user && isConfigured && !user.id.startsWith('usr_demo_')) {
                saveRecordToCloud(newRecord, user.id);
              }

              setWorkspaceStatus('COMPLETED');
              soundManager.playScanComplete();
            }, 300);
            return 100;
          }
          return prev + 22;
        });
      }, 350);
    } catch (err: unknown) {
      setWorkspaceStatus('FAILED');
      setErrorMessage(err instanceof Error ? err.message : 'The analysis service encountered an issue processing this file.');
    }
  };

  const handleSelectSample = (sampleId: string) => {
    const found = SAMPLE_ANALYSES.find(s => s.id === sampleId);
    if (found) {
      soundManager.playDropChime();
      startTransition(() => {
        setCurrentAnalysis(found);
        setWorkspaceStatus('COMPLETED');
      });
    }
  };

  const handleCancelAnalysis = () => {
    setWorkspaceStatus('CANCELLED');
  };

  const handleResetUpload = () => {
    if (selectedFileMeta?.previewUrl && selectedFileMeta.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFileMeta.previewUrl);
    }
    setSelectedFileMeta(null);
    setWorkspaceStatus('EMPTY');
    setIsDetailedOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
    setHistoryRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveStoredHistory(updated);
      return updated;
    });
    if (user && isConfigured && !id.startsWith('TL-')) {
      deleteCloudRecord(id);
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) return;
    if (user.id.startsWith('usr_demo_') || !isConfigured) {
      setSyncNotice('Cloud RLS sync requires signing in with a Supabase account. (Currently operating in local evaluation mode)');
      return;
    }
    setIsSyncing(true);
    setSyncNotice(null);
    const res = await syncLocalHistoryToCloud(historyRecords, user.id);
    setIsSyncing(false);
    if (res.error) {
      setSyncNotice(`Sync notice: ${res.error}`);
    } else {
      setSyncNotice(`Synchronized ${res.importedCount} local record(s) to cloud history. (${res.skippedCount} skipped/already present)`);
      const cloudRes = await fetchUserCloudHistory();
      if (cloudRes.data && cloudRes.data.length > 0) {
        const cloudIds = new Set(cloudRes.data.map(d => d.id));
        setHistoryRecords(prev => [...cloudRes.data!, ...prev.filter(p => !cloudIds.has(p.id))]);
      }
    }
  };

  const handleClearHistory = () => {
    clearStoredHistory();
    setHistoryRecords(SAMPLE_ANALYSES);
    setCurrentAnalysis(SAMPLE_ANALYSES[0] || null);
  };

  // Render AuthScreen if unauthenticated
  if (!user) {
    return (
      <>
        <AuthScreen />
        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => setDismissedRecovery(true)}
        />
      </>
    );
  }

  return (
    <div style={{
      background: 'var(--page-bg)',
      color: 'var(--text-primary)',
      minHeight: '100vh',
      transition: 'all 0.25s ease'
    }}>
      
      {/* Top Raised Neumorphic Header Navigation */}
      <Header
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={signOut}
      />

      <main className="app-container">
        
        {/* ========================================================================= */}
        {/* TAB 1: ADAPTIVE DASHBOARD WORKSPACE */}
        {/* ========================================================================= */}
        {activeTab === 'DASHBOARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            
            {/* Header Welcome Area (Raised Surface) */}
            <div className="glass-card" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge font-mono" style={{ fontSize: '0.72rem', marginBottom: '8px' }}>
                  MEDIA AUTHENTICITY WORKSPACE
                </span>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                  {greeting}, {user.name.split(' ')[0]}. Let's find out what's real.
                </h1>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Upload an image, video, or audio file below to investigate its authenticity and view supporting evidence.
                </p>
              </div>

              {/* Workspace Status Indicator with Inset Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge font-mono neu-inset" style={{ padding: '7px 16px', fontSize: '0.78rem' }}>
                  STATE: {workspaceStatus}
                </span>
              </div>
            </div>

            {/* MAIN ADAPTIVE WORKSPACE CONTAINER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
              
              {/* STATE 1 & 2: EMPTY / FILE_SELECTED DROPZONE */}
              {(workspaceStatus === 'EMPTY' || workspaceStatus === 'FILE_SELECTED') && (
                <UploadZone
                  onAnalyze={handleStartAnalysis}
                  onSampleSelect={handleSelectSample}
                />
              )}

              {/* STATE 3: PROCESSING SCANNER (MEDIA-AWARE ANIMATION) */}
              {workspaceStatus === 'PROCESSING' && selectedFileMeta && (
                <ProcessingState
                  mediaName={selectedFileMeta.name}
                  mediaType={selectedFileMeta.mediaType}
                  previewUrl={selectedFileMeta.previewUrl}
                  scanProgress={scanProgress}
                  onCancel={handleCancelAnalysis}
                />
              )}

              {/* STATE 4: ANALYSIS COMPLETED (PROGRESSIVE DISCLOSURE RESULTS) */}
              {workspaceStatus === 'COMPLETED' && currentAnalysis && (
                <AnalysisResultSummary
                  analysis={currentAnalysis}
                  onResetUpload={handleResetUpload}
                  isDetailedOpen={isDetailedOpen}
                  setIsDetailedOpen={setIsDetailedOpen}
                />
              )}

              {/* STATE 5: ANALYSIS FAILED */}
              {workspaceStatus === 'FAILED' && (
                <div className="glass-card" style={{ padding: '40px 28px', textAlign: 'center' }}>
                  <AlertCircle size={48} color="#991b1b" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    We couldn't complete this analysis.
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '8px auto 20px' }}>
                    {errorMessage || 'The analysis service encountered a problem. You can try again or select another file.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <button onClick={handleResetUpload} className="btn-primary" style={{ padding: '11px 24px' }}>
                      <FileUp size={16} /> Select Another File
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 6: ANALYSIS CANCELLED */}
              {workspaceStatus === 'CANCELLED' && (
                <div className="glass-card" style={{ padding: '40px 28px', textAlign: 'center' }}>
                  <RotateCcw size={44} color="#92400e" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Analysis Cancelled
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '8px auto 20px' }}>
                    The scan was stopped before completion. No report was generated.
                  </p>
                  <button onClick={handleResetUpload} className="btn-primary" style={{ padding: '11px 24px' }}>
                    <Sparkles size={16} /> Start New Scan
                  </button>
                </div>
              )}

            </div>

            {/* SECONDARY CONTENT: RECENT ANALYSES SUMMARY */}
            {historyRecords.length > 0 && (
              <div className="glass-card" style={{ padding: '26px 30px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} /> Recent Verification History ({historyRecords.length})
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {historyRecords.slice(0, 4).map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => {
                        setCurrentAnalysis(rec);
                        setWorkspaceStatus('COMPLETED');
                      }}
                      className="neu-raised-sm"
                      style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <img
                          src={rec.thumbnailUrl}
                          alt={rec.title}
                          style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rec.title}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }} className="font-mono">
                            {rec.mediaType.toUpperCase()} • Score: {rec.trustBreakdown.overallTrustScore}/100
                          </div>
                        </div>
                      </div>

                      <span className="badge font-mono" style={{ fontSize: '0.68rem' }}>
                        {rec.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 3: HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'HISTORY' && (
          <HistoryView
            historyRecords={historyRecords}
            onSelectRecord={(rec) => {
              setCurrentAnalysis(rec);
              setWorkspaceStatus('COMPLETED');
              setActiveTab('DASHBOARD');
            }}
            onDeleteRecord={handleDeleteHistory}
            onClearHistory={handleClearHistory}
            onSyncToCloud={handleSyncToCloud}
            isSyncing={isSyncing}
            syncNotice={syncNotice}
            isCloudConnected={Boolean(isConfigured && user && !user.id.startsWith('usr_demo_'))}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ABOUT */}
        {/* ========================================================================= */}
        {activeTab === 'ABOUT' && <AboutView />}

        {/* ========================================================================= */}
        {/* TAB 5: HELP */}
        {/* ========================================================================= */}
        {activeTab === 'HELP' && <HelpView />}

      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px 20px',
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
        borderTop: '1px solid var(--border-neutral)',
        marginTop: '44px'
      }}>
        DeepGuard AI © 2026 • Detect. Verify. Trust.
      </footer>

      {/* In-app Password Recovery Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setDismissedRecovery(true)}
      />
    </div>
  );
}

export default App;
