import React, { useState } from 'react';
import type { EvidenceItem } from '../types';
import { 
  ShieldAlert, Sparkles, Activity, Sun, FileText, CheckCircle2, 
  FileCheck, Layers, ChevronDown, ChevronUp, Info 
} from 'lucide-react';

interface EvidenceChainProps {
  evidenceChain: EvidenceItem[];
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ evidenceChain }) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles size={18} color="var(--text-primary)" />;
      case 'Activity': return <Activity size={18} color="var(--text-primary)" />;
      case 'Sun': return <Sun size={18} color="var(--text-primary)" />;
      case 'CheckCircle': return <CheckCircle2 size={18} color="var(--text-primary)" />;
      case 'FileCheck': return <FileCheck size={18} color="var(--text-primary)" />;
      case 'Layers': return <Layers size={18} color="var(--text-primary)" />;
      default: return <FileText size={18} color="var(--text-primary)" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'HIGH': return <span className="badge badge-fake">HIGH IMPACT</span>;
      case 'MEDIUM': return <span className="badge">MEDIUM IMPACT</span>;
      case 'LOW': return <span className="badge badge-real">MINOR IMPACT</span>;
      default: return <span className="badge">INFORMATIONAL</span>;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '28px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={22} color="var(--text-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Forensic Evidence Chain ({evidenceChain.length} Findings)
            </h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Key forensic signals and integrity checks discovered during automated inspection.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {evidenceChain.map((item) => {
          const isExpanded = !!expandedIds[item.id];
          return (
            <div
              key={item.id}
              className="neu-raised-sm"
              style={{
                padding: '18px 20px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Evidence Top Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Finding Number Badge */}
                  <div className="font-mono neu-inset" style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)'
                  }}>
                    #{item.findingNumber}
                  </div>

                  {getIcon(item.iconName)}

                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }} className="font-mono">
                      Type: {item.type}
                    </span>
                  </div>
                </div>

                {/* Evidence Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getImpactBadge(item.impact)}

                  <div className="font-mono" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.confidence}% Match
                  </div>

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="btn-outline"
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide Technical' : 'Technical Details'}
                  </button>
                </div>

              </div>

              {/* Simple Explanation */}
              <div className="neu-inset" style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.04em' }} className="font-mono">
                  Analysis finding:
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {item.simpleExplanation}
                </p>
              </div>

              {/* Expanded Technical Explanation */}
              {isExpanded && (
                <div style={{ marginTop: '10px', background: 'var(--card-bg)', border: '1px solid var(--border-neutral)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="font-mono">
                    <Info size={14} /> Technical verification details:
                  </div>
                  <p className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.technicalExplanation}
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
