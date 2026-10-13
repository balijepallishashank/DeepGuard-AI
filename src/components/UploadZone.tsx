import React, { useState, useRef, useEffect } from 'react';
import type { MediaType } from '../types';
import { UploadCloud, FileUp, X, Sparkles, Video, Music, Image as ImageIcon, Play, Pause, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

interface SelectedFile {
  file: File;
  previewUrl: string;
  mediaType: MediaType;
  name: string;
  size: string;
}

interface UploadZoneProps {
  onAnalyze: (selected: SelectedFile) => void;
  onSampleSelect: (sampleId: string) => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit

export const UploadZone: React.FC<UploadZoneProps> = ({ onAnalyze, onSampleSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }
    };
  }, [selectedFile]);

  const getMediaType = (file: File): MediaType | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
    return null;
  };

  const processFile = (file: File) => {
    setValidationError(null);

    // 1. File Size Verification
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setValidationError(`File exceeds maximum size limit of 50 MB (${sizeMb} MB). Please choose a smaller file.`);
      return;
    }

    // 2. MIME & Format Verification
    const mediaType = getMediaType(file);
    if (!mediaType) {
      setValidationError(`Unsupported file format "${file.name}". Please upload a JPG, PNG, WEBP, MP4, MOV, WEBM, MP3, WAV, or M4A file.`);
      return;
    }

    // Clean up previous preview URL if any
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }

    soundManager.playDropChime();
    const previewUrl = URL.createObjectURL(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);

    setSelectedFile({
      file,
      previewUrl,
      mediaType,
      name: file.name,
      size: `${sizeInMB} MB`
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files[0]) {
      processFile(e.clipboardData.files[0]);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleRemoveFile = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
    setValidationError(null);
  };

  return (
    <div className="glass-card" style={{ padding: '28px', textAlign: 'center', position: 'relative' }}>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/x-m4a,audio/mp4"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '14px',
          padding: '12px 18px',
          marginBottom: '20px',
          textAlign: 'left',
          color: '#991b1b',
          fontSize: '0.84rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: '2px' }}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!selectedFile ? (
        /* Empty Idle Dropzone with Neumorphic Outer Panel & Inset Drop Target */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={() => fileInputRef.current?.click()}
          className={`liquid-dropzone ${isDragging ? 'dragging' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          aria-label="Upload media dropzone"
        >
          <div className="neu-drop-target">
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-raised-small)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--text-primary)'
            }}>
              <UploadCloud size={30} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {isDragging ? 'Release to begin analysis' : 'Drop your media. Discover the evidence.'}
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 18px' }}>
              Drag and drop an image, video, or audio file here (max 50 MB), or browse your device.
            </p>

            {/* Supported Media Badges (Monochrome) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
              <span className="badge" style={{ fontSize: '0.74rem' }}>
                <ImageIcon size={13} /> Images (JPG, PNG, WEBP)
              </span>
              <span className="badge" style={{ fontSize: '0.74rem' }}>
                <Video size={13} /> Videos (MP4, MOV, WEBM)
              </span>
              <span className="badge" style={{ fontSize: '0.74rem' }}>
                <Music size={13} /> Audio (MP3, WAV, M4A)
              </span>
            </div>

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="btn-primary" 
              style={{ fontSize: '0.9rem', padding: '12px 28px' }}
            >
              <FileUp size={16} /> Browse Media Files
            </button>
          </div>
        </div>
      ) : (
        /* Selected Media Preview & Analysis Action Card */
        <div className="neu-raised" style={{ padding: '24px', borderRadius: 'var(--radius-panel)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="badge font-mono" style={{ fontSize: '0.75rem' }}>
              READY FOR AUDIT • {selectedFile.mediaType.toUpperCase()}
            </span>
            <button
              onClick={handleRemoveFile}
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#991b1b' }}
            >
              <X size={14} /> Remove File
            </button>
          </div>

          {/* Media Preview Container */}
          <div style={{
            margin: '0 auto 20px',
            maxWidth: '520px',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-inset)',
            border: '1px solid var(--border-neutral)'
          }}>
            {selectedFile.mediaType === 'image' && (
              <img
                src={selectedFile.previewUrl}
                alt={selectedFile.name}
                style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', padding: '8px' }}
              />
            )}

            {selectedFile.mediaType === 'video' && (
              <video
                src={selectedFile.previewUrl}
                controls
                style={{ width: '100%', maxHeight: '280px' }}
              />
            )}

            {selectedFile.mediaType === 'audio' && (
              <div style={{ padding: '28px 20px', color: 'var(--text-primary)' }}>
                <audio ref={audioRef} src={selectedFile.previewUrl} onEnded={() => setIsPlayingAudio(false)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                  <button
                    onClick={toggleAudioPlay}
                    className="btn-primary"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      padding: 0
                    }}
                  >
                    {isPlayingAudio ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Audio Track • {selectedFile.size}</div>
                  </div>
                </div>
                {/* Waveform graphic bars */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '16px', height: '36px' }}>
                  {[40, 65, 30, 85, 95, 50, 75, 40, 90, 60, 35, 80, 100, 45, 70, 55, 30, 85, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        height: `${h}%`,
                        background: isPlayingAudio ? '#202124' : '#a3a3ad',
                        borderRadius: '2px',
                        transition: 'height 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* File Meta Summary */}
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
            {selectedFile.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.82rem' }}>({selectedFile.size})</span>
          </div>

          {/* Analyze Now Button (Charcoal Pill) */}
          <button
            onClick={() => onAnalyze(selectedFile)}
            className="btn-primary"
            style={{ fontSize: '0.96rem', padding: '13px 38px' }}
          >
            <Sparkles size={17} /> Analyze Now
          </button>
        </div>
      )}

      {/* Preset Investigation Chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '22px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Or test a sample file:</span>
        <button
          onClick={() => onSampleSelect('TL-2026-000184')}
          className="btn-outline"
          style={{ fontSize: '0.76rem', padding: '5px 12px' }}
        >
          <Sparkles size={12} /> Portrait Photo (AI)
        </button>
        <button
          onClick={() => onSampleSelect('TL-2026-000195')}
          className="btn-outline"
          style={{ fontSize: '0.76rem', padding: '5px 12px' }}
        >
          <Sparkles size={12} /> Press Photo (Real)
        </button>
        <button
          onClick={() => onSampleSelect('TL-2026-000210')}
          className="btn-outline"
          style={{ fontSize: '0.76rem', padding: '5px 12px' }}
        >
          <Sparkles size={12} /> Background Edit
        </button>
        <button
          onClick={() => onSampleSelect('TL-2026-000240')}
          className="btn-outline"
          style={{ fontSize: '0.76rem', padding: '5px 12px' }}
        >
          <Video size={12} /> Deepfake Video
        </button>
        <button
          onClick={() => onSampleSelect('TL-2026-000250')}
          className="btn-outline"
          style={{ fontSize: '0.76rem', padding: '5px 12px' }}
        >
          <Music size={12} /> Synthetic Speech
        </button>
      </div>

    </div>
  );
};
