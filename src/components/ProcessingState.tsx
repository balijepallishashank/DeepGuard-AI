import React from 'react';
import { RefreshCw, CheckCircle2, XCircle, Image as ImageIcon, Video, Music } from 'lucide-react';
import type { MediaType } from '../types';

interface ProcessingStateProps {
  mediaName: string;
  mediaType: MediaType;
  previewUrl?: string;
  scanProgress: number;
  onCancel?: () => void;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  mediaName,
  mediaType,
  previewUrl,
  scanProgress,
  onCancel
}) => {
  const getStageSteps = (type: MediaType) => {
    switch (type) {
      case 'image':
        return [
          { label: 'Validating image container & pixel dimensions', minProgress: 15 },
          { label: 'Extracting EXIF metadata & computing SHA-256 hash', minProgress: 35 },
          { label: 'Examining micro-texture diffusion & noise residuals', minProgress: 60 },
          { label: 'Running Vision Neural Transformer Detector', minProgress: 82 },
          { label: 'Synthesizing evidence chain & trust score', minProgress: 98 }
        ];
      case 'video':
        return [
          { label: 'Demuxing video container & audio track', minProgress: 15 },
          { label: 'Extracting keyframes & computing perceptual hashes', minProgress: 35 },
          { label: 'Analyzing temporal frame-to-frame coherence', minProgress: 60 },
          { label: 'Scanning facial landmarks for deepfake synthesis', minProgress: 82 },
          { label: 'Collecting suspicious timestamps & finalizing result', minProgress: 98 }
        ];
      case 'audio':
        return [
          { label: 'Decoding audio stream & sample rate header', minProgress: 15 },
          { label: 'Computing STFT spectrogram & spectral tilt', minProgress: 35 },
          { label: 'Evaluating phase continuity & acoustic artifacts', minProgress: 60 },
          { label: 'Running Voice Clone Neural Classifier', minProgress: 82 },
          { label: 'Compiling acoustic segment report', minProgress: 98 }
        ];
    }
  };

  const steps = getStageSteps(mediaType);
  const currentFrame = Math.min(60, Math.floor((scanProgress / 100) * 60));

  return (
    <div className="glass-card" style={{ padding: '36px 30px', textAlign: 'center', position: 'relative' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge font-mono" style={{ fontSize: '0.74rem' }}>
            ACTIVE AUDIT • {mediaType.toUpperCase()}
          </span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="btn-outline"
            style={{ fontSize: '0.76rem', padding: '5px 14px', color: '#991b1b' }}
          >
            <XCircle size={14} /> Cancel Scan
          </button>
        )}
      </div>

      {/* Media-Aware Scanner Viewport with Inset Frame */}
      <div style={{
        maxWidth: '520px',
        margin: '0 auto 26px',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-inset)',
        border: '1px solid var(--border-neutral)',
        position: 'relative',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* 1. IMAGE FORENSICS SCANNER ANIMATION */}
        {mediaType === 'image' && (
          <div style={{ width: '100%', position: 'relative', height: '240px', overflow: 'hidden' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={mediaName}
                style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.9 }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={48} color="var(--text-secondary)" />
              </div>
            )}

            {/* Laser Scanbeam */}
            <div style={{
              position: 'absolute',
              top: `${(scanProgress % 100)}%`,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent 0%, #202124 30%, #686970 50%, #202124 70%, transparent 100%)',
              boxShadow: '0 0 10px rgba(32, 33, 36, 0.4)',
              transition: 'top 0.1s linear'
            }} />

            {/* Scanning Radar Badge */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-raised-small)',
              borderRadius: '12px',
              padding: '6px 14px',
              fontSize: '0.72rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }} className="font-mono">
              <RefreshCw size={12} style={{ animation: 'spin 1.2s linear infinite' }} />
              DIFFUSION PATTERN SCAN
            </div>
          </div>
        )}

        {/* 2. VIDEO FRAME INVESTIGATION ANIMATION */}
        {mediaType === 'video' && (
          <div style={{ width: '100%', padding: '24px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxHeight: '180px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 16px', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)' }}>
              {previewUrl ? (
                <video src={previewUrl} muted style={{ width: '100%', height: '140px', objectFit: 'cover', opacity: 0.85 }} />
              ) : (
                <div style={{ padding: '30px' }}><Video size={40} color="var(--text-secondary)" /></div>
              )}
              {/* Frame counter badge */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--surface)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-primary)', boxShadow: 'var(--shadow-raised-small)' }} className="font-mono">
                Frame {currentFrame} / 60
              </div>
            </div>

            {/* Frame Timeline Scrubber */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
              {Array.from({ length: 12 }).map((_, idx) => {
                const active = idx <= Math.floor((scanProgress / 100) * 12);
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '4px',
                      background: active ? '#202124' : '#d1d1d8',
                      boxShadow: active ? '0 0 6px rgba(32, 33, 36, 0.3)' : 'none',
                      transition: 'background 0.2s ease'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="font-mono">
              Temporal consistency scan across 60 sampled frames
            </div>
          </div>
        )}

        {/* 3. AUDIO WAVEFORM ANALYSIS ANIMATION */}
        {mediaType === 'audio' && (
          <div style={{ width: '100%', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <Music size={30} color="var(--text-primary)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Acoustic Frequency Sweep</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
                  Spectral Segment: 00:00 → 00:{Math.floor((scanProgress / 100) * 30).toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Dynamic Waveform Frequency Bars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '56px', marginBottom: '12px' }}>
              {[35, 60, 80, 45, 95, 30, 70, 100, 55, 85, 40, 90, 75, 50, 85, 60, 40, 95, 70, 30, 80, 50].map((h, i) => {
                const isActive = i <= Math.floor((scanProgress / 100) * 22);
                return (
                  <div
                    key={i}
                    style={{
                      width: '5px',
                      height: `${isActive ? h : 20}%`,
                      background: isActive ? '#202124' : '#a3a3ad',
                      borderRadius: '3px',
                      transition: 'all 0.2s ease'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }} className="font-mono">
              Voice Synthesizer Neural Audit • Phase Alignment Check
            </div>
          </div>
        )}

      </div>

      {/* Primary Headline */}
      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Examining "{mediaName}" ({scanProgress}%)
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '22px' }}>
        Analyzing available signals and evaluating digital evidence.
      </p>

      {/* Main Inset Progress Bar Track */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        height: '10px',
        background: 'var(--surface)',
        borderRadius: '6px',
        overflow: 'hidden',
        margin: '0 auto 24px',
        boxShadow: 'var(--shadow-inset)',
        border: '1px solid var(--border-neutral)'
      }}>
        <div style={{
          width: `${scanProgress}%`,
          height: '100%',
          background: '#202124',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Forensic Stages Breakdown */}
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'left'
      }}>
        {steps.map((step, idx) => {
          const isDone = scanProgress >= step.minProgress;
          const isCurrent = scanProgress < step.minProgress && (idx === 0 || scanProgress >= steps[idx - 1].minProgress);

          return (
            <div
              key={idx}
              className={isDone || isCurrent ? 'neu-raised-sm' : 'neu-inset'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '14px',
                fontSize: '0.82rem',
                fontWeight: isCurrent || isDone ? 700 : 500,
                color: isDone ? 'var(--text-primary)' : isCurrent ? '#202124' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}
            >
              {isDone ? (
                <CheckCircle2 size={16} color="#166534" />
              ) : isCurrent ? (
                <RefreshCw size={14} color="#202124" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a3a3ad', margin: '0 3px' }} />
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
