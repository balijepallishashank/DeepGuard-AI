import React from 'react';
import type { AudioAnalysisData } from '../types';
import { Music, CheckCircle2, Mic } from 'lucide-react';

interface AudioAnalysisViewProps {
  audioData: AudioAnalysisData;
}

export const AudioAnalysisView: React.FC<AudioAnalysisViewProps> = ({ audioData }) => {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Music size={22} color="var(--primary-cyan)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Audio & Synthetic Voice Analysis</h2>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Voice clone & synthetic speech analysis inspecting spectral harmonics, pitch variance, and neural vocoder artifacts.
      </p>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DURATION</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800 }}>{audioData.duration}</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VOICE CLONE RISK</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: audioData.syntheticVoiceProbability > 50 ? 'var(--accent-neon-red)' : 'var(--accent-neon-green)' }}>
            {audioData.syntheticVoiceProbability}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SPECTRAL ANOMALY</div>
          <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-cyan)' }}>
            {audioData.spectralAnomalyScore}/100
          </div>
        </div>
      </div>

      {/* Suspicious Audio Segments */}
      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Mic size={16} color="var(--primary-cyan)" /> Flagged Audio Segments ({audioData.suspiciousSegments.length})
      </h3>

      {audioData.suspiciousSegments.length === 0 ? (
        <div style={{ padding: '16px', background: 'var(--accent-neon-green-light)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', textAlign: 'center' }}>
          <CheckCircle2 size={20} color="var(--accent-neon-green)" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-neon-green)' }}>No Suspicious Synthetic Segments Detected</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Acoustic features fell below the synthesis threshold. (Caveat: Absence of artifacts is not proof of authentic human speech).</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {audioData.suspiciousSegments.map((seg) => (
            <div
              key={seg.id}
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
                  {seg.startTime} - {seg.endTime}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{seg.type}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{seg.description}</div>
                </div>
              </div>

              <div className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-neon-red)' }}>
                {seg.confidence}% Match
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
