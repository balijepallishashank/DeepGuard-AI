import type { AnalysisRecord } from '../types';

export const SAMPLE_ANALYSES: AnalysisRecord[] = [
  {
    id: 'TL-2026-000184',
    title: 'Portrait_Diffusion_Synthetic.jpg',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=400&q=80',
    classification: 'LIKELY_AI_GENERATED',
    confidence: 91,
    summaryText: 'This image shows clear signs of being created by an AI image generator.',
    previousTrustScore: 31,
    simpleWhySummary: [
      'Unusual texture patterns detected along cheek and skin boundaries',
      'Abnormal pixel-level noise distribution inconsistent with camera sensors',
      'Corneal light reflections in eyes do not match background light source',
      'No verified digital camera provenance metadata found'
    ],
    trustBreakdown: {
      overallTrustScore: 23,
      trustLabel: 'LOW TRUST',
      authenticityScore: 23,
      aiGenerationRisk: 91,
      manipulationRisk: 78,
      provenanceConfidence: 15,
      metadataReliability: 35
    },
    evidenceChain: [
      {
        id: 'ev-01',
        findingNumber: '01',
        title: 'Unusual Texture Pattern',
        type: 'Texture Anomaly',
        simpleExplanation: 'Some fine image patterns look different from what is normally found in genuine camera photographs.',
        technicalExplanation: 'High-frequency residual spatial spectral analysis revealed latent diffusion grid artifacts in facial skin regions.',
        confidence: 89,
        impact: 'HIGH',
        riskContribution: 18,
        iconName: 'Sparkles'
      },
      {
        id: 'ev-02',
        findingNumber: '02',
        title: 'Noise Pattern Anomaly',
        type: 'Noise Anomaly',
        simpleExplanation: 'The image contains an unnatural, overly smooth distribution of digital noise.',
        technicalExplanation: 'Laplacian filter residual noise variance measured 0.88, indicating artificial upscaling noise suppression.',
        confidence: 84,
        impact: 'MEDIUM',
        riskContribution: 12,
        iconName: 'Activity'
      },
      {
        id: 'ev-03',
        findingNumber: '03',
        title: 'Lighting & Reflection Inconsistency',
        type: 'Lighting Inconsistency',
        simpleExplanation: 'The direction of light reflected in the eyes differs from the background sun angle.',
        technicalExplanation: 'Iris highlight vector angle deviates by 34° from ambient light vector field.',
        confidence: 76,
        impact: 'MEDIUM',
        riskContribution: 9,
        iconName: 'Sun'
      }
    ],
    suspiciousRegions: [
      {
        id: 'reg-01',
        locationName: 'Facial Skin Region',
        suspectedModification: 'Synthetic smoothing & diffusion artifact',
        confidence: 89,
        severity: 'HIGH',
        boxCoords: { x: 35, y: 22, width: 30, height: 38 }
      }
    ],
    passport: {
      passportId: 'TL-2026-000184',
      analysisDate: '08 October 2026',
      fileName: 'Portrait_Diffusion_Synthetic.jpg',
      fileType: 'JPEG (image/jpeg)',
      resolution: '1920 × 1080',
      fileSize: '2.4 MB',
      sha256: '8d9a412cf72c8901be85139a047812903728f110bc598218739198327184',
      md5: '7d92183a91b2c4d9',
      pHash: 'a89c3102f90117e3',
      classification: 'LIKELY_AI_GENERATED',
      confidence: 91,
      trustScore: 23,
      aiRisk: 91,
      manipulationRisk: 78,
      provenanceStatus: 'NOT VERIFIED'
    },
    modelInfo: {
      modelName: 'DeepGuard AI Vision Detector Engine',
      modelVersion: 'v1.2.0-Production',
      detectorType: 'Ensemble Vision Transformer + Spatial Artifact Analyzer',
      aiProbability: 91,
      inferenceTimestamp: '2026-10-08 14:32:00 UTC'
    },
    exifData: {
      'Camera Maker': 'None / Unspecified',
      'Software': 'Generative Diffusion Pipeline',
      'Creation Date': '2026-10-08'
    },
    noiseDistributionScore: 88,
    frequencyAnomalyScore: 92
  },
  {
    id: 'TL-2026-000195',
    title: 'Global_Press_Briefing_Original.jpg',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=400&q=80',
    classification: 'LIKELY_AUTHENTIC',
    confidence: 96,
    summaryText: 'This photo looks authentic and appears to be taken with a real camera.',
    simpleWhySummary: [
      'Natural camera sensor noise spectrum verified across all channels',
      'Authentic camera hardware EXIF metadata and lens parameters present',
      'Consistent environmental lighting and shadows across subjects'
    ],
    trustBreakdown: {
      overallTrustScore: 89,
      trustLabel: 'HIGH TRUST',
      authenticityScore: 89,
      aiGenerationRisk: 4,
      manipulationRisk: 8,
      provenanceConfidence: 95,
      metadataReliability: 92
    },
    evidenceChain: [
      {
        id: 'ev-11',
        findingNumber: '01',
        title: 'Sensor Noise Pattern Consistency',
        type: 'Noise Consistency',
        simpleExplanation: 'Digital noise matches standard physical camera sensors perfectly.',
        technicalExplanation: 'Bayer pattern sensor noise distribution is uniform across RGB channels.',
        confidence: 96,
        impact: 'HIGH',
        riskContribution: 0,
        iconName: 'CheckCircle'
      }
    ],
    suspiciousRegions: [],
    passport: {
      passportId: 'TL-2026-000195',
      analysisDate: '08 October 2026',
      fileName: 'Global_Press_Briefing_Original.jpg',
      fileType: 'JPEG (image/jpeg)',
      resolution: '3840 × 2160 (4K)',
      fileSize: '8.4 MB',
      sha256: '4f910a382109827c194a8721c0987123490812903728f110bc598218739198',
      md5: '3c81902a11b890a2',
      pHash: 'f0129837a1b2c4e5',
      classification: 'LIKELY_AUTHENTIC',
      confidence: 96,
      trustScore: 89,
      aiRisk: 4,
      manipulationRisk: 8,
      provenanceStatus: 'VERIFIED',
      cameraMake: 'Canon',
      cameraModel: 'EOS C500 Mark II'
    },
    modelInfo: {
      modelName: 'DeepGuard AI Vision Detector Engine',
      modelVersion: 'v1.2.0-Production',
      detectorType: 'Ensemble Vision Transformer',
      aiProbability: 4,
      inferenceTimestamp: '2026-10-08 14:40:00 UTC'
    },
    exifData: {
      'Camera Maker': 'Canon',
      'Camera Model': 'EOS C500 Mark II',
      'Lens': 'Canon EF 24-70mm f/2.8L'
    },
    noiseDistributionScore: 4,
    frequencyAnomalyScore: 5
  },
  {
    id: 'TL-2026-000210',
    title: 'Executive_Meeting_Background_Edited.png',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    classification: 'LIKELY_AI_EDITED',
    confidence: 86,
    summaryText: 'This photo appears to be real, but parts of the background were edited using AI.',
    simpleWhySummary: [
      'The subject looks genuine, but the background shows AI fill patterns',
      'Unusual sharpness boundary around subject shoulders'
    ],
    trustBreakdown: {
      overallTrustScore: 48,
      trustLabel: 'UNCERTAIN',
      authenticityScore: 55,
      aiGenerationRisk: 42,
      manipulationRisk: 86,
      provenanceConfidence: 30,
      metadataReliability: 45
    },
    evidenceChain: [
      {
        id: 'ev-21',
        findingNumber: '01',
        title: 'Background Generative Fill Artifacts',
        type: 'Regional Manipulation',
        simpleExplanation: 'The background appears generated or replaced using AI painting tools.',
        technicalExplanation: 'Error Level Analysis (ELA) shows high frequency difference in background grid.',
        confidence: 86,
        impact: 'HIGH',
        riskContribution: 16,
        iconName: 'Layers'
      }
    ],
    suspiciousRegions: [
      {
        id: 'reg-21',
        locationName: 'Background Wall & Window',
        suspectedModification: 'AI Generative Fill Replacement',
        confidence: 86,
        severity: 'HIGH',
        boxCoords: { x: 10, y: 10, width: 80, height: 35 }
      }
    ],
    passport: {
      passportId: 'TL-2026-000210',
      analysisDate: '08 October 2026',
      fileName: 'Executive_Meeting_Background_Edited.png',
      fileType: 'PNG (image/png)',
      resolution: '2560 × 1440',
      fileSize: '4.8 MB',
      sha256: '9a8120bc9182a0987123490812903728f110bc598218739198327184910a3821',
      classification: 'LIKELY_AI_EDITED',
      confidence: 86,
      trustScore: 48,
      aiRisk: 42,
      manipulationRisk: 86,
      provenanceStatus: 'TAMPERED'
    },
    modelInfo: {
      modelName: 'DeepGuard AI Vision Detector Engine',
      modelVersion: 'v1.2.0-Production',
      detectorType: 'Spatial Artifact Analyzer',
      aiProbability: 42,
      inferenceTimestamp: '2026-10-08 14:50:00 UTC'
    },
    exifData: {
      'Software': 'Adobe Photoshop AI Generative Fill'
    },
    noiseDistributionScore: 48,
    frequencyAnomalyScore: 72
  },
  {
    id: 'TL-2026-000240',
    title: 'Political_Statement_Deepfake.mp4',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=400&q=80',
    classification: 'LIKELY_AI_GENERATED',
    confidence: 94,
    summaryText: 'Deepfake video analysis identified facial reenactment warping and lip-sync temporal jitter.',
    simpleWhySummary: [
      'Facial landmark jitter detected across frames 120-210',
      'Inconsistent lighting reflections on eyes during head movements',
      'Unnatural boundary blending around facial jawline'
    ],
    trustBreakdown: {
      overallTrustScore: 18,
      trustLabel: 'VERY LOW TRUST',
      authenticityScore: 18,
      aiGenerationRisk: 94,
      manipulationRisk: 88,
      provenanceConfidence: 10,
      metadataReliability: 25
    },
    videoData: {
      duration: '00:18',
      totalFramesAnalyzed: 540,
      suspiciousFramesCount: 92,
      fps: 30,
      suspiciousTimestamps: [
        {
          id: 'v-ts-1',
          startTime: '00:04',
          endTime: '00:09',
          description: 'Facial landmark distortion & unnatural eye blinking sequence',
          confidence: 94,
          type: 'Deepfake Reenactment'
        },
        {
          id: 'v-ts-2',
          startTime: '00:12',
          endTime: '00:15',
          description: 'Lip-sync audio acoustic mismatch artifact',
          confidence: 88,
          type: 'Lip-Sync Distortion'
        }
      ]
    },
    evidenceChain: [
      {
        id: 'ev-v1',
        findingNumber: '01',
        title: 'Facial Reenactment Jitter',
        type: 'Temporal Anomaly',
        simpleExplanation: 'The face motion shows micro-stuttering incompatible with natural human movement.',
        technicalExplanation: 'Optical flow variance across facial mesh points measured > 3.4 standard deviations.',
        confidence: 94,
        impact: 'HIGH',
        riskContribution: 22,
        iconName: 'Video'
      }
    ],
    suspiciousRegions: [],
    passport: {
      passportId: 'TL-2026-000240',
      analysisDate: '08 October 2026',
      fileName: 'Political_Statement_Deepfake.mp4',
      fileType: 'MP4 (video/mp4)',
      resolution: '1920 × 1080',
      fileSize: '14.2 MB',
      sha256: '7109827c194a8721c0987123490812903728f110bc598218739198327184910a',
      classification: 'LIKELY_AI_GENERATED',
      confidence: 94,
      trustScore: 18,
      aiRisk: 94,
      manipulationRisk: 88,
      provenanceStatus: 'NOT VERIFIED'
    },
    modelInfo: {
      modelName: 'DeepGuard AI Video Transformer Engine',
      modelVersion: 'v2.1.0-Video',
      detectorType: 'Temporal Frame Sequence Transformer',
      aiProbability: 94,
      inferenceTimestamp: '2026-10-08 15:10:00 UTC'
    },
    exifData: {
      'Video Codec': 'H.264 / AVC',
      'Encoder': 'FFmpeg / Synthetic Video Synthesizer'
    },
    noiseDistributionScore: 92,
    frequencyAnomalyScore: 95
  },
  {
    id: 'TL-2026-000250',
    title: 'Executive_Voice_Clone_Sample.mp3',
    mediaType: 'audio',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    classification: 'LIKELY_AI_GENERATED',
    confidence: 92,
    summaryText: 'Synthetic voice detection identified AI neural vocoder harmonics and unnatural pitch consistency.',
    simpleWhySummary: [
      'Unnatural breath patterns and lack of vocal chord acoustic resonance',
      'Synthetic vocoder high-frequency spectral phase alignment detected',
      'Constant unnatural fundamental frequency (F0) pitch contour'
    ],
    trustBreakdown: {
      overallTrustScore: 21,
      trustLabel: 'LOW TRUST',
      authenticityScore: 21,
      aiGenerationRisk: 92,
      manipulationRisk: 75,
      provenanceConfidence: 12,
      metadataReliability: 30
    },
    audioData: {
      duration: '00:32',
      sampleRate: '44.1 kHz',
      channels: 'Mono (Speech)',
      syntheticVoiceProbability: 92,
      spectralAnomalyScore: 89,
      suspiciousSegments: [
        {
          id: 'a-ts-1',
          startTime: '00:08',
          endTime: '00:16',
          description: 'Neural voice clone vocoder artifact & flat breath spectrum',
          confidence: 92,
          type: 'Synthetic Speech Clone'
        }
      ]
    },
    evidenceChain: [
      {
        id: 'ev-a1',
        findingNumber: '01',
        title: 'Neural Vocoder Phase Harmonics',
        type: 'Acoustic Anomaly',
        simpleExplanation: 'The voice pitch pattern lacks natural human breath sounds and vocal resonance.',
        technicalExplanation: 'Mel-spectrogram residual analysis identified ElevenLabs / WaveNet vocoder signature.',
        confidence: 92,
        impact: 'HIGH',
        riskContribution: 20,
        iconName: 'Music'
      }
    ],
    suspiciousRegions: [],
    passport: {
      passportId: 'TL-2026-000250',
      analysisDate: '08 October 2026',
      fileName: 'Executive_Voice_Clone_Sample.mp3',
      fileType: 'MP3 (audio/mpeg)',
      fileSize: '3.1 MB',
      sha256: '92109827c194a8721c0987123490812903728f110bc598218739198327184910a',
      classification: 'LIKELY_AI_GENERATED',
      confidence: 92,
      trustScore: 21,
      aiRisk: 92,
      manipulationRisk: 75,
      provenanceStatus: 'NOT VERIFIED'
    },
    modelInfo: {
      modelName: 'DeepGuard AI Audio Spectrogram Engine',
      modelVersion: 'v1.8.0-Audio',
      detectorType: 'Neural Vocoder Spectrogram Analyzer',
      aiProbability: 92,
      inferenceTimestamp: '2026-10-08 15:30:00 UTC'
    },
    exifData: {
      'Audio Format': 'MPEG Audio Layer 3',
      'Bitrate': '192 kbps'
    },
    noiseDistributionScore: 90,
    frequencyAnomalyScore: 93
  }
];
