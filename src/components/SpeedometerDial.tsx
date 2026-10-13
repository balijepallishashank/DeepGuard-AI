import React from 'react';

interface SpeedometerDialProps {
  score: number;
  isFake: boolean;
}

export const SpeedometerDial: React.FC<SpeedometerDialProps> = ({ score, isFake }) => {
  const radius = 54;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = isFake ? '#b91c1c' : '#15803d';

  return (
    <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        {/* Outer Inset Ring Track */}
        <circle
          cx="65" cy="65" r={normalizedRadius}
          fill="none"
          stroke="var(--border-neutral)"
          strokeWidth={strokeWidth}
        />
        
        {/* Animated Speedometer Gauge Arc */}
        <circle
          cx="65" cy="65" r={normalizedRadius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
        />
      </svg>

      {/* Center Value Display */}
      <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 800, color }}>
          {score}%
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }} className="font-mono">
          {isFake ? 'AI LIKELIHOOD' : 'LIKELY REAL'}
        </span>
      </div>
    </div>
  );
};
