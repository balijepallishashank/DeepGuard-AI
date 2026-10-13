import React from 'react';
import type { VideoAnalysisData } from '../types';
import { Video, Clock, CheckCircle2 } from 'lucide-react';

interface VideoAnalysisViewProps {
  videoData: VideoAnalysisData;
}

export const VideoAnalysisView: React.FC<VideoAnalysisViewProps> = ({ videoData }) => {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Video size={22} color="var(--primary-cyan)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Video Timeline & Frame Analysis</h2>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Frame-sampled spatial deepfake analysis inspecting representative keyframe visual artifacts and synthesis patterns (Exploratory keyframe check).
      </p>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DURATION</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800 }}>{videoData.duration}</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FRAMES ANALYZED</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800 }}>{videoData.totalFramesAnalyzed} ({videoData.fps} fps)</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FLAGGED FRAMES</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: videoData.suspiciousFramesCount > 0 ? 'var(--accent-neon-red)' : 'var(--accent-neon-green)' }}>
            {videoData.suspiciousFramesCount}
          </div>
        </div>
      </div>

      {/* Flagged Timestamps Timeline */}
      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={16} color="var(--primary-cyan)" /> Suspicious Video Segments ({videoData.suspiciousTimestamps.length})
      </h3>

      {videoData.suspiciousTimestamps.length === 0 ? (
        <div style={{ padding: '16px', background: 'var(--accent-neon-green-light)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', textAlign: 'center' }}>
          <CheckCircle2 size={20} color="var(--accent-neon-green)" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-neon-green)' }}>Clean Video Timeline</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>No synthetic spatial artifacts or deepfake frame distortions were detected across sampled keyframes.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {videoData.suspiciousTimestamps.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="badge badge-fake font-mono" style={{ fontSize: '0.72rem' }}>
                  {item.startTime} - {item.endTime}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.type}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</div>
                </div>
              </div>

              <div className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-neon-red)' }}>
                {item.confidence}% Risk
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
