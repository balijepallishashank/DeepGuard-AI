import type { AnalysisRecord } from '../types';
import { SAMPLE_ANALYSES } from '../data/sampleAnalyses';

const STORAGE_KEY = 'deepfake_ai_history_v1';

/**
 * Load persisted analysis records from localStorage.
 * Falls back to SAMPLE_ANALYSES if storage is empty or corrupted.
 */
export function loadStoredHistory(): AnalysisRecord[] {
  if (typeof window === 'undefined') return SAMPLE_ANALYSES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_ANALYSES;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load history from localStorage, falling back to sample data.', err);
  }

  return SAMPLE_ANALYSES;
}

/**
 * Save analysis records to localStorage with quota protection.
 */
export function saveStoredHistory(records: AnalysisRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep up to 50 most recent records to prevent localStorage overflow
    const trimmed = records.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('LocalStorage quota exceeded or unavailable while saving history.', err);
  }
}

/**
 * Clear persisted history and restore baseline sample records.
 */
export function clearStoredHistory(): AnalysisRecord[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
  }
  return SAMPLE_ANALYSES;
}
