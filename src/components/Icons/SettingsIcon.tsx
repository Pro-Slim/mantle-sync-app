import React from 'react';

interface SettingsIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export const SettingsIcon: React.FC<SettingsIconProps> = ({
  size = 24,
  className = '',
  fill = '#65B3AE',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <filter id="settingsGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Radial segments inspired by Mantle brand imagery */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 360) / 12;
      const rad = (angle * Math.PI) / 180;
      const x = 12 + Math.cos(rad) * 9;
      const y = 12 + Math.sin(rad) * 9;
      const nextRad = ((angle + 30) * Math.PI) / 180;
      const nextX = 12 + Math.cos(nextRad) * 9;
      const nextY = 12 + Math.sin(nextRad) * 9;

      return (
        <g key={i}>
          <path
            d={`M 12 12 L ${x} ${y} L ${nextX} ${nextY} Z`}
            fill={i % 2 === 0 ? fill : `${fill}40`}
            filter="url(#settingsGlow)"
          />
        </g>
      );
    })}

    {/* Center circle */}
    <circle cx="12" cy="12" r="4" fill={fill} filter="url(#settingsGlow)" opacity="0.8" />
  </svg>
);

export default SettingsIcon;
