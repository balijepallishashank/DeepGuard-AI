import React, { useState } from 'react';
import type { AnalysisRecord } from '../types';
import { History as HistoryIcon, Search, Trash2, ExternalLink, ShieldCheck, Video, Music, Image as ImageIcon, Cloud, CloudUpload, RefreshCw } from 'lucide-react';
import { getCategoryBadgeDetails } from '../utils/forensicsEngine';

interface HistoryViewProps {
  historyRecords: AnalysisRecord[];
  onSelectRecord: (record: AnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory?: () => void;
  onSyncToCloud?: () => Promise<void>;
  isSyncing?: boolean;
  syncNotice?: string | null;
  isCloudConnected?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyRecords,
  onSelectRecord,
  onDeleteRecord,
  onClearHistory,
  onSyncToCloud,
  isSyncing = false,
  syncNotice = null,
  isCloudConnected = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const filtered = historyRecords.filter((rec) => {
    const matchesSearch = rec.title.toLowerCase().includes(searchTerm.toLowerCase()) || rec.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || rec.classification === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Raised Card */}
      <div className="glass-card" style={{ padding: '28px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HistoryIcon size={22} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Analysis History ({historyRecords.length})
              </h2>
              {isCloudConnected ? (
                <span className="badge font-mono" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                  <Cloud size={12} /> CLOUD RLS
                </span>
              ) : (
                <span className="badge font-mono neu-inset" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cloud size={12} /> LOCAL MODE (CLOUD RLS READY)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isCloudConnected 
                ? 'Secured in Supabase PostgreSQL with user-specific Row Level Security.'
                : 'Saved forensic investigations and verification reports. Ready for Supabase Cloud RLS sync.'}
            </p>
          </div>

          {/* Search Input & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '260px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search history by name or ID..."
                className="neu-input"
                style={{ paddingLeft: '44px', fontSize: '0.86rem' }}
              />
            </div>

            {onSyncToCloud && (
              <button
                id="sync-to-cloud-btn"
                onClick={onSyncToCloud}
                disabled={isSyncing}
                className="btn-outline"
                style={{ fontSize: '0.8rem', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title={isCloudConnected ? "Migrate uncommitted local records to your cloud history" : "Cloud RLS sync available with Supabase account"}
              >
                {isSyncing ? <RefreshCw size={14} className="spin" /> : <CloudUpload size={14} />}
                {isSyncing ? 'Syncing...' : 'Sync Local History to Cloud'}
              </button>
            )}

            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="btn-outline"
                style={{ fontSize: '0.8rem', padding: '10px 14px' }}
                title="Reset history to default samples"
              >
                Reset Default Samples
              </button>
            )}
          </div>
        </div>

        {/* Sync Toast Notice */}
        {syncNotice && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Cloud size={14} />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Filter Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
          {['ALL', 'LIKELY_AI_GENERATED', 'LIKELY_AUTHENTIC', 'LIKELY_AI_EDITED', 'UNCERTAIN'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={filterCategory === cat ? 'btn-primary' : 'btn-outline'}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem'
              }}
            >
              {cat === 'ALL' ? 'All Files' : cat.replace('LIKELY_', '').replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '44px 24px', textAlign: 'center' }}>
          <ShieldCheck size={38} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>No Analysis Records Found</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {searchTerm ? 'No history entries match your search filter.' : 'Upload your first file to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((rec) => {
            const badge = getCategoryBadgeDetails(rec.classification);
            return (
              <div
                key={rec.id}
                className="neu-raised-sm"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {rec.mediaType === 'video' ? (
                    <div className="neu-inset" style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Video size={22} />
                    </div>
                  ) : rec.mediaType === 'audio' ? (
                    <div className="neu-inset" style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={22} />
                    </div>
                  ) : (
                    <div className="neu-inset" style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img
                        src={rec.thumbnailUrl}
                        alt={rec.title}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <ImageIcon size={22} color="var(--text-muted)" style={{ display: 'none' }} />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {rec.title}
                      </h4>
                      {rec.id.startsWith('TL-') && (
                        <span className="badge font-mono" style={{ fontSize: '0.65rem', background: 'var(--surface-muted, #f3f4f6)', color: 'var(--text-muted, #4b5563)' }}>
                          DEMO SAMPLE
                        </span>
                      )}
                      <span className="badge font-mono" style={{ fontSize: '0.68rem' }}>
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', gap: '14px', marginTop: '4px' }} className="font-mono">
                      <span>ID: {rec.id}</span>
                      <span>Date: {rec.passport.analysisDate}</span>
                      <span>Type: {rec.mediaType.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                      {rec.confidence}% Match
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Trust Score: {rec.trustBreakdown.overallTrustScore}/100
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectRecord(rec)}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    Open <ExternalLink size={14} />
                  </button>

                  <button
                    onClick={() => onDeleteRecord(rec.id)}
                    className="btn-outline"
                    style={{ padding: '8px 12px', color: '#991b1b' }}
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
