import React from 'react';
import { Event } from '../../types';
import { getCategoryColor } from '../../utils/colorHelpers';

interface EventNodeProps {
  event: Event;
  x: number;
  y: number;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}

const EventNode: React.FC<EventNodeProps> = ({
  event,
  x,
  y,
  isHovered,
  isSelected,
  onHover,
  onClick,
}) => {
  const color = getCategoryColor(event.category);
  const nodeRadius = isHovered || isSelected ? 10 : 8;
  const glowRadius = isSelected ? 20 : isHovered ? 16 : 0;

  return (
    <g
      style={{ cursor: 'pointer' }}
      pointerEvents="auto"
    >
      {/* Invisible hit area */}
      <circle
        cx={x}
        cy={y}
        r={18}
        fill="transparent"
        onMouseEnter={() => onHover(event.id)}
        onMouseLeave={() => onHover(null)}
        onClick={onClick}
        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
      />

      {/* Glow effect */}
      {glowRadius > 0 && (
        <circle
          cx={x}
          cy={y}
          r={glowRadius}
          fill={color}
          opacity={isSelected ? 0.3 : 0.15}
          style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }}
        />
      )}

      {/* Main node */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill={color}
        style={{
          transition: 'all 0.2s ease',
          filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip on hover */}
      {(isHovered || isSelected) && (
        <g>
          <text
            x={x}
            y={y - 30}
            textAnchor="middle"
            className="text-xs font-bold fill-gray-900"
            style={{
              backgroundColor: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            {event.title.substring(0, 15)}
            {event.title.length > 15 ? '...' : ''}
          </text>
        </g>
      )}
    </g>
  );
};

export default EventNode;
