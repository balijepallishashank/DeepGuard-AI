import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, SlidersHorizontal } from 'lucide-react';

interface ImageCompareSliderProps {
  originalUrl: string;
  isFake: boolean;
  opacity?: number;
}

export const ImageCompareSlider: React.FC<ImageCompareSliderProps> = ({ originalUrl, isFake, opacity = 75 }) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const positionPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(positionPercent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Top Helper Bar & Split Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600 }}>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={16} /> Drag slider or use arrow keys (← / →) to compare
        </span>
        <span className="badge font-mono" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
          {Math.round(sliderPosition)}% SPLIT
        </span>
      </div>

      {/* Main Comparison Viewport */}
      <div
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Image comparison split position"
        className="neu-inset"
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--border-neutral)',
          background: 'var(--surface)',
          cursor: 'ew-resize',
          userSelect: 'none',
          outline: 'none'
        }}
      >
        {/* Right Base Layer: Modified / AI Edit View */}
        <img
          src={originalUrl}
          alt="Modified / AI Edit View"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: 'var(--surface)'
          }}
        />

        {/* AI Highlight Boxes overlay on the right layer */}
        {isFake && (
          <div style={{ opacity: Math.max(0.1, Math.min(1, opacity / 100)), transition: 'opacity 0.15s ease' }}>
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '34%',
                width: '32%',
                height: '40%',
                border: '2px solid rgba(153, 27, 27, 0.75)',
                background: 'rgba(254, 202, 202, 0.25)',
                borderRadius: '12px',
                pointerEvents: 'none'
              }}
            >
              <span
                className="font-mono"
                style={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  background: '#202124',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                Synthesized Smoothing
              </span>
            </div>

            <div
              style={{
                position: 'absolute',
                top: '28%',
                left: '42%',
                width: '18%',
                height: '15%',
                border: '2px solid rgba(146, 64, 14, 0.75)',
                background: 'rgba(254, 243, 199, 0.25)',
                borderRadius: '8px',
                pointerEvents: 'none'
              }}
            >
              <span
                className="font-mono"
                style={{
                  position: 'absolute',
                  bottom: -22,
                  left: 0,
                  background: '#202124',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                Reflection Vector Discrepancy
              </span>
            </div>
          </div>
        )}

        {/* Left Layer: Clean Original View (Clipped by slider position) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${sliderPosition}%`,
            overflow: 'hidden',
            borderRight: '2px solid #202124',
            boxShadow: '2px 0 10px rgba(0, 0, 0, 0.15)'
          }}
        >
          <img
            src={originalUrl}
            alt="Original Source View"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: containerWidth > 0 ? `${containerWidth}px` : '100%',
              height: '100%',
              objectFit: 'contain',
              maxWidth: 'none',
              background: 'var(--surface)'
            }}
          />
          
          {/* Original View Badge */}
          <div
            className="neu-raised-sm font-mono"
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              color: 'var(--text-primary)'
            }}
          >
            ORIGINAL (SOURCE)
          </div>
        </div>

        {/* Modified View Badge */}
        <div
          className="neu-raised-sm font-mono"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '4px 10px',
            color: 'var(--text-primary)'
          }}
        >
          MODIFIED (AI EDIT)
        </div>

        {/* Tactile Circular Slider Handle */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `calc(${sliderPosition}% - 18px)`,
            width: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#202124',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff'
            }}
          >
            <SlidersHorizontal size={16} />
          </div>
        </div>

      </div>
    </div>
  );
};
