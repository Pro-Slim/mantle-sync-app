import React from 'react';

interface TodayMarkerProps {
  x: number;
  y: number;
  lineHeight: number;
}

const markerId = 'today-pulse-marker';

const TodayMarker: React.FC<TodayMarkerProps> = ({ x, y, lineHeight }) => {

  return (
    <>
      <style>{`
        @keyframes today-pulse {
          0%, 100% {
            stroke-opacity: 1;
            filter: drop-shadow(0 0 8px rgba(101, 179, 174, 0.8)) drop-shadow(0 0 16px rgba(101, 179, 174, 0.4));
          }
          50% {
            stroke-opacity: 0.5;
            filter: drop-shadow(0 0 4px rgba(101, 179, 174, 0.4)) drop-shadow(0 0 8px rgba(101, 179, 174, 0.2));
          }
        }
        #${markerId} {
          animation: today-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <g>
        {/* Outer glow aura */}
        <line
          x1={x}
          y1={y - lineHeight / 2 + 50}
          x2={x}
          y2={y + lineHeight / 2 - 50}
          stroke="#65B3AE"
          strokeWidth={8}
          opacity="0.15"
          style={{ pointerEvents: 'none' }}
        />

        {/* Animated main line */}
        <line
          id={markerId}
          x1={x}
          y1={y - lineHeight / 2 + 50}
          x2={x}
          y2={y + lineHeight / 2 - 50}
          stroke="#65B3AE"
          strokeWidth={2.5}
          opacity="0.9"
          style={{
            pointerEvents: 'none',
          }}
        />

        {/* Accent line */}
        <line
          x1={x + 1}
          y1={y - lineHeight / 2 + 50}
          x2={x + 1}
          y2={y + lineHeight / 2 - 50}
          stroke="#7FD4D0"
          strokeWidth={1}
          opacity="0.5"
          style={{ pointerEvents: 'none' }}
        />

        {/* TODAY label - Mantle styled */}
        <g>
          {/* Background with border */}
          <rect
            x={x - 32}
            y={y - 28}
            width={64}
            height={26}
            rx={5}
            fill="#050D20"
            opacity="0.95"
            style={{ pointerEvents: 'none' }}
          />
          <rect
            x={x - 32}
            y={y - 28}
            width={64}
            height={26}
            rx={5}
            fill="none"
            stroke="#65B3AE"
            strokeWidth="1.5"
            opacity="0.6"
            style={{ pointerEvents: 'none' }}
          />

          {/* Decorative accent bars */}
          <line
            x1={x - 28}
            y1={y - 28}
            x2={x - 24}
            y2={y - 28}
            stroke="#7FD4D0"
            strokeWidth="2"
            opacity="0.8"
            style={{ pointerEvents: 'none' }}
          />
          <line
            x1={x + 24}
            y1={y - 28}
            x2={x + 28}
            y2={y - 28}
            stroke="#7FD4D0"
            strokeWidth="2"
            opacity="0.8"
            style={{ pointerEvents: 'none' }}
          />

          {/* Text */}
          <text
            x={x}
            y={y - 10}
            textAnchor="middle"
            className="text-xs font-bold"
            fill="#7FD4D0"
            style={{
              pointerEvents: 'none',
              textShadow: `0 0 4px rgba(101, 179, 174, 0.6)`,
              letterSpacing: '0.5px',
            }}
          >
            TODAY
          </text>
        </g>

        {/* Subtle glow dots */}
        <circle
          cx={x}
          cy={y - lineHeight / 2 + 50}
          r="3"
          fill="#65B3AE"
          opacity="0.6"
          style={{ pointerEvents: 'none' }}
        />
        <circle
          cx={x}
          cy={y + lineHeight / 2 - 50}
          r="3"
          fill="#65B3AE"
          opacity="0.6"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    </>
  );
};

export default TodayMarker;
