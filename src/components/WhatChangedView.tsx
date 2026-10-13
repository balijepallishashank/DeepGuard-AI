import React, { useState } from 'react';
import type { SuspiciousRegion } from '../types';
import { ImageCompareSlider } from './ImageCompareSlider';
import { Eye, Sliders, Layers, Search } from 'lucide-react';

interface WhatChangedViewProps {
  mediaUrl: string;
  isFake: boolean;
  regions: SuspiciousRegion[];
}

export const WhatChangedView: React.FC<WhatChangedViewProps> = ({ mediaUrl, isFake, regions }) => {
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [opacity, setOpacity] = useState(75);

  return (
    <div className="glass-card" style={{ padding: '28px 30px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="var(--text-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Visual Inspector & Highlighted Edits</h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Drag the comparison slider on the media preview to inspect forensic overlay and detection zones.
          </p>
        </div>

        {/* Controls: Highlight Toggle & Opacity Slider */}
        <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 16px', borderRadius: '12px' }}>
          <button
            onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            className="btn-outline"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <Eye size={14} /> {heatmapEnabled ? 'Highlights ON' : 'Highlights OFF'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
            <Sliders size={14} color="var(--text-muted)" />
            <span>Opacity:</span>
            <input
              type="range"
              min="10"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              style={{ width: '80px', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
            />
            <span className="font-mono" style={{ fontWeight: 700 }}>{opacity}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Slider Compare & Suspicious Region Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Interactive Image Slider */}
        <div>
          <ImageCompareSlider originalUrl={mediaUrl} isFake={isFake && heatmapEnabled} opacity={opacity} />
        </div>

        {/* Suspicious Region Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} color="var(--accent-neon-red)" /> Highlighted Edit Areas ({regions.length})
          </h3>

          {regions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--accent-neon-green-light)', border: '1px solid rgba(0,200,83,0.3)', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-neon-green)' }}>No Modified Areas Detected</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                All parts of this image look consistent and natural.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {regions.map((reg, idx) => (
                <div
                  key={reg.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-fake font-mono" style={{ fontSize: '0.65rem' }}>
                      REGION #{idx + 1} • {reg.severity} SEVERITY
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-neon-red)', fontWeight: 700 }}>
                      {reg.confidence}% Confidence
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
                    Location: {reg.locationName}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Suspected: {reg.suspectedModification}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
