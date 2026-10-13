import React, { useState } from 'react';
import type { AnalysisRecord } from '../types';
import { getCategoryBadgeDetails } from '../utils/forensicsEngine';
import { EvidenceChain } from './EvidenceChain';
import { TrustScoreView } from './TrustScoreView';
import { ImagePassport } from './ImagePassport';
import { WhatChangedView } from './WhatChangedView';
import { VideoAnalysisView } from './VideoAnalysisView';
import { AudioAnalysisView } from './AudioAnalysisView';
import { InvestigatorDashboard } from './InvestigatorDashboard';
import { MediaAutopsyView } from './MediaAutopsyView';
import {
  ShieldAlert,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  Sparkles,
  Printer,
  Info,
  Microscope
} from 'lucide-react';

interface AnalysisResultSummaryProps {
  analysis: AnalysisRecord;
  onResetUpload: () => void;
  isDetailedOpen: boolean;
  setIsDetailedOpen: (open: boolean) => void;
}

export const AnalysisResultSummary: React.FC<AnalysisResultSummaryProps> = ({
  analysis,
  onResetUpload,
  isDetailedOpen,
  setIsDetailedOpen
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'EVIDENCE' | 'AUTOPSY' | 'VISUAL' | 'PASSPORT' | 'TRUST' | 'INVESTIGATOR'>('EVIDENCE');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const badge = getCategoryBadgeDetails(analysis.classification);
  const topFindings = analysis.evidenceChain.slice(0, 3);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ========================================================================= */}
      {/* LEVEL 1: QUICK SUMMARY (DEFAULT NEUMORPHIC RESULTS CARD) */}
      {/* ========================================================================= */}
      <div className="glass-card" style={{ padding: '32px 32px' }}>
        
        {/* Classification Header Banner */}
        <div className="neu-raised" style={{
          padding: '24px 28px',
          marginBottom: '26px',
          borderRadius: 'var(--radius-panel)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '2.4rem' }}>{badge.icon}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge font-mono" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    VERDICT • {badge.label}
                  </span>
                  {analysis.id.startsWith('TL-') && (
                    <span className="badge font-mono" style={{ fontSize: '0.72rem', marginBottom: '4px', background: 'var(--surface-muted, #f3f4f6)', color: 'var(--text-muted, #4b5563)' }}>
                      PRESET CASE STUDY
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '4px' }}>
                  {analysis.summaryText}
                </h2>
              </div>
            </div>

            {/* Score Metric Badges with Inset Framing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="neu-inset" style={{ padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {analysis.confidence}%
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }} className="font-mono">
                  Detection Match
                </div>
              </div>

              <div className="neu-inset" style={{ padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: analysis.trustBreakdown.overallTrustScore >= 70 ? '#166534' : '#991b1b' }}>
                  {analysis.trustBreakdown.overallTrustScore}<span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }} className="font-mono">
                  Trust Score
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Top 3 Key Findings Summary */}
        <div style={{ marginBottom: '26px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} /> Key Forensic Findings ({topFindings.length})
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {topFindings.map((item) => (
              <div
                key={item.id}
                className="neu-raised-sm"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      FINDING #{item.findingNumber}
                    </span>
                    <span className="badge font-mono" style={{
                      fontSize: '0.68rem',
                      color: item.impact === 'HIGH' ? '#991b1b' : '#92400e'
                    }}>
                      {item.impact} IMPACT
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {item.simpleExplanation}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-neutral)', fontSize: '0.74rem' }} className="font-mono">
                  <span style={{ color: 'var(--text-muted)' }}>Signal Strength</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{item.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          paddingTop: '22px',
          borderTop: '1px solid var(--border-neutral)'
        }}>
          {/* Primary CTA */}
          <button
            onClick={() => setIsDetailedOpen(!isDetailedOpen)}
            className="btn-primary"
            style={{ fontSize: '0.92rem', padding: '12px 26px' }}
          >
            <Sparkles size={16} />
            {isDetailedOpen ? 'Collapse Detailed View' : 'View Detailed Analysis'}
            {isDetailedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Secondary Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn-outline"
              style={{ fontSize: '0.86rem', padding: '10px 20px' }}
            >
              <FileText size={15} /> Download Forensic Report
            </button>

            <button
              onClick={onResetUpload}
              className="btn-outline"
              style={{ fontSize: '0.86rem', padding: '10px 20px' }}
            >
              <RotateCcw size={15} /> Analyze Another File
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* LEVEL 2-4: EXPANDABLE DETAILED INVESTIGATION PANEL */}
      {/* ========================================================================= */}
      {isDetailedOpen && (
        <div className="glass-card" style={{ padding: '32px 32px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>
                DETAILED INVESTIGATION MODE
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginTop: '4px' }}>
                Evidence Chain & Forensic Signals
              </h3>
            </div>

            {/* Navigation Tabs */}
            <div className="console-tabs-bar" style={{ margin: 0 }}>
              <button
                onClick={() => setActiveDetailTab('EVIDENCE')}
                className={`console-tab-btn ${activeDetailTab === 'EVIDENCE' ? 'active' : ''}`}
              >
                <ShieldAlert size={14} /> Level 2: Evidence ({analysis.evidenceChain.length})
              </button>

              <button
                onClick={() => setActiveDetailTab('AUTOPSY')}
                className={`console-tab-btn ${activeDetailTab === 'AUTOPSY' ? 'active' : ''}`}
              >
                <Microscope size={14} /> Media Autopsy & ELA
              </button>

              <button
                onClick={() => setActiveDetailTab('VISUAL')}
                className={`console-tab-btn ${activeDetailTab === 'VISUAL' ? 'active' : ''}`}
              >
                <Sparkles size={14} /> Level 4: Visual Inspector
              </button>

              <button
                onClick={() => setActiveDetailTab('PASSPORT')}
                className={`console-tab-btn ${activeDetailTab === 'PASSPORT' ? 'active' : ''}`}
              >
                <Award size={14} /> Level 3: File & Tech Info
              </button>

              <button
                onClick={() => setActiveDetailTab('TRUST')}
                className={`console-tab-btn ${activeDetailTab === 'TRUST' ? 'active' : ''}`}
              >
                <ShieldCheck size={14} /> Trust Breakdown
              </button>

              <button
                onClick={() => setActiveDetailTab('INVESTIGATOR')}
                className={`console-tab-btn ${activeDetailTab === 'INVESTIGATOR' ? 'active' : ''}`}
              >
                <Info size={14} /> Technical Signals
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div style={{ marginTop: '22px' }}>
            
            {/* LEVEL 2: EVIDENCE CHAIN */}
            {activeDetailTab === 'EVIDENCE' && (
              <EvidenceChain evidenceChain={analysis.evidenceChain} />
            )}

            {/* MEDIA AUTOPSY & ELA */}
            {activeDetailTab === 'AUTOPSY' && (
              <MediaAutopsyView analysis={analysis} />
            )}

            {/* LEVEL 4: VISUAL INSPECTOR */}
            {activeDetailTab === 'VISUAL' && (
              <div>
                {analysis.mediaType === 'image' && (
                  <WhatChangedView
                    mediaUrl={analysis.mediaUrl}
                    isFake={analysis.classification.includes('AI') || analysis.classification === 'LIKELY_MANIPULATED'}
                    regions={analysis.suspiciousRegions}
                  />
                )}

                {analysis.mediaType === 'video' && analysis.videoData && (
                  <VideoAnalysisView videoData={analysis.videoData} />
                )}

                {analysis.mediaType === 'audio' && analysis.audioData && (
                  <AudioAnalysisView audioData={analysis.audioData} />
                )}
              </div>
            )}

            {/* LEVEL 3: TECHNICAL DETAILS & PASSPORT */}
            {activeDetailTab === 'PASSPORT' && (
              <ImagePassport passport={analysis.passport} />
            )}

            {/* TRUST BREAKDOWN */}
            {activeDetailTab === 'TRUST' && (
              <TrustScoreView
                breakdown={analysis.trustBreakdown}
                previousScore={analysis.previousTrustScore}
                whySummary={analysis.simpleWhySummary}
              />
            )}

            {/* EXPERT SIGNALS */}
            {activeDetailTab === 'INVESTIGATOR' && (
              <InvestigatorDashboard analysis={analysis} />
            )}

          </div>

          <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-neutral)' }}>
            <button
              onClick={() => setIsDetailedOpen(false)}
              className="btn-outline"
              style={{ fontSize: '0.84rem', padding: '9px 24px' }}
            >
              <ChevronUp size={16} /> Return to Quick Summary
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 5: FULL INVESTIGATION REPORT MODAL (FLOATING NEUMORPHIC SURFACE) */}
      {/* ========================================================================= */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(32, 33, 36, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="neu-floating" style={{
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '38px',
            borderRadius: 'var(--radius-panel)',
            background: 'var(--surface-white)'
          }}>
            
            {/* Report Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-neutral)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  OFFICIAL FORENSIC AUDIT REPORT
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                  DeepGuard AI Verification Dossier
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Report ID: {analysis.passport.passportId} • Analysis Date: {analysis.passport.analysisDate}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge font-mono" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                  {badge.label}
                </span>
              </div>
            </div>

            {/* File & Engine Spec Table */}
            <div className="neu-inset" style={{ padding: '20px', borderRadius: 'var(--radius-card)', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }} className="font-mono">
                1. MEDIA SPECIFICATIONS & CRYPTOGRAPHIC HASH
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                <div><strong>File Name:</strong> {analysis.passport.fileName}</div>
                <div><strong>Media Type:</strong> {analysis.mediaType.toUpperCase()}</div>
                <div><strong>File Size:</strong> {analysis.passport.fileSize}</div>
                <div><strong>Detector:</strong> {analysis.modelInfo.modelName}</div>
                <div><strong>Engine Version:</strong> {analysis.modelInfo.modelVersion}</div>
                <div><strong>Trust Score:</strong> {analysis.trustBreakdown.overallTrustScore}/100</div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.76rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }} className="font-mono">
                <strong>SHA-256 Digest:</strong> {analysis.passport.sha256}
              </div>
            </div>

            {/* Evidence Findings */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }} className="font-mono">
                2. COMPREHENSIVE EVIDENCE CHAIN ({analysis.evidenceChain.length} ITEMS)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analysis.evidenceChain.map((ev) => (
                  <div key={ev.id} className="neu-raised-sm" style={{ padding: '14px 18px', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                      <span>Finding #{ev.findingNumber}: {ev.title}</span>
                      <span className="font-mono" style={{ color: ev.impact === 'HIGH' ? '#991b1b' : '#92400e' }}>{ev.impact} ({ev.confidence}%)</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ev.simpleExplanation}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '4px' }}>Technical: {ev.technicalExplanation}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimers & Stamp */}
            <div className="neu-inset" style={{ padding: '16px', borderRadius: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              <strong>Audit Disclaimer:</strong> This forensic report is compiled by DeepGuard AI using multi-modal deep learning transformer detectors, pixel-level noise variance inspection, and metadata verification algorithms. High confidence matches reflect neural probability, not absolute legal proof.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handlePrintReport}
                className="btn-primary"
                style={{ padding: '11px 24px', fontSize: '0.88rem' }}
              >
                <Printer size={16} /> Print / Save as PDF
              </button>

              <button
                onClick={() => setShowReportModal(false)}
                className="btn-outline"
                style={{ padding: '11px 22px', fontSize: '0.88rem' }}
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
