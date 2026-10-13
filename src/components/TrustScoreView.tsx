import React from 'react';
import type { TrustScoreBreakdown } from '../types';
import { SpeedometerDial } from './SpeedometerDial';
import { ShieldCheck, Info, History } from 'lucide-react';

interface TrustScoreViewProps {
  breakdown: TrustScoreBreakdown;
  previousScore?: number;
  whySummary: string[];
}

export const TrustScoreView: React.FC<TrustScoreViewProps> = ({
  breakdown,
  previousScore,
  whySummary
}) => {
  const getTrustBadgeClass = (score: number) => {
    if (score <= 40) return 'badge-fake';
    if (score <= 60) return 'badge-info';
    return 'badge-real';
  };

  return (
    <div className="glass-card" style={{ padding: '28px 30px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="var(--text-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Trust Rating Breakdown</h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Weighted multi-factor score evaluating authenticity, manipulation markers, and provenance integrity.
          </p>
        </div>

        {/* Previous Score History Indicator */}
        {previousScore !== undefined && (
          <div className="badge font-mono" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <History size={14} /> PREVIOUS: {previousScore}/100 ➔ NOW: {breakdown.overallTrustScore}/100
          </div>
        )}
      </div>

      {/* Grid: Speedometer Gauge Dial | Trust Score Breakdown Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', alignItems: 'center' }}>
        
        {/* Speedometer Gauge Dial */}
        <div className="neu-inset" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', borderRadius: '16px' }}>
          <SpeedometerDial score={breakdown.overallTrustScore} isFake={breakdown.overallTrustScore <= 50} />
          
          <div style={{ marginTop: '12px' }}>
            <span className={`badge ${getTrustBadgeClass(breakdown.overallTrustScore)} font-mono`}>
              {breakdown.trustLabel}
            </span>
          </div>
        </div>

        {/* Trust Score Category Breakdown Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Authenticity Score */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-primary)' }}>Media Authenticity</span>
              <span className="font-mono" style={{ color: '#15803d' }}>{breakdown.authenticityScore}/100</span>
            </div>
            <div className="neu-inset" style={{ width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${breakdown.authenticityScore}%`, height: '100%', background: '#15803d', borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* AI Generation Risk */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-primary)' }}>AI Synthesis Risk</span>
              <span className="font-mono" style={{ color: breakdown.aiGenerationRisk > 50 ? '#b91c1c' : 'var(--text-secondary)' }}>{breakdown.aiGenerationRisk}/100</span>
            </div>
            <div className="neu-inset" style={{ width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${breakdown.aiGenerationRisk}%`, height: '100%', background: breakdown.aiGenerationRisk > 50 ? '#b91c1c' : '#737373', borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* Manipulation Risk */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-primary)' }}>Tampering & Modification Risk</span>
              <span className="font-mono" style={{ color: breakdown.manipulationRisk > 50 ? '#b91c1c' : 'var(--text-secondary)' }}>{breakdown.manipulationRisk}/100</span>
            </div>
            <div className="neu-inset" style={{ width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${breakdown.manipulationRisk}%`, height: '100%', background: breakdown.manipulationRisk > 50 ? '#b91c1c' : '#737373', borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* Provenance Confidence */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-primary)' }}>Hardware & Provenance Confidence</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{breakdown.provenanceConfidence}/100</span>
            </div>
            <div className="neu-inset" style={{ width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${breakdown.provenanceConfidence}%`, height: '100%', background: 'var(--text-primary)', borderRadius: '4px' }}></div>
            </div>
          </div>

        </div>

      </div>

      {/* Summary box */}
      <div className="neu-inset" style={{ marginTop: '22px', padding: '18px 22px', borderRadius: '12px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="var(--text-muted)" /> Key Factors Influencing this Rating:
        </h4>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {whySummary.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

    </div>
  );
};
