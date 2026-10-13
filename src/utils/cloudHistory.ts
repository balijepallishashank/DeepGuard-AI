import { supabase, isSupabaseConfigured } from './supabase';
import type { AnalysisRecord } from '../types';

/**
 * DeepGuard AI — Cloud Analysis History Manager
 * 
 * Interacts with the public.analysis_history PostgreSQL table via Supabase client.
 * Enforces Row Level Security (RLS) scoped strictly to auth.uid().
 */

export interface CloudHistoryRow {
  id: string;
  user_id: string;
  media_type: string;
  title: string;
  classification: string;
  confidence: number;
  trust_score: number;
  sha256: string;
  summary_text: string | null;
  record_data: AnalysisRecord;
  created_at: string;
}

/**
 * Fetches the authenticated user's analysis history from Supabase with RLS.
 */
export async function fetchUserCloudHistory(): Promise<{ data: AnalysisRecord[] | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Error fetching cloud history from Supabase:', error.message);
      return { data: null, error: error.message };
    }

    if (!data) return { data: [] };

    // Unpack jsonb record_data ensuring typed AnalysisRecord
    const records: AnalysisRecord[] = (data as CloudHistoryRow[]).map(row => {
      const rec = row.record_data;
      return {
        ...rec,
        id: row.id,
        title: row.title,
        classification: row.classification as AnalysisRecord['classification'],
        confidence: row.confidence
      };
    });

    return { data: records };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query cloud history.';
    return { data: null, error: msg };
  }
}

/**
 * Saves a completed analysis record to Supabase under the user's RLS policy.
 */
export async function saveRecordToCloud(
  record: AnalysisRecord,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  // Guard: Never save static demo or preset sample cases to cloud storage
  if (record.id.startsWith('TL-')) {
    return { success: true };
  }

  try {
    const sha256 = record.passport?.sha256 || 'unknown-hash';

    // Prepare clean serializable record payload without circular references
    const payload: Partial<CloudHistoryRow> = {
      id: record.id,
      user_id: userId,
      media_type: record.mediaType,
      title: record.title,
      classification: record.classification,
      confidence: record.confidence,
      trust_score: record.trustBreakdown?.overallTrustScore ?? 50,
      sha256: sha256,
      summary_text: record.summaryText || null,
      record_data: record
    };

    const { error } = await supabase
      .from('analysis_history')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Failed to save record to cloud:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to persist record to cloud.';
    return { success: false, error: msg };
  }
}

/**
 * Deletes a single analysis record from the user's cloud history.
 */
export async function deleteCloudRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', recordId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete cloud record.';
    return { success: false, error: msg };
  }
}

/**
 * Migrates local records to Supabase cloud history.
 * - Skips static demo case studies (TL-...)
 * - Avoids duplicate records based on ID or SHA-256
 * - Associates records exclusively with the verified user's identity
 */
export async function syncLocalHistoryToCloud(
  localRecords: AnalysisRecord[],
  userId: string
): Promise<{ importedCount: number; skippedCount: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { importedCount: 0, skippedCount: 0, error: 'Supabase is not configured.' };
  }

  try {
    // 1. Fetch existing cloud IDs for deduplication
    const { data: existing, error: fetchErr } = await supabase
      .from('analysis_history')
      .select('id, sha256');

    if (fetchErr) {
      return { importedCount: 0, skippedCount: 0, error: fetchErr.message };
    }

    const existingIds = new Set<string>((existing || []).map(r => r.id));
    const existingHashes = new Set<string>((existing || []).map(r => r.sha256).filter(Boolean));

    let importedCount = 0;
    let skippedCount = 0;

    for (const rec of localRecords) {
      // Skip demo cases
      if (rec.id.startsWith('TL-')) {
        skippedCount++;
        continue;
      }

      const recHash = rec.passport?.sha256;
      // Skip already uploaded records
      if (existingIds.has(rec.id) || (recHash && existingHashes.has(recHash))) {
        skippedCount++;
        continue;
      }

      const saveRes = await saveRecordToCloud(rec, userId);
      if (saveRes.success) {
        importedCount++;
        existingIds.add(rec.id);
        if (recHash) existingHashes.add(recHash);
      } else {
        skippedCount++;
      }
    }

    return { importedCount, skippedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error syncing local history to cloud.';
    return { importedCount: 0, skippedCount: 0, error: msg };
  }
}
