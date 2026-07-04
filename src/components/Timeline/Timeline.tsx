import React, { useState, useRef, useEffect } from 'react';
import { Event } from '../../types';
import { getPositionFromDate, getMonthLabel, getDayOfYear, getDaysInYear } from '../../utils/dateHelpers';
import EventNode from './EventNode';
import TodayMarker from './TodayMarker';
import EventCard from './EventCard';

interface TimelineProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onEventUpdate?: (event: Event) => void;
  onEventDelete?: (eventId: string) => void;
  isDarkMode?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick, onEventUpdate, onEventDelete, isDarkMode = false }) => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const TIMELINE_HEIGHT = 400;
  const LINE_Y = 200;
  const PADDING = 60;
  const TIMELINE_WIDTH = 1400;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timelineRef.current && !timelineRef.current.contains(e.target as Node)) {
        setSelectedEventId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNodeClick = (event: Event) => {
    setSelectedEventId(event.id);
    onEventClick?.(event);
  };

  const monthPositions = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(2026, i, 1);
    return {
      month: getMonthLabel(i),
      x: getPositionFromDate(monthStart, TIMELINE_WIDTH),
    };
  });

  return (
    <div ref={timelineRef} className={`w-full overflow-x-auto py-8 px-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="relative" style={{ minWidth: `${TIMELINE_WIDTH + PADDING * 2}px` }}>
        {/* SVG Timeline */}
        <svg
          ref={svgRef}
          width={TIMELINE_WIDTH + PADDING * 2}
          height={TIMELINE_HEIGHT}
          className="relative"
          style={{ overflow: 'visible', cursor: 'default', pointerEvents: 'auto' }}
        >
          {/* Main timeline line */}
          <line
            x1={PADDING}
            y1={LINE_Y}
            x2={TIMELINE_WIDTH + PADDING}
            y2={LINE_Y}
            stroke={isDarkMode ? '#4b5563' : '#e5e7eb'}
            strokeWidth={2}
          />

          {/* Month markers */}
          {monthPositions.map((pos, idx) => (
            <g key={idx}>
              <circle
                cx={pos.x + PADDING}
                cy={LINE_Y}
                r={4}
                fill={isDarkMode ? '#6b7280' : '#d1d5db'}
              />
              <text
                x={pos.x + PADDING}
                y={LINE_Y + 35}
                textAnchor="middle"
                className={`text-xs font-semibold ${isDarkMode ? 'fill-gray-400' : 'fill-gray-600'}`}
              >
                {pos.month}
              </text>
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

        {/* Floating event cards */}
        <div className="absolute top-0 left-0 w-full pointer-events-none z-50" style={{ height: '100%' }}>
          {events.map((event) => {
            const isActive = hoveredEventId === event.id || selectedEventId === event.id;
            const x = getPositionFromDate(event.startDate, TIMELINE_WIDTH) + PADDING;

            return (
              isActive && (
                <div
                  key={event.id}
                  className="absolute"
                  style={{
                    left: `${x - 120}px`,
                    top: event.startDate.getDate() % 2 === 0 ? '20px' : 'auto',
                    bottom: event.startDate.getDate() % 2 === 0 ? 'auto' : '60px',
                    pointerEvents: 'auto',
                    zIndex: 50,
                  }}
                >
                  <EventCard
                    event={event}
                    isActive={isActive}
                    onClose={() => setSelectedEventId(null)}
                    onEdit={(updatedEvent) => {
                      onEventUpdate?.(updatedEvent);
                    }}
                    onDelete={() => {
                      onEventDelete?.(event.id);
                      setSelectedEventId(null);
                    }}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
