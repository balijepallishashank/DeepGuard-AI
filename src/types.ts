export type ClassificationCategory = 
  | 'LIKELY_AUTHENTIC' 
  | 'LIKELY_AI_GENERATED' 
  | 'LIKELY_AI_EDITED' 
  | 'LIKELY_MANIPULATED' 
  | 'UNCERTAIN';

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type AppTab = 'DASHBOARD' | 'HISTORY' | 'ABOUT' | 'HELP';
export type MediaType = 'image' | 'video' | 'audio';

export type WorkspaceStatus = 
  | 'EMPTY'
  | 'FILE_SELECTED'
  | 'VALIDATING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'DETAILED_INVESTIGATION'
  | 'FAILED'
  | 'CANCELLED';

export interface SelectedMediaFile {
  file: File;
  previewUrl: string;
  mediaType: MediaType;
  name: string;
  size: string;
  resolution?: string;
  duration?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  memberSince: string;
}

export interface EvidenceItem {
  id: string;
  findingNumber: string; // e.g. "01"
  title: string;
  type: string; // e.g. "Texture Pattern", "Noise Anomaly"
  simpleExplanation: string;
  technicalExplanation: string;
  confidence: number; // 0-100%
  impact: ImpactLevel;
  riskContribution: number; // e.g. +18
  iconName: string;
  timestamp?: string; // For video/audio segments
}

export interface TrustScoreBreakdown {
  overallTrustScore: number; // 0-100
  trustLabel: 'VERY LOW TRUST' | 'LOW TRUST' | 'UNCERTAIN' | 'MODERATE TRUST' | 'HIGH TRUST';
  authenticityScore: number; // 0-100
  aiGenerationRisk: number; // 0-100
  manipulationRisk: number; // 0-100
  provenanceConfidence: number; // 0-100
  metadataReliability: number; // 0-100
}

export interface SuspiciousRegion {
  id: string;
  locationName: string; // e.g. "Upper-right area", "Face"
  suspectedModification: string; // e.g. "Texture inconsistency", "Facial artifact"
  confidence: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  boxCoords: { x: number; y: number; width: number; height: number }; // percentage coords
}

export interface SuspiciousTimestamp {
  id: string;
  startTime: string; // e.g. "00:04"
  endTime: string; // e.g. "00:09"
  description: string;
  confidence: number;
  type: string;
}

export interface VideoAnalysisData {
  duration: string;
  totalFramesAnalyzed: number;
  suspiciousFramesCount: number;
  fps: number;
  suspiciousTimestamps: SuspiciousTimestamp[];
}

export interface AudioAnalysisData {
  duration: string;
  sampleRate: string;
  channels: string;
  syntheticVoiceProbability: number;
  spectralAnomalyScore: number;
  suspiciousSegments: SuspiciousTimestamp[];
}

export interface ImagePassportData {
  passportId: string; // e.g. "TL-2026-000184"
  analysisDate: string;
  fileName: string;
  fileType: string;
  resolution?: string;
  fileSize: string;
  sha256: string;
  md5?: string;
  pHash?: string;
  classification: ClassificationCategory;
  confidence: number;
  trustScore: number;
  aiRisk: number;
  manipulationRisk: number;
  provenanceStatus: 'VERIFIED' | 'NOT VERIFIED' | 'TAMPERED';
  cameraMake?: string;
  cameraModel?: string;
  softwareUsed?: string;
}

export interface ModelInfo {
  modelName: string;
  modelVersion: string;
  detectorType: string;
  aiProbability: number;
  inferenceTimestamp: string;
}

export interface AnalysisRecord {
  id: string;
  title: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  classification: ClassificationCategory;
  confidence: number;
  trustBreakdown: TrustScoreBreakdown;
  evidenceChain: EvidenceItem[];
  suspiciousRegions: SuspiciousRegion[];
  videoData?: VideoAnalysisData;
  audioData?: AudioAnalysisData;
  passport: ImagePassportData;
  modelInfo: ModelInfo;
  previousTrustScore?: number;
  summaryText: string;
  simpleWhySummary: string[];
  exifData: Record<string, string>;
  noiseDistributionScore: number;
  frequencyAnomalyScore: number;
}

export interface AutopsyChannelIsolation {
  red: string;
  green: string;
  blue: string;
  luminance: string;
}

export interface AutopsyElaResult {
  elaDataUrl: string;
  quality: number;
  amplification: number;
  averageError: number;
  maxError: number;
  suspiciousVariance: boolean;
}

export interface AutopsyKeyframe {
  timestamp: string;
  seconds: number;
  dataUrl: string;
  aHash: string;
}

export interface AutopsyAudioWaveform {
  duration: number;
  peaks: number[];
  sampleRate: number;
  channels: number;
  peakAmplitude: number;
  rmsAmplitude: number;
}

