import React from 'react';
import { Event } from '../../types';
import { playEventHoverSound } from '../../utils/soundEffects';

interface EventNodeProps {
  event: Event;
  x: number;
  y: number;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onHoverWithDelay?: (id: string | null) => void;
  onClick: () => void;
}

const EventNode: React.FC<EventNodeProps> = ({
  event,
  x,
  y,
  isHovered,
  isSelected,
  onHover,
  onHoverWithDelay,
  onClick,
}) => {
  const nodeRadius = isHovered || isSelected ? 11 : 8;
  const glowRadius = isSelected ? 28 : isHovered ? 20 : 14;

  // Create unique IDs for this node's animations
  const glowPulseId = `glow-pulse-${event.id}`;
  const redRingPulseId = `pulse-red-${event.id}`;
  const mantleGlowId = `mantle-glow-${event.id}`;

  const mantleColor = '#65B3AE';
  const mantleLightColor = '#7FD4D0';

  return (
    <>
      <style>{`
        @keyframes glow-pulse-animation {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes mantle-glow-ring {
          0%, 100% {
            r: 14;
            stroke-opacity: 1;
            filter: drop-shadow(0 0 8px rgba(101, 179, 174, 0.8));
          }
          50% {
            r: 20;
            stroke-opacity: 0.3;
            filter: drop-shadow(0 0 16px rgba(101, 179, 174, 0.4));
          }
        }
        #${glowPulseId} {
          animation: glow-pulse-animation 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        #${redRingPulseId} {
          animation: mantle-glow-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        #${mantleGlowId} {
          filter: drop-shadow(0 0 12px rgba(101, 179, 174, 0.6)) drop-shadow(0 0 24px rgba(101, 179, 174, 0.3));
        }
      `}</style>
      <g style={{ cursor: 'pointer' }} pointerEvents="auto">
        {/* Invisible hit area */}
        <circle
          cx={x}
          cy={y}
          r={20}
          fill="transparent"
          onMouseEnter={() => {
            playEventHoverSound();
            onHoverWithDelay ? onHoverWithDelay(event.id) : onHover(event.id);
          }}
          onMouseLeave={() => (onHoverWithDelay ? onHoverWithDelay(null) : onHover(null))}
          onClick={onClick}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        />

        {/* Outer glow halo (always present, subtle) */}
        <circle
          cx={x}
          cy={y}
          r={12}
          fill={mantleColor}
          opacity="0.2"
          style={{ pointerEvents: 'none', transition: 'opacity 0.3s ease' }}
        />

        {/* Enhanced glow effect on hover/select */}
        {(isHovered || isSelected) && (
          <circle
            id={glowPulseId}
            cx={x}
            cy={y}
            r={glowRadius}
            fill={mantleColor}
            style={{
              pointerEvents: 'none',
              transition: isSelected ? 'none' : 'all 0.2s ease',
            }}
          />
        )}

        {/* Animated ring for interactive state */}
        {isSelected && (
          <circle
            id={redRingPulseId}
            cx={x}
            cy={y}
            r={14}
            fill="none"
            stroke={mantleLightColor}
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Main node - Mantle branded */}
        <circle
          id={isSelected ? mantleGlowId : undefined}
          cx={x}
          cy={y}
          r={nodeRadius}
          fill={mantleColor}
          style={{
            transition: 'all 0.2s ease',
            pointerEvents: 'none',
            opacity: 0.9,
          }}
        />

        {/* Inner highlight */}
        <circle
          cx={x - 2}
          cy={y - 2}
          r={nodeRadius * 0.4}
          fill={mantleLightColor}
          opacity="0.8"
          style={{ pointerEvents: 'none' }}
        />

        {/* Tooltip on hover - Mantle styled */}
        {(isHovered || isSelected) && (
          <g>
            <rect
              x={x - 65}
              y={y - 45}
              width="130"
              height="20"
              rx="4"
              fill="#050D20"
              opacity="0.95"
              style={{ pointerEvents: 'none' }}
            />
            <rect
              x={x - 65}
              y={y - 45}
              width="130"
              height="20"
              rx="4"
              fill="none"
              stroke={mantleColor}
              strokeWidth="1"
              opacity="0.4"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={x}
              y={y - 28}
              textAnchor="middle"
              className="text-xs font-bold"
              fill={mantleLightColor}
              style={{
                pointerEvents: 'none',
                textShadow: `0 0 8px ${mantleColor}`,
              }}
            >
              {event.title.substring(0, 16)}
              {event.title.length > 16 ? '...' : ''}
            </text>
          </g>
        )}
      </g>
    </>
  );
};

export default EventNode;
