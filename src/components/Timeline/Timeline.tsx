import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Event } from '../../types';
import { getPositionFromDate, getMonthLabel } from '../../utils/dateHelpers';
import EventNode from './EventNode';
import TodayMarker from './TodayMarker';
import EventCard from './EventCard';

export const BASE_TIMELINE_WIDTH = 2200; // Sized so TODAY appears at middle-right of viewport
export const TIMELINE_PADDING = 60;

interface TimelineProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onEventSelect?: (event: Event | null) => void;
  onEventUpdate?: (event: Event) => void;
  onEventDelete?: (eventId: string) => void;
  onAddCountdown?: (eventId: string) => void;
  hoverEnabled?: boolean;
  zoomLevel?: number;
  timelineRef?: React.RefObject<HTMLDivElement>;
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  onEventClick,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
  onAddCountdown,
  hoverEnabled = true,
  zoomLevel = 1,
  timelineRef: externalTimelineRef
}) => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const internalTimelineRef = useRef<HTMLDivElement>(null);
  const timelineRef = externalTimelineRef || internalTimelineRef;
  const svgRef = useRef<SVGSVGElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  const TIMELINE_HEIGHT = 400;
  const LINE_Y = 200;
  const PADDING = TIMELINE_PADDING;
  const TIMELINE_WIDTH = BASE_TIMELINE_WIDTH * zoomLevel;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isEventDetailsPanel = (target as Element).closest('[data-event-details-panel]');
      if (timelineRef.current && !timelineRef.current.contains(target) && !isEventDetailsPanel) {
        setSelectedEventId(null);
        onEventSelect?.(null);
      }
    };
    // Reset drag state even when the mouse is released outside the timeline/window
    const handleGlobalMouseUp = () => setIsDragging(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleGlobalMouseUp);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [timelineRef]);

  const handleNodeClick = (event: Event) => {
    setSelectedEventId(event.id);
    onEventSelect?.(event);
    onEventClick?.(event);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.pageX,
      scrollLeft: timelineRef.current?.scrollLeft || 0
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    e.preventDefault();

    const distance = e.pageX - dragStartRef.current.x;
    timelineRef.current.scrollLeft = dragStartRef.current.scrollLeft - distance;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleHoverWithDelay = (id: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (id === null) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredEventId(null);
      }, 300);
    } else {
      setHoveredEventId(id);
    }
  };

  const handleCardHoverEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const monthPositions = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const year = 2025 + Math.floor(i / 12);
      const month = i % 12;
      const monthStart = new Date(year, month, 1);
      return {
        month: getMonthLabel(month),
        year: year === 2025 || i % 12 === 0 ? year : undefined,
        x: getPositionFromDate(monthStart, TIMELINE_WIDTH),
      };
    }), [TIMELINE_WIDTH]);

  const activeEvents = events.filter(
    (event) =>
      (hoverEnabled && hoveredEventId === event.id) ||
      selectedEventId === event.id
  );

  return (
    <div
      ref={timelineRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden px-4 bg-gradient-to-b from-[rgba(5,13,32,0.5)] via-[rgba(14,37,32,0.3)] to-[rgba(5,13,32,0.5)]"
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative h-full flex items-center" style={{ minWidth: `${TIMELINE_WIDTH + PADDING * 2}px` }}>
        {/* SVG Timeline */}
        <svg
          ref={svgRef}
          width={TIMELINE_WIDTH + PADDING * 2}
          height={TIMELINE_HEIGHT}
          className="relative"
          style={{ overflow: 'visible', cursor: 'default', pointerEvents: 'auto', filter: 'drop-shadow(0 0 20px rgba(101, 179, 174, 0.15))' }}
        >
          {/* Glow effect filter */}
          <defs>
            <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(101, 179, 174, 0.1)" />
              <stop offset="50%" stopColor="rgba(101, 179, 174, 0.4)" />
              <stop offset="100%" stopColor="rgba(101, 179, 174, 0.1)" />
            </linearGradient>
          </defs>

          {/* Main timeline line with gradient */}
          <line
            x1={PADDING}
            y1={LINE_Y}
            x2={TIMELINE_WIDTH + PADDING}
            y2={LINE_Y}
            stroke="url(#timelineGradient)"
            strokeWidth={3}
            opacity="0.8"
            filter="url(#glowEffect)"
          />

          {/* Month markers */}
          {monthPositions.map((pos, idx) => (
            <g key={idx}>
              <circle
                cx={pos.x + PADDING}
                cy={LINE_Y}
                r={5}
                fill="#65B3AE"
                opacity="0.6"
                filter="url(#glowEffect)"
              />
              <text
                x={pos.x + PADDING}
                y={LINE_Y + 30}
                textAnchor="middle"
                className="text-xs font-semibold"
                fill="#7FD4D0"
                opacity="0.8"
              >
                {pos.month}
              </text>
              {pos.year && (
                <text
                  x={pos.x + PADDING}
                  y={LINE_Y + 45}
                  textAnchor="middle"
                  className="text-xs font-bold"
                  fill="#65B3AE"
                  opacity="0.6"
                >
                  {pos.year}
                </text>
              )}
            </g>
          ))}

          {/* Event nodes */}
          {events.map((event) => (
            <EventNode
              key={event.id}
              event={event}
              x={getPositionFromDate(event.startDate, TIMELINE_WIDTH) + PADDING}
              y={LINE_Y}
              isHovered={hoveredEventId === event.id}
              isSelected={selectedEventId === event.id}
              onHover={setHoveredEventId}
              onHoverWithDelay={handleHoverWithDelay}
              onClick={() => handleNodeClick(event)}
            />
          ))}

          {/* Today marker */}
          <TodayMarker
            x={getPositionFromDate(new Date(), TIMELINE_WIDTH) + PADDING}
            y={LINE_Y}
            lineHeight={TIMELINE_HEIGHT}
          />
        </svg>

        {/* Event cards: anchored beside their node inside the scrolling content,
            capped to the visible panel height with internal scrolling */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
          {activeEvents.map((event) => {
            const x = getPositionFromDate(event.startDate, TIMELINE_WIDTH) + PADDING;

            return (
              <div
                key={event.id}
                className="absolute"
                style={{ left: `${x + 24}px`, top: '8px', bottom: '8px', pointerEvents: 'none' }}
              >
                <div
                  className="mantle-scrollbar"
                  style={{ maxHeight: '100%', overflowY: 'auto', pointerEvents: 'auto' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseEnter={handleCardHoverEnter}
                  onMouseLeave={() => handleHoverWithDelay(null)}
                >
                  <EventCard
                    event={event}
                    onClose={() => setSelectedEventId(null)}
                    onEdit={(updatedEvent) => {
                      onEventUpdate?.(updatedEvent);
                    }}
                    onDelete={() => {
                      onEventDelete?.(event.id);
                      setSelectedEventId(null);
                    }}
                    onAddCountdown={() => onAddCountdown?.(event.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
