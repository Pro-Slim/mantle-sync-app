import React, { useState, useEffect } from 'react';
import { Event } from '../types';

interface EventCountdownClockProps {
  event: Event;
  countdownType: 'endDate' | 'rewardDelivery';
  onDelete: () => void;
  onTypeChange: (type: 'endDate' | 'rewardDelivery') => void;
  isDarkMode?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isCountingUp: boolean; // True if the date has passed (counting forward instead)
}

const EventCountdownClock: React.FC<EventCountdownClockProps> = ({
  event,
  countdownType,
  onDelete,
  onTypeChange,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCountingUp: false,
  });

  const getTargetDate = (): Date | null => {
    switch (countdownType) {
      case 'endDate':
        return event.endDate || null;
      case 'rewardDelivery':
        return event.rewards?.realizedDeliveryDate ||
          event.rewards?.defaultDeliveryDate ||
          null;
      default:
        return null;
    }
  };

  const getCountdownLabel = (): string => {
    switch (countdownType) {
      case 'endDate':
        return 'Event Ends';
      case 'rewardDelivery':
        return 'Rewards Deliver';
      default:
        return '';
    }
  };

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetDate = getTargetDate();
      if (!targetDate) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isCountingUp: false,
        });
        return;
      }

      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const isCountingUp = diff < 0;

      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, isCountingUp });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [event, countdownType]);

  const targetDate = getTargetDate();
  if (!targetDate) {
    return null;
  }

  const isOverdue = timeRemaining.isCountingUp;
  const statusColor = isOverdue ? '#FF6B6B' : '#65B3AE';
  const statusColorLight = isOverdue ? '#FF9999' : '#7FD4D0';
  const pulseKeyframes = `
    @keyframes count-pulse-${event.id} {
      0%, 100% {
        text-shadow: 0 0 8px ${statusColor}80, 0 0 16px ${statusColor}40;
      }
      50% {
        text-shadow: 0 0 16px ${statusColor}, 0 0 32px ${statusColor}80;
      }
    }
  `;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        className="mantle-frosted rounded-xl px-6 py-5 flex flex-col items-center min-w-max group hover:mantle-glow-pulse transition-all"
        style={{
          width: '320px',
          border: `1px solid rgba(101, 179, 174, 0.3)`,
          boxShadow: `0 12px 40px rgba(0, 0, 0, 0.5),
                      0 0 20px rgba(${isOverdue ? '255, 107, 107' : '101, 179, 174'}, ${isOverdue ? '0.3' : '0.2'}),
                      inset 0 1px 1px rgba(101, 179, 174, 0.15)`,
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header with icon */}
        <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-[rgba(101,179,174,0.1)]">
          {/* Event Title */}
          <h3
            className="text-white font-bold text-sm flex-1 truncate"
            title={event.title}
          >
            {event.title.substring(0, 20)}
            {event.title.length > 20 ? '...' : ''}
          </h3>
          {/* Status indicator */}
          <div
            className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}80`,
            }}
          />
        </div>

        {/* Countdown Display - Animated */}
        <div
          className="font-mono font-bold text-3xl mb-4 text-center tabular-nums"
          style={{
            color: statusColorLight,
            animation: `count-pulse-${event.id} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          }}
        >
          {isOverdue && <span className="text-[#FF6B6B]">+</span>}
          <span>{timeRemaining.days.toString().padStart(2, '0')}</span>
          <span className="text-[rgba(255,255,255,0.3)] mx-1">d</span>
          <span>{timeRemaining.hours.toString().padStart(2, '0')}</span>
          <span className="text-[rgba(255,255,255,0.3)] mx-1">h</span>
          <span>{timeRemaining.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[rgba(255,255,255,0.3)] mx-1">m</span>
        </div>

        {/* Label */}
        <p className="text-[#7FD4D0] text-xs mb-4 font-medium opacity-80">
          {getCountdownLabel()}
        </p>

        {/* Type Selector - Mantle styled */}
        <select
          value={countdownType}
          onChange={(e) =>
            onTypeChange(e.target.value as 'endDate' | 'rewardDelivery')
          }
          className="w-full px-3 py-2 text-xs border rounded-lg mb-3 font-semibold bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.3)] text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)] transition-all"
        >
          <option value="endDate">Event Ends</option>
          {event.rewards && (
            <option value="rewardDelivery">Rewards Delivery</option>
          )}
        </select>

        {/* Delete Button - Mantle themed */}
        <button
          onClick={onDelete}
          className="w-full px-3 py-2 bg-[rgba(255,107,107,0.2)] text-[#FF9999] text-xs font-semibold rounded-lg hover:bg-[rgba(255,107,107,0.3)] border border-[rgba(255,107,107,0.3)] transition-all"
        >
          Remove
        </button>

        {/* Overdue Indicator */}
        {isOverdue && (
          <div className="mt-3 text-xs text-[#FF6B6B] font-bold px-3 py-1 rounded-full bg-[rgba(255,107,107,0.15)] border border-[rgba(255,107,107,0.3)]">
            ⚠ Overdue
          </div>
        )}
      </div>
    </>
  );
};

export default EventCountdownClock;
