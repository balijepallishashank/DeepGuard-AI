import React from 'react';
import { Eye, ShieldCheck, Sparkles, Layers, Award, Cpu } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Banner (Raised Card) */}
      <div className="glass-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-raised-small)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--text-primary)'
        }}>
          <Eye size={28} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          About DeepGuard AI
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
          "Detect. Verify. Trust."
        </p>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '14px auto 0', lineHeight: 1.6 }}>
          DeepGuard AI is an advanced digital media authenticity and forensic analysis platform built to empower journalists, legal investigators, cybersecurity analysts, and everyday users to verify whether media is authentic, AI-generated, or edited.
        </p>
      </div>

      {/* HOW IT WORKS SECTION */}
      <div id="how-it-works" className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Cpu size={22} color="var(--text-primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            How It Works
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="neu-raised-sm" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>STEP 01</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Ingest & Validate</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Upload any image, video, or audio file. The engine validates container format, computes SHA-256 digests, and parses hardware EXIF tags.
            </p>
          </div>

          <div className="neu-raised-sm" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>STEP 02</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Multi-Modal Forensic Audit</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Executes Vision Transformers, Bayer sensor noise residual checks, temporal frame consistency sweeps, and acoustic spectrogram models.
            </p>
          </div>

          <div className="neu-raised-sm" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>STEP 03</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Evidence & Dossier</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Produces transparent why scores, highlights suspected anomaly regions on interactive heatmaps, and outputs exportable PDF dossiers.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Pillars Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        
        <div className="glass-card" style={{ padding: '26px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Sparkles size={20} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Vision Transformer AI</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Combines state-of-the-art vision transformer neural models trained on authentic and synthetic diffusion images to identify subtle generative artifacts.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '26px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldCheck size={20} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Spatial & Noise Forensics</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Inspects camera sensor Bayer noise distribution, Laplacian frequency residuals, optical lighting reflection vectors, and EXIF camera hardware signatures.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '26px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Award size={20} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Transparent Evidence</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Never returns black-box answers. Every verdict is backed by plain-English explanations, technical expert details, and visual heatmap region localization.
          </p>
        </div>

      </div>

      {/* Ethics & Limitations Disclaimer Card */}
      <div className="glass-card" style={{ padding: '26px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} /> Detection Transparency & Ethical Limitations
        </h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          AI media detection is a rapidly evolving field. While DeepGuard AI achieves high accuracy across standard media formats, high compression (such as social media re-uploads) or missing camera EXIF data can affect confidence scores. Detection verdicts are probabilistic assessments to assist human investigators, not absolute legal guarantees.
        </p>
      </div>

    </div>
  );
};
