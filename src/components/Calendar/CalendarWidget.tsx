import React, { useMemo, useRef, useState } from 'react';
import { CalendarReminder, Event } from '../../types';
import { getCategoryColor } from '../../utils/colorHelpers';
import {
  addDays,
  formatDate,
  formatWeekRange,
  getWeekDays,
  isEventActiveOn,
  isSameDay,
} from '../../utils/dateHelpers';

const DOUBLE_CLICK_WINDOW_MS = 250;
const MAX_WEEK_BARS = 4;

type CalendarView = 'month' | 'week';

interface CalendarWidgetProps {
  onDateSelect?: (date: Date) => void;
  onDateDoubleClick?: (date: Date) => void;
  onDayCampaignsSelect?: (date: Date) => void;
  events?: Event[];
  reminders?: CalendarReminder[];
  onDeleteReminder?: (reminderId: string) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  onDateSelect,
  onDateDoubleClick,
  onDayCampaignsSelect,
  events = [],
  reminders = [],
  onDeleteReminder,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [hoveredReminderDate, setHoveredReminderDate] = useState<string | null>(null);
  const pendingClickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Monday-first index: native getDay() is 0=Sun..6=Sat, shift so 0=Mon..6=Sun.
  const getFirstDayOfMonth = (date: Date) => {
    return (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;
  };

  const goBack = () => {
    setCurrentDate(view === 'week'
      ? addDays(currentDate, -7)
      : new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goForward = () => {
    setCurrentDate(view === 'week'
      ? addDays(currentDate, 7)
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // A native dblclick fires two click events first, so delay the single-click
  // action just long enough to be cancelled if a double-click follows.
  const handleDayClick = (date: Date, onSingleClick?: (date: Date) => void) => {
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current);
    }
    pendingClickRef.current = setTimeout(() => {
      pendingClickRef.current = null;
      onSingleClick?.(date);
    }, DOUBLE_CLICK_WINDOW_MS);
  };

  const handleDayDoubleClick = (date: Date) => {
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current);
      pendingClickRef.current = null;
    }
    onDateDoubleClick?.(date);
  };

  const getRemindersForDate = (date: Date): CalendarReminder[] => {
    return reminders.filter(r => isSameDay(new Date(r.date), date));
  };

  const getCampaignsForDate = (date: Date): Event[] => {
    return events.filter(event => isEventActiveOn(event, date));
  };

  const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Every campaign touching the week, earliest first, so the bars below the day
  // row read as a stable stack from week to week.
  const weekCampaigns = useMemo(() => {
    return events
      .filter(event => weekDays.some(day => isEventActiveOn(event, day)))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.title.localeCompare(b.title));
  }, [events, weekDays]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() &&
                        today.getMonth() === currentDate.getMonth();

  const renderReminderTooltip = (key: string, dayReminders: CalendarReminder[]) => {
    if (hoveredReminderDate !== key || dayReminders.length === 0) return null;
    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 whitespace-nowrap">
        <div className="bg-[rgba(5,13,32,0.95)] border border-[#65B3AE] rounded-lg p-2 shadow-lg backdrop-filter backdrop-blur-sm">
          {dayReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-2 text-xs text-[#7FD4D0] mb-1 last:mb-0">
              <span className="text-[10px] text-[#65B3AE]">•</span>
              <span>{reminder.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteReminder?.(reminder.id);
                }}
                className="ml-2 text-[#ff6b6b] hover:text-[#ff8787] transition text-xs font-bold"
                title="Delete reminder"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mantle-frosted rounded-xl p-3 w-full max-w-xs" style={{
      border: '1px solid rgba(101, 179, 174, 0.3)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(101, 179, 174, 0.15), inset 0 1px 1px rgba(101, 179, 174, 0.1)',
    }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[rgba(101,179,174,0.1)]">
        <button
          onClick={goBack}
          className="font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition text-sm"
          title={view === 'week' ? 'Previous week' : 'Previous month'}
        >
          ←
        </button>
        <h3 className="font-bold text-white text-xs text-center">
          {view === 'week'
            ? formatWeekRange(weekDays[0], weekDays[6])
            : monthNames[currentDate.getMonth()]}
          {' '}
          <span className="text-[#65B3AE] text-xs">
            {view === 'week' ? weekDays[6].getFullYear() : currentDate.getFullYear()}
          </span>
        </h3>
        <button
          onClick={goForward}
          className="font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition text-sm"
          title={view === 'week' ? 'Next week' : 'Next month'}
        >
          →
        </button>
      </div>

      {/* View toggle */}
      <div data-tutorial="calendar-view-toggle" className="flex gap-1 mb-2 p-0.5 rounded-lg bg-[rgba(101,179,174,0.08)]">
        {(['week', 'month'] as CalendarView[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold capitalize transition ${
              view === mode
                ? 'bg-[#65B3AE] text-[#050D20]'
                : 'text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]'
            }`}
            title={mode === 'week' ? 'Weekly layout with active campaign counts' : 'Monthly layout'}
          >
            {mode}
          </button>
        ))}
      </div>

      {view === 'month' ? (
        <>
          {/* Day names */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[10px] font-bold text-[#7FD4D0] opacity-60">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {days.map((day, idx) => {
              const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
              const dayReminders = date ? getRemindersForDate(date) : [];
              const key = date ? dateKey(date) : `empty-${idx}`;
              const hasReminders = dayReminders.length > 0;

              return (
                <div key={idx} className="relative">
                  <button
                    onClick={() => date && handleDayClick(date, onDateSelect)}
                    onDoubleClick={() => date && handleDayDoubleClick(date)}
                    onMouseEnter={() => hasReminders && setHoveredReminderDate(key)}
                    onMouseLeave={() => setHoveredReminderDate(null)}
                    title={day ? 'Click: go to date on timeline · Double-click: add reminder' : undefined}
                    className={`
                      w-full text-xs font-semibold py-1 rounded transition relative
                      ${day === null ? 'text-transparent' : ''}
                      ${day === today.getDate() && isCurrentMonth
                        ? 'bg-[#65B3AE] text-[#050D20] font-bold hover:bg-[#7FD4D0] mantle-glow-pulse'
                        : day
                        ? 'hover:bg-[rgba(101,179,174,0.2)] text-[#7FD4D0] cursor-pointer'
                        : ''
                      }
                    `}
                  >
                    {day}
                    {hasReminders && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayReminders.slice(0, 2).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-[#65B3AE]"></div>
                        ))}
                      </div>
                    )}
                  </button>

                  {renderReminderTooltip(key, dayReminders)}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Week days with active campaign counts */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekDays.map((date) => {
              const dayReminders = getRemindersForDate(date);
              const key = dateKey(date);
              const campaignCount = getCampaignsForDate(date).length;
              const isToday = isSameDay(date, today);

              return (
                <div key={key} className="relative">
                  <button
                    onClick={() => handleDayClick(date, onDayCampaignsSelect)}
                    onDoubleClick={() => handleDayDoubleClick(date)}
                    onMouseEnter={() => dayReminders.length > 0 && setHoveredReminderDate(key)}
                    onMouseLeave={() => setHoveredReminderDate(null)}
                    title={`${formatDate(date)} · ${campaignCount} active campaign${campaignCount === 1 ? '' : 's'} — Click: view campaigns · Double-click: add reminder`}
                    className={`w-full py-1 rounded transition cursor-pointer ${
                      isToday
                        ? 'bg-[rgba(101,179,174,0.25)] ring-1 ring-[#65B3AE]'
                        : 'hover:bg-[rgba(101,179,174,0.15)]'
                    }`}
                  >
                    <span className="block text-[9px] font-bold text-[#7FD4D0] opacity-60">
                      {dayNames[(date.getDay() + 6) % 7]}
                    </span>
                    <span className={`block text-xs font-bold ${isToday ? 'text-white' : 'text-[#7FD4D0]'}`}>
                      {date.getDate()}
                    </span>
                    <span
                      className={`mx-auto mt-0.5 flex items-center justify-center w-5 h-4 rounded-full text-[9px] font-bold ${
                        campaignCount > 0
                          ? 'bg-[#65B3AE] text-[#050D20]'
                          : 'text-[rgba(127,212,208,0.35)]'
                      }`}
                    >
                      {campaignCount > 0 ? campaignCount : '–'}
                    </span>
                    {dayReminders.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayReminders.slice(0, 2).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-[#FFB703]"></div>
                        ))}
                      </div>
                    )}
                  </button>

                  {renderReminderTooltip(key, dayReminders)}
                </div>
              );
            })}
          </div>

          {/* Campaign bars: one row per campaign, spanning every day it is active */}
          <div className="pt-2 border-t border-[rgba(101,179,174,0.1)] space-y-0.5">
            {weekCampaigns.length === 0 && (
              <p className="text-[10px] text-[rgba(127,212,208,0.5)] text-center py-2">
                No campaigns active this week
              </p>
            )}
            {weekCampaigns.slice(0, MAX_WEEK_BARS).map((campaign) => {
              const startIndex = weekDays.findIndex(day => isEventActiveOn(campaign, day));
              const endIndex = weekDays.reduce(
                (last, day, i) => (isEventActiveOn(campaign, day) ? i : last),
                startIndex
              );
              const continuesBefore = isEventActiveOn(campaign, addDays(weekDays[0], -1));
              const continuesAfter = isEventActiveOn(campaign, addDays(weekDays[6], 1));
              const color = getCategoryColor(campaign.category);

              return (
                <div key={campaign.id} className="grid grid-cols-7 gap-0.5">
                  <button
                    onClick={() => onDayCampaignsSelect?.(weekDays[startIndex])}
                    style={{
                      gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
                      backgroundColor: `${color}26`,
                      borderLeft: `2px solid ${continuesBefore ? 'transparent' : color}`,
                      color,
                    }}
                    title={`${campaign.title} · ${formatDate(campaign.startDate)}${campaign.endDate ? ` → ${formatDate(campaign.endDate)}` : ''}`}
                    className="truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold hover:brightness-125 transition"
                  >
                    {continuesBefore ? '‹ ' : ''}{campaign.title}{continuesAfter ? ' ›' : ''}
                  </button>
                </div>
              );
            })}
            {weekCampaigns.length > MAX_WEEK_BARS && (
              <p className="text-[9px] text-[rgba(127,212,208,0.6)] pt-0.5">
                +{weekCampaigns.length - MAX_WEEK_BARS} more — click a day to see all
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarWidget;
