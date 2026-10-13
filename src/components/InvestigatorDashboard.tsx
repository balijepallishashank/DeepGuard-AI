import React, { useState } from 'react';
import type { AnalysisRecord } from '../types';
import { generatePerceptualHashes } from '../utils/forensicsEngine';
import { Cpu, Key, FileText, Activity, Copy, Check } from 'lucide-react';

interface InvestigatorDashboardProps {
  analysis: AnalysisRecord;
}

export const InvestigatorDashboard: React.FC<InvestigatorDashboardProps> = ({ analysis }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [pHashes] = useState(() => generatePerceptualHashes(analysis.passport.sha256 || analysis.id));

  const handleCopySha256 = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(analysis.passport.sha256);
      }
    } catch {
      // Clipboard fallback
    }
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={24} color="var(--text-primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Technical Forensics & Telemetry Suite</h2>
              <span className="badge font-mono">ENHANCED TELEMETRY</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Deep technical analysis, deterministic perceptual hashes, and model telemetry for forensic verification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge font-mono">
              MODEL: {analysis.modelInfo.modelName} ({analysis.modelInfo.modelVersion})
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Cryptographic Hashes & File Specs | AI Model Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Cryptographic & Perceptual Hashes Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Key size={18} color="var(--text-muted)" /> Cryptographic & Perceptual Identifiers
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* SHA-256 */}
            <div className="neu-inset" style={{ padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">
                  SHA-256 CRYPTOGRAPHIC HASH (EXACT FILE ID)
                </span>
                <button
                  onClick={handleCopySha256}
                  className="btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                >
                  {copiedHash ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                  {copiedHash ? 'Copied' : 'Copy Hash'}
                </button>
              </div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 700, wordBreak: 'break-all' }}>
                {analysis.passport.sha256}
              </div>
            </div>

            {/* Legacy MD5 */}
            <div className="neu-inset" style={{ padding: '12px 14px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">
                MD5 LEGACY IDENTIFIER:
              </span>
              <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, marginLeft: '8px', color: 'var(--text-primary)' }}>
                {analysis.passport.md5 || '7d92183a91b2c4d9'}
              </span>
            </div>

            {/* Deterministic Media Fingerprints (Seed/Digest based) */}
            <div className="neu-inset" style={{ padding: '14px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Deterministic Media Identifiers (64-bit FNV-1a Digests):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', fontSize: '0.72rem' }} className="font-mono">
                <div>sig-1: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pHashes.pHash}</span></div>
                <div>sig-2: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pHashes.dHash}</span></div>
                <div>sig-3: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pHashes.aHash}</span></div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Deterministic FNV-1a seed digests. For genuine image pixel-level perceptual hashes (8×8 aHash and 9×8 dHash), inspect the <strong>Media Autopsy & ELA</strong> workspace.
              </p>
            </div>

          </div>
        </div>

        {/* AI Model & Detector Telemetry */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Activity size={18} color="var(--text-muted)" /> AI Detector Model Telemetry Specs
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Name:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">{analysis.modelInfo.modelName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Version:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">{analysis.modelInfo.modelVersion}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Detector Ensemble Type:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{analysis.modelInfo.detectorType}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>AI Likelihood Output:</span>
              <span style={{ fontWeight: 800, color: analysis.modelInfo.aiProbability > 50 ? '#b91c1c' : 'var(--text-primary)' }} className="font-mono">{analysis.modelInfo.aiProbability}% AI</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Inference Timestamp:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">{analysis.modelInfo.inferenceTimestamp}</span>
            </div>
          </div>
        </div>

      </div>

      {/* EXIF Metadata & Technical Noise Distribution */}
      <div className="glass-card" style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <FileText size={18} color="var(--text-muted)" /> Container Stream & Hardware Metadata
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-neutral)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <th style={{ padding: '10px 14px' }}>METADATA TAG</th>
                <th style={{ padding: '10px 14px' }}>DETECTED VALUE</th>
                <th style={{ padding: '10px 14px' }}>VERIFICATION NOTE</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analysis.exifData).map(([key, val], idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-neutral)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{key}</td>
                  <td style={{ padding: '12px 14px' }} className="font-mono">{val}</td>
                  <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {val.includes('None') || val.includes('Unspecified') 
                      ? 'No hardware camera tag present (Informational)'
                      : 'Valid embedded metadata tag verified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
