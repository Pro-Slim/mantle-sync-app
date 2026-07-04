import React from 'react';

interface TodayMarkerProps {
  x: number;
  y: number;
  lineHeight: number;
}

const TodayMarker: React.FC<TodayMarkerProps> = ({ x, y, lineHeight }) => {
  return (
    <g>
      {/* Vertical line */}
      <line
        x1={x}
        y1={y - lineHeight / 2 + 50}
        x2={x}
        y2={y + lineHeight / 2 - 50}
        stroke="#FFB703"
        strokeWidth={3}
        opacity={0.8}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(255, 183, 3, 0.6))',
        }}
      />

      {/* TODAY label */}
      <g>
        <rect
          x={x - 25}
          y={y - 25}
          width={50}
          height={24}
          rx={4}
          fill="#FFB703"
        />
        <text
          x={x}
          y={y - 8}
          textAnchor="middle"
          className="text-xs font-bold fill-gray-900"
        >
          TODAY
        </text>
      </g>
    </g>
  );
};

export default TodayMarker;
