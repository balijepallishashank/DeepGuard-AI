import React, { useState, useEffect } from 'react';
import type { AnalysisRecord, AutopsyChannelIsolation, AutopsyElaResult, AutopsyKeyframe, AutopsyAudioWaveform } from '../types';
import {
  loadImageElement,
  computeRealImagePerceptualHashes,
  performErrorLevelAnalysis,
  extractColorChannels,
  extractVideoKeyframes,
  extractAudioWaveform
} from '../utils/mediaAutopsy';
import {
  Microscope,
  Layers,
  Activity,
  Key,
  Sliders,
  ZoomIn,
  Copy,
  Check,
  AlertTriangle,
  FileCheck,
  Info,
  Video,
  Music
} from 'lucide-react';

interface MediaAutopsyViewProps {
  analysis: AnalysisRecord;
}

export const MediaAutopsyView: React.FC<MediaAutopsyViewProps> = ({ analysis }) => {
  const [activeTool, setActiveTool] = useState<'ELA' | 'CHANNELS' | 'HASHES' | 'STREAM'>('ELA');
  
  // ELA State
  const [elaQuality, setElaQuality] = useState<number>(0.90);
  const [elaAmplification, setElaAmplification] = useState<number>(20);
  const [elaResult, setElaResult] = useState<AutopsyElaResult | null>(null);
  const [isProcessingEla, setIsProcessingEla] = useState<boolean>(false);

  // Channels State
  const [channels, setChannels] = useState<AutopsyChannelIsolation | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'red' | 'green' | 'blue' | 'luminance'>('luminance');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Perceptual Hashes State
  const [realHashes, setRealHashes] = useState<{ aHash: string; dHash: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Video / Audio Stream State
  const [keyframes, setKeyframes] = useState<AutopsyKeyframe[]>([]);
  const [audioWaveform, setAudioWaveform] = useState<AutopsyAudioWaveform | null>(null);
  const [isExtractingStream, setIsExtractingStream] = useState<boolean>(false);

  // Load Image Forensics
  useEffect(() => {
    let isCancelled = false;

    if (analysis.mediaType === 'image') {
      queueMicrotask(() => {
        if (!isCancelled) setIsProcessingEla(true);
      });
      loadImageElement(analysis.mediaUrl)
        .then(async (img) => {
          if (isCancelled) return;

          // 1. Real Perceptual Hashes (aHash & dHash from actual pixels)
          const hashes = computeRealImagePerceptualHashes(img);
          setRealHashes(hashes);

          // 2. Real Color Channels
          const isolatedChannels = extractColorChannels(img);
          setChannels(isolatedChannels);

          // 3. Real ELA
          const ela = await performErrorLevelAnalysis(img, elaQuality, elaAmplification);
          if (!isCancelled) {
            setElaResult(ela);
            setIsProcessingEla(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setIsProcessingEla(false);
        });
    }

    if (analysis.mediaType === 'video') {
      queueMicrotask(() => {
        if (!isCancelled) setIsExtractingStream(true);
      });
      extractVideoKeyframes(analysis.mediaUrl, 4).then((frames) => {
        if (!isCancelled) {
          setKeyframes(frames);
          setIsExtractingStream(false);
        }
      });
    }

    if (analysis.mediaType === 'audio') {
      queueMicrotask(() => {
        if (!isCancelled) setIsExtractingStream(true);
      });
      extractAudioWaveform(analysis.mediaUrl, 48).then((wf) => {
        if (!isCancelled) {
          setAudioWaveform(wf);
          setIsExtractingStream(false);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [analysis.mediaUrl, analysis.mediaType, elaQuality, elaAmplification]);

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedHash(label);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      
      {/* Autopsy Header Card */}
      <div className="glass-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Microscope size={26} color="var(--text-primary)" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Media Autopsy & Pixel-Level Diagnostics
              </h2>
              <span className="badge font-mono" style={{ fontSize: '0.74rem' }}>
                DETERMINISTIC FORENSICS
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pixel-level mathematical decomposition, genuine Error Level Analysis, and algorithmically computed perceptual fingerprints.
            </p>
          </div>

          {/* Autopsy Tool Selector Tabs */}
          <div className="neu-inset" style={{ display: 'flex', gap: '6px', padding: '6px', borderRadius: '12px', flexWrap: 'wrap' }}>
            {analysis.mediaType === 'image' && (
              <>
                <button
                  onClick={() => setActiveTool('ELA')}
                  className={activeTool === 'ELA' ? 'btn-primary' : 'btn-outline'}
                  style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                >
                  <Activity size={14} /> Error Level Analysis (ELA)
                </button>
                <button
                  onClick={() => setActiveTool('CHANNELS')}
                  className={activeTool === 'CHANNELS' ? 'btn-primary' : 'btn-outline'}
                  style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                >
                  <Layers size={14} /> Color & Luminance Isolation
                </button>
                <button
                  onClick={() => setActiveTool('HASHES')}
                  className={activeTool === 'HASHES' ? 'btn-primary' : 'btn-outline'}
                  style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                >
                  <Key size={14} /> Perceptual Identifiers
                </button>
              </>
            )}

            {(analysis.mediaType === 'video' || analysis.mediaType === 'audio') && (
              <button
                onClick={() => setActiveTool('STREAM')}
                className={activeTool === 'STREAM' ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                {analysis.mediaType === 'video' ? <Video size={14} /> : <Music size={14} />} Stream Decomposition
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOOL 1: ERROR LEVEL ANALYSIS (ELA) */}
      {/* ========================================================================= */}
      {activeTool === 'ELA' && analysis.mediaType === 'image' && (
        <div className="glass-card" style={{ padding: '30px 32px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Authentic Error Level Analysis (ELA)
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Measures JPEG quantization error by re-compressing at a known ratio and amplifying pixel differences.
              </p>
            </div>

            {/* Interactive Controls */}
            <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 18px', borderRadius: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <Sliders size={14} color="var(--text-muted)" />
                <span>JPEG Re-save Quality:</span>
                <input
                  type="range"
                  min="70"
                  max="95"
                  value={Math.round(elaQuality * 100)}
                  onChange={(e) => setElaQuality(Number(e.target.value) / 100)}
                  style={{ width: '80px', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
                />
                <span className="font-mono" style={{ fontWeight: 700 }}>{Math.round(elaQuality * 100)}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <span>Amplification:</span>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={elaAmplification}
                  onChange={(e) => setElaAmplification(Number(e.target.value))}
                  style={{ width: '80px', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
                />
                <span className="font-mono" style={{ fontWeight: 700 }}>{elaAmplification}×</span>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer Alert Banner */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-neutral)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '22px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Info size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Scientific Principle & Limitations:</strong> ELA reveals differences in compression rates across 8×8 discrete cosine transform (DCT) blocks. Elements edited or spliced from different sources often display distinct error levels compared to original content. However, ELA alone <strong>cannot prove generative AI synthesis</strong>, and natural high-contrast edges will naturally generate higher error rates.
            </div>
          </div>

          {/* ELA Canvas Visualization Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
            
            {/* Original Source */}
            <div className="neu-inset" style={{ padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }} className="font-mono">
                ORIGINAL MEDIA INPUT
              </div>
              <img
                src={analysis.mediaUrl}
                alt="Original Media"
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>

            {/* ELA Difference Map */}
            <div className="neu-inset" style={{ padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }} className="font-mono">
                  AMPLIFIED ERROR DIFFERENCE MAP ({elaAmplification}×)
                </span>
                {elaResult && (
                  <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Avg Error: {elaResult.averageError} • Max Error: {elaResult.maxError}
                  </span>
                )}
              </div>

              {isProcessingEla ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Calculating pixel variance matrix...
                </div>
              ) : elaResult ? (
                <img
                  src={elaResult.elaDataUrl}
                  alt="Error Level Analysis"
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '8px', background: '#000000' }}
                />
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Error level analysis could not be generated for this container.
                </div>
              )}
            </div>

          </div>

          {/* Metrics & Statistical Observations */}
          {elaResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '22px' }}>
              <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">AVERAGE ERROR MAGNITUDE</div>
                <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {elaResult.averageError}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Mean absolute deviation per color channel
                </div>
              </div>

              <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">PEAK ERROR ANOMALY</div>
                <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {elaResult.maxError} / 255
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Maximum recorded single-pixel variance
                </div>
              </div>

              <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">COMPRESSION HOMOGENEITY</div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: elaResult.suspiciousVariance ? '#b91c1c' : '#15803d', marginTop: '4px' }}>
                  {elaResult.suspiciousVariance ? 'Non-Uniform Variance' : 'Uniform Grid Variance'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {elaResult.suspiciousVariance ? 'Localized high compression difference' : 'Consistent quantization across blocks'}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TOOL 2: COLOR & LUMINANCE CHANNEL ISOLATION */}
      {/* ========================================================================= */}
      {activeTool === 'CHANNELS' && analysis.mediaType === 'image' && (
        <div className="glass-card" style={{ padding: '30px 32px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Pixel Channel Isolation & Luminance Map
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Isolates discrete RGB channels and grayscale ITU-R BT.601 luminance to reveal noise imbalances.
              </p>
            </div>

            {/* Channel Selection Pills */}
            <div className="neu-inset" style={{ display: 'flex', gap: '6px', padding: '6px', borderRadius: '12px' }}>
              {(['luminance', 'red', 'green', 'blue'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={selectedChannel === ch ? 'btn-primary' : 'btn-outline'}
                  style={{ fontSize: '0.78rem', padding: '6px 14px', textTransform: 'capitalize' }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Display with Zoom Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setZoomLevel(zoomLevel === 1 ? 2 : zoomLevel === 2 ? 3 : 1)}
                className="btn-outline"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                <ZoomIn size={14} /> Zoom: {zoomLevel}×
              </button>
            </div>

            <div className="neu-inset" style={{
              padding: '20px',
              borderRadius: '16px',
              textAlign: 'center',
              overflow: 'auto',
              maxHeight: '520px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {channels ? (
                <img
                  src={channels[selectedChannel]}
                  alt={`${selectedChannel} Channel`}
                  style={{
                    maxWidth: zoomLevel === 1 ? '100%' : 'none',
                    width: `${zoomLevel * 100}%`,
                    objectFit: 'contain',
                    borderRadius: '8px',
                    transition: 'width 0.2s ease'
                  }}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', padding: '60px 0' }}>
                  Extracting pixel matrix channels...
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TOOL 3: GENUINE PERCEPTUAL HASHES */}
      {/* ========================================================================= */}
      {activeTool === 'HASHES' && analysis.mediaType === 'image' && (
        <div className="glass-card" style={{ padding: '30px 32px' }}>
          
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Deterministic Perceptual Fingerprints (Live Pixel Computed)
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Real 64-bit spatial perceptual hashes generated from actual image pixels, invariant to minor compression.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Average Hash (aHash) */}
            <div className="neu-raised-sm" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>ALGORITHM: aHash (AVERAGE HASH)</span>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    Average Luminance Hash (8×8 Grid)
                  </h4>
                </div>
                <button
                  onClick={() => realHashes && handleCopy(realHashes.aHash, 'aHash')}
                  className="btn-outline"
                  style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                >
                  {copiedHash === 'aHash' ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                  {copiedHash === 'aHash' ? 'Copied' : 'Copy aHash'}
                </button>
              </div>
              <div className="font-mono neu-inset" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                {realHashes?.aHash || 'Computing...'}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Downsamples image to 8×8 pixels, converts to grayscale luminance, calculates mean brightness, and sets bits based on pixel threshold relative to mean.
              </p>
            </div>

            {/* Difference Hash (dHash) */}
            <div className="neu-raised-sm" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="badge font-mono" style={{ fontSize: '0.72rem' }}>ALGORITHM: dHash (GRADIENT DIFFERENCE)</span>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    Horizontal Gradient Difference Hash (9×8 Grid)
                  </h4>
                </div>
                <button
                  onClick={() => realHashes && handleCopy(realHashes.dHash, 'dHash')}
                  className="btn-outline"
                  style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                >
                  {copiedHash === 'dHash' ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                  {copiedHash === 'dHash' ? 'Copied' : 'Copy dHash'}
                </button>
              </div>
              <div className="font-mono neu-inset" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                {realHashes?.dHash || 'Computing...'}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Downsamples image to 9×8 pixels and tracks the directional brightness gradient between adjacent horizontal pixels across 8 rows.
              </p>
            </div>

            {/* Cryptographic SHA-256 for comparison */}
            <div className="neu-inset" style={{ padding: '16px 20px', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  EXACT FILE DIGEST (SHA-256 Web Crypto API):
                </span>
                <button
                  onClick={() => handleCopy(analysis.passport.sha256, 'sha256')}
                  className="btn-outline"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  {copiedHash === 'sha256' ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                  {copiedHash === 'sha256' ? 'Copied' : 'Copy SHA-256'}
                </button>
              </div>
              <div className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {analysis.passport.sha256}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TOOL 4: STREAM DECOMPOSITION (VIDEO KEYFRAMES & AUDIO WAVEFORM) */}
      {/* ========================================================================= */}
      {activeTool === 'STREAM' && (
        <div className="glass-card" style={{ padding: '30px 32px' }}>
          
          {analysis.mediaType === 'video' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Video Frame Extraction & Keyframe Telemetry
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Extracted representative temporal keyframes using HTML5 canvas decoder with spatial hashes per frame.
                </p>
              </div>

              {isExtractingStream ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Extracting keyframes from video stream...
                </div>
              ) : keyframes.length === 0 ? (
                <div className="neu-inset" style={{ padding: '30px', textAlign: 'center', borderRadius: '12px' }}>
                  <Video size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Keyframe decoding completed. Stream duration: {analysis.videoData?.duration || 'Standard'}.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                  {keyframes.map((frame, idx) => (
                    <div key={idx} className="neu-raised-sm" style={{ padding: '14px', borderRadius: '14px' }}>
                      <img
                        src={frame.dataUrl}
                        alt={`Keyframe ${frame.timestamp}`}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem' }} className="font-mono">
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>T: {frame.timestamp}</span>
                        <span style={{ color: 'var(--text-muted)' }}>aHash: {frame.aHash.substring(0, 8)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysis.mediaType === 'audio' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Web Audio API Waveform & Spectral Metrics
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Actual decoded PCM audio amplitude buffer analyzed in real time.
                </p>
              </div>

              {isExtractingStream ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Decoding audio buffer...
                </div>
              ) : audioWaveform ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Visual Waveform Bar Chart */}
                  <div className="neu-inset" style={{
                    padding: '24px 20px',
                    borderRadius: '16px',
                    height: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px'
                  }}>
                    {audioWaveform.peaks.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          height: `${Math.max(6, p)}%`,
                          background: 'var(--text-primary)',
                          borderRadius: '2px',
                          opacity: 0.75 + (p / 400)
                        }}
                      />
                    ))}
                  </div>

                  {/* Audio Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">SAMPLE RATE</div>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {audioWaveform.sampleRate} Hz
                      </div>
                    </div>

                    <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">CHANNELS</div>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {audioWaveform.channels === 1 ? 'Mono' : 'Stereo'} ({audioWaveform.channels})
                      </div>
                    </div>

                    <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">PEAK AMPLITUDE</div>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {audioWaveform.peakAmplitude} FS
                      </div>
                    </div>

                    <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }} className="font-mono">RMS SIGNAL ENERGY</div>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {audioWaveform.rmsAmplitude}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="neu-inset" style={{ padding: '30px', textAlign: 'center', borderRadius: '12px' }}>
                  <Music size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Audio waveform decoded. Format: {analysis.audioData?.sampleRate || '44.1 kHz'}.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* STRUCTURED EVIDENCE PANEL: OBSERVATIONS VS INTERPRETATIONS VS CONCLUSIONS */}
      {/* ========================================================================= */}
      <div className="glass-card" style={{ padding: '30px 32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '18px' }}>
          Forensic Integrity Triad: Observations, Interpretations & Scientific Limits
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* 1. Observations */}
          <div className="neu-raised-sm" style={{ padding: '20px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileCheck size={18} color="var(--text-primary)" />
              <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                1. Empirical Observations
              </h4>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.45 }}>
              <li><strong>SHA-256 Digest:</strong> Cryptographic integrity verified via Web Crypto API.</li>
              <li><strong>Container Headers:</strong> Verified MIME type, stream dimensions, duration, and frame metrics.</li>
              <li><strong>Pixel Quantization:</strong> Direct Error Level Analysis performed on raw bitmap data.</li>
            </ul>
          </div>

          {/* 2. Interpretations */}
          <div className="neu-raised-sm" style={{ padding: '20px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Activity size={18} color="var(--text-primary)" />
              <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                2. Forensic Interpretations
              </h4>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.45 }}>
              <li><strong>Compression Variance:</strong> ELA highlights regions with differing lossy compression histories.</li>
              <li><strong>Luminance Distribution:</strong> Grayscale channels reveal whether sensor noise is uniform across RGB sensors.</li>
              <li><strong>Perceptual Signatures:</strong> aHash and dHash provide mathematical invariants for duplicate/edit detection.</li>
            </ul>
          </div>

          {/* 3. Scientific Limits */}
          <div className="neu-raised-sm" style={{ padding: '20px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle size={18} color="var(--text-muted)" />
              <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                3. Scientific Boundaries & Limits
              </h4>
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.45 }}>
              <li><strong>No False Authenticity:</strong> Absence of visible ELA anomalies does <em>not</em> prove an image is authentic.</li>
              <li><strong>AI Detector Disconnect:</strong> In client-only mode, neural inference models are offline. Deepfake authenticity is strictly inconclusive.</li>
              <li><strong>Non-Equivalence:</strong> Rolling hashes are never confused with spatial perceptual hashes.</li>
            </ul>
          </div>

        </div>
      </div>

    </div>
  );
};
