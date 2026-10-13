import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, FileText, ShieldCheck, Download, Layers } from 'lucide-react';

export const HelpView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I check an image, video, or audio file?',
      a: 'Drag and drop your file into the central upload area on the Dashboard, or click "Browse Media Files". Once selected, click "Analyze Now" to run the automated scan.'
    },
    {
      q: 'What media formats are supported?',
      a: 'DeepGuard AI supports Images (JPG, PNG, WEBP), Videos (MP4, MOV, WEBM), and Audio files (MP3, WAV, M4A).'
    },
    {
      q: 'How is the Trust Rating calculated?',
      a: 'The Trust Score (0-100) is calculated by combining multiple independent signals: Real Photo Score, AI Creation Risk, Photo Editing Risk, and Original Camera Data reliability.'
    },
    {
      q: 'How do I access technical forensic details and raw signals?',
      a: 'Essential verdicts and plain-English explanations are presented immediately. For in-depth investigation, click "Explore Findings & Technical Evidence" on any analysis to view forensic signals, noise distribution, and metadata.'
    },
    {
      q: 'Can I export a verification report?',
      a: 'Yes! Inside the File Info panel on any analysis, click "Download Report (JSON)" or "Print Report" to save a formatted summary of the findings.'
    },
    {
      q: 'Is my uploaded media stored permanently?',
      a: 'No. Files are processed securely in temporary session memory and are deleted in compliance with privacy retention policies.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Raised Card */}
      <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-raised-small)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--text-primary)'
        }}>
          <HelpCircle size={28} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Help Center & FAQs
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Learn how to use DeepGuard AI, interpret scores, and export verification reports.
        </p>
      </div>

      {/* Quick Guide Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        <div className="glass-card" style={{ padding: '22px' }}>
          <ShieldCheck size={20} style={{ marginBottom: '10px', color: 'var(--text-primary)' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>1. Upload & Scan</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Drop any image, video, or audio file to start automatic analysis.</p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <Layers size={20} style={{ marginBottom: '10px', color: 'var(--text-primary)' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>2. Visual Inspector</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Inspect original view vs highlighted AI edits and anomaly regions.</p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <Download size={20} style={{ marginBottom: '10px', color: 'var(--text-primary)' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>3. Download Report</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Export official PDF certificates and verification dossier records.</p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div id="faqs" className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} /> Frequently Asked Questions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={isOpen ? 'neu-raised-sm' : 'neu-inset'}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {isOpen && (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
