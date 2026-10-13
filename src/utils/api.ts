/**
 * DeepGuard AI — Centralized Forensic API Service
 * Manages communication between React frontend and FastAPI Python backend.
 */

export const API_BASE_URL: string = 
  ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) 
    ? String(import.meta.env.VITE_API_BASE_URL) 
    : 'http://127.0.0.1:8000').replace(/\/+$/, '');

export interface ApiFetchResult<T = unknown> {
  data: T | null;
  isOffline: boolean;
  error?: string;
}

export interface ApiPredictionClassScore {
  label: string;
  raw_logit: number;
  probability: number;
  percentage: number;
}

export interface ApiModelInformation {
  model_id: string;
  architecture: string;
  base_backbone: string;
  num_parameters: number;
  license: string;
  active_engine?: string;
  fallback_used?: boolean;
}

export interface ApiHealthResponse {
  status: string;
  api_version: string;
  model_ready: boolean;
  model_name: string;
  audio_model_ready?: boolean;
  audio_model_name?: string;
  device: string;
  gpu_name?: string | null;
  details?: Record<string, unknown>;
}

export interface ApiImageAnalysisResponse {
  success: boolean;
  filename: string;
  sha256: string;
  file_size_bytes: number;
  image_dimensions: string;
  device_used: string;
  inference_time_ms: number;
  predicted_label: string;
  predicted_class_id: number;
  confidence_score: number;
  verdict_status: string;
  scores: ApiPredictionClassScore[];
  model_info: ApiModelInformation;
  forensic_caveat: string;
}

export interface ApiFrameAnalysisResult {
  frame_index: number;
  timestamp_sec: number;
  timestamp_str: string;
  predicted_label: string;
  predicted_class_id: number;
  confidence_score: number;
  scores: ApiPredictionClassScore[];
}

export interface ApiVideoAnalysisResponse {
  success: boolean;
  filename: string;
  sha256: string;
  file_size_bytes: number;
  duration_seconds: number;
  fps: number;
  total_frames_in_video: number;
  sampled_frames_count: number;
  video_classification: string;
  overall_confidence: number;
  fake_probability_percentage: number;
  suspicious_frames_count: number;
  device_used: string;
  inference_time_ms: number;
  analysis_type?: string;
  methodology_disclaimer?: string;
  frame_results: ApiFrameAnalysisResult[];
  model_info: ApiModelInformation;
  forensic_caveat: string;
}

export interface ApiAudioSegmentResult {
  segment_index: number;
  start_time_sec: number;
  end_time_sec: number;
  timestamp_str: string;
  predicted_label: string;
  confidence_score: number;
  fake_probability_percentage: number;
  scores: ApiPredictionClassScore[];
}

export interface ApiAudioAnalysisResponse {
  success: boolean;
  filename: string;
  sha256: string;
  file_size_bytes: number;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  device_used: string;
  inference_time_ms: number;
  predicted_label: string;
  predicted_class_id: number;
  confidence_score: number;
  fake_probability_percentage: number;
  spectral_anomaly_score: number;
  acoustic_index_label?: string;
  authenticity_caveat?: string;
  scores: ApiPredictionClassScore[];
  segments: ApiAudioSegmentResult[];
  model_info: ApiModelInformation;
  forensic_caveat: string;
}

/**
 * Reusable multipart POST handler for media inference requests.
 */
async function uploadMediaApi<T>(
  endpoint: string, 
  file: File, 
  mediaLabel: string,
  token?: string | null
): Promise<ApiFetchResult<T>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (response.ok) {
      const data = (await response.json()) as T;
      return { data, isOffline: false };
    }

    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const message = errData.detail || 'Authentication required or session expired. Please sign in again.';
      return { data: null, isOffline: false, error: message };
    }
    if (response.status === 403) {
      const message = errData.detail || 'Access forbidden: You do not have permission to execute this analysis.';
      return { data: null, isOffline: false, error: message };
    }

    const message = errData.detail || `${mediaLabel} analysis rejected (HTTP ${response.status})`;
    return { data: null, isOffline: false, error: message };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error reaching backend';
    return { data: null, isOffline: true, error: errorMsg };
  }
}

/**
 * Checks backend health and model readiness telemetry.
 */
export async function checkApiHealth(): Promise<ApiFetchResult<ApiHealthResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = (await response.json()) as ApiHealthResponse;
      return { data, isOffline: false };
    }
    return { data: null, isOffline: false, error: `Health check returned HTTP ${response.status}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Backend server offline';
    return { data: null, isOffline: true, error: errorMsg };
  }
}

/**
 * Executes image deepfake detection via FastAPI.
 */
export async function analyzeImageApi(file: File, token?: string | null): Promise<ApiFetchResult<ApiImageAnalysisResponse>> {
  return uploadMediaApi<ApiImageAnalysisResponse>('/api/v1/analyze/image', file, 'Image', token);
}

/**
 * Executes frame-sampled video deepfake detection via FastAPI.
 */
export async function analyzeVideoApi(file: File, token?: string | null): Promise<ApiFetchResult<ApiVideoAnalysisResponse>> {
  return uploadMediaApi<ApiVideoAnalysisResponse>('/api/v1/analyze/video', file, 'Video', token);
}

/**
 * Executes neural audio deepfake detection via FastAPI.
 */
export async function analyzeAudioApi(file: File, token?: string | null): Promise<ApiFetchResult<ApiAudioAnalysisResponse>> {
  return uploadMediaApi<ApiAudioAnalysisResponse>('/api/v1/analyze/audio', file, 'Audio', token);
}
