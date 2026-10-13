import React from 'react';
import type { ImagePassportData } from '../types';
import { Award, FileJson, Printer } from 'lucide-react';

interface ImagePassportProps {
  passport: ImagePassportData;
}

export const ImagePassport: React.FC<ImagePassportProps> = ({ passport }) => {
  
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(passport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${passport.passportId}_passport.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPassport = () => {
    window.print();
  };

  return (
    <div className="glass-card" style={{ padding: '32px 34px', maxWidth: '720px', margin: '0 auto' }}>
      
      {/* Passport Header */}
      <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          <Award size={30} />
          <span style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.01em' }}>DIGITAL MEDIA PASSPORT</span>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Cryptographic provenance identity and forensic verification record
        </p>
        <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '6px' }}>
          PASSPORT ID: {passport.passportId} • AUDIT DATE: {passport.analysisDate}
        </div>
      </div>

      {/* Passport Status Badges Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '26px',
        textAlign: 'center'
      }}>
        <div className="neu-inset" style={{ padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">OVERALL TRUST</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: passport.trustScore <= 40 ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
            {passport.trustScore <= 40 ? 'LOW TRUST' : 'HIGH TRUST'}
          </div>
        </div>

        <div className="neu-inset" style={{ padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">AI RISK</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: passport.aiRisk > 50 ? '#b91c1c' : 'var(--text-primary)', marginTop: '2px' }}>
            {passport.aiRisk}% RISK
          </div>
        </div>

        <div className="neu-inset" style={{ padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">PROVENANCE</div>
          <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            {passport.provenanceStatus}
          </div>
        </div>
      </div>

      {/* Main Details & QR Code Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '24px', marginBottom: '26px', alignItems: 'center' }}>
        
        {/* Technical Specification Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>File Name:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{passport.fileName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>File Type:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">{passport.fileType}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Resolution & Size:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">{passport.resolution} ({passport.fileSize})</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>SHA-256 Hash:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.74rem' }} className="font-mono">
              {passport.sha256.substring(0, 16)}...
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-neutral)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Classification:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{passport.classification.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* QR Code Graphic Box */}
        <div className="neu-inset" style={{
          borderRadius: '14px',
          padding: '14px',
          textAlign: 'center'
        }}>
          {/* SVG QR Code Simulation Graphic */}
          <svg width="105" height="105" viewBox="0 0 100 100" fill="none" style={{ margin: '0 auto', display: 'block' }}>
            <rect width="100" height="100" fill="#ffffff" rx="6" />
            <rect x="8" y="8" width="28" height="28" fill="#171717" rx="3" />
            <rect x="13" y="13" width="18" height="18" fill="#ffffff" rx="2" />
            <rect x="17" y="17" width="10" height="10" fill="#171717" rx="1" />

            <rect x="64" y="8" width="28" height="28" fill="#171717" rx="3" />
            <rect x="69" y="13" width="18" height="18" fill="#ffffff" rx="2" />
            <rect x="73" y="17" width="10" height="10" fill="#171717" rx="1" />

            <rect x="8" y="64" width="28" height="28" fill="#171717" rx="3" />
            <rect x="13" y="69" width="18" height="18" fill="#ffffff" rx="2" />
            <rect x="17" y="73" width="10" height="10" fill="#171717" rx="1" />

            <rect x="44" y="44" width="12" height="12" fill="#171717" rx="1" />
            <rect x="64" y="64" width="16" height="16" fill="#171717" rx="2" />
            <rect x="78" y="44" width="14" height="12" fill="#171717" rx="1" />
          </svg>

          <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '8px' }} className="font-mono">
            VERIFY PASSPORT
          </div>
        </div>

      </div>

      {/* Export Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border-neutral)', paddingTop: '20px', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadJson} className="btn-outline" style={{ fontSize: '0.82rem', padding: '10px 16px' }}>
          <FileJson size={16} /> Export JSON Passport
        </button>

        <button onClick={handlePrintPassport} className="btn-primary" style={{ fontSize: '0.82rem', padding: '10px 18px' }}>
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

    </div>
  );
};
