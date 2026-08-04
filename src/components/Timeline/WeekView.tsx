import React, { useMemo } from 'react';
import { Event } from '../../types';
import { getCategoryColor, getCategoryLabel } from '../../utils/colorHelpers';
import {
  addDays,
  formatDate,
  formatWeekRange,
  getWeekDays,
  inclusiveDayCount,
  isEventActiveOn,
  isSameDay,
} from '../../utils/dateHelpers';

interface WeekViewProps {
  events: Event[];
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  onDaySelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeekView: React.FC<WeekViewProps> = ({
  events,
  anchorDate,
  onAnchorDateChange,
  onDaySelect,
  onEventSelect,
}) => {
  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);

  // Every campaign touching the week, earliest first, so the rows keep a
  // stable order as the user steps from week to week.
  const weekCampaigns = useMemo(() => {
    return events
      .filter(event => weekDays.some(day => isEventActiveOn(event, day)))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.title.localeCompare(b.title));
  }, [events, weekDays]);

  const countsByDay = useMemo(
    () => weekDays.map(day => events.filter(event => isEventActiveOn(event, day)).length),
    [events, weekDays]
  );

  const today = new Date();
  const todayIndex = weekDays.findIndex(day => isSameDay(day, today));

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(101,179,174,0.15)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnchorDateChange(addDays(weekDays[0], -7))}
            className="px-3 py-1.5 rounded-lg mantle-frosted-light text-[#65B3AE] font-bold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
            title="Previous week"
          >
            ←
          </button>
          <button
            onClick={() => onAnchorDateChange(new Date())}
            className="px-3 py-1.5 rounded-lg mantle-frosted-light text-[#65B3AE] text-sm font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
            title="Jump to the current week"
          >
            Today
          </button>
          <button
            onClick={() => onAnchorDateChange(addDays(weekDays[0], 7))}
            className="px-3 py-1.5 rounded-lg mantle-frosted-light text-[#65B3AE] font-bold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
            title="Next week"
          >
            →
          </button>
        </div>

        <h2 className="text-lg font-bold text-white">
          {formatWeekRange(weekDays[0], weekDays[6])}
          <span className="text-[#65B3AE] ml-2">{weekDays[6].getFullYear()}</span>
        </h2>

        <p className="text-xs text-[#65B3AE]">
          {weekCampaigns.length} campaign{weekCampaigns.length === 1 ? '' : 's'} active this week
        </p>
      </div>

      {/* Day headers */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const count = countsByDay[index];
            const isToday = index === todayIndex;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDaySelect(day)}
                title={`${formatDate(day)} · ${count} active campaign${count === 1 ? '' : 's'} — click for details`}
                className={`rounded-lg py-2 transition-all border ${
                  isToday
                    ? 'bg-[rgba(101,179,174,0.15)] border-[#65B3AE]'
                    : 'border-transparent hover:bg-[rgba(101,179,174,0.08)] hover:border-[rgba(101,179,174,0.25)]'
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-wide text-[#7FD4D0] opacity-60">
                  {DAY_NAMES[index]}
                </span>
                <span className={`block text-xl font-bold ${isToday ? 'text-white' : 'text-[#7FD4D0]'}`}>
                  {day.getDate()}
                </span>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    count > 0
                      ? 'bg-[#65B3AE] text-[#050D20]'
                      : 'text-[rgba(127,212,208,0.4)] border border-[rgba(127,212,208,0.2)]'
                  }`}
                >
                  {count > 0 ? `${count} active` : 'none'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign rows: each bar covers every day the campaign is active */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {weekCampaigns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-sm text-[rgba(101,179,174,0.7)]">No campaigns are active this week.</p>
            <p className="text-xs text-[rgba(101,179,174,0.45)] mt-1">
              Use ← → to step through weeks, or Today to come back.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {weekCampaigns.map((campaign) => {
              const startIndex = weekDays.findIndex(day => isEventActiveOn(campaign, day));
              const endIndex = weekDays.reduce(
                (last, day, i) => (isEventActiveOn(campaign, day) ? i : last),
                startIndex
              );
              const continuesBefore = isEventActiveOn(campaign, addDays(weekDays[0], -1));
              const continuesAfter = isEventActiveOn(campaign, addDays(weekDays[6], 1));
              const color = getCategoryColor(campaign.category);
              const totalDays = campaign.endDate ? inclusiveDayCount(campaign.startDate, campaign.endDate) : 1;

              return (
                <div key={campaign.id} className="grid grid-cols-7 gap-1">
                  <button
                    onClick={() => onEventSelect(campaign)}
                    style={{
                      gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
                      backgroundColor: `${color}26`,
                      borderLeft: `3px solid ${continuesBefore ? 'transparent' : color}`,
                      borderRight: `3px solid ${continuesAfter ? 'transparent' : color}`,
                    }}
                    title={`${campaign.title} · ${formatDate(campaign.startDate)}${campaign.endDate ? ` → ${formatDate(campaign.endDate)}` : ''} — click for details`}
                    className="rounded-lg px-3 py-2 text-left transition-all hover:brightness-125 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {continuesBefore && <span className="text-xs flex-shrink-0" style={{ color }}>‹</span>}
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-bold text-white truncate">{campaign.title}</span>
                      {/* A one-column bar is too narrow for both; the title wins. */}
                      {endIndex > startIndex && (
                        <span
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ backgroundColor: `${color}33`, color }}
                        >
                          {campaign.type}
                        </span>
                      )}
                      {continuesAfter && <span className="text-xs flex-shrink-0 ml-auto" style={{ color }}>›</span>}
                    </div>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color }}>
                      {getCategoryLabel(campaign.category)}
                      {totalDays > 1 && (
                        <span className="text-[rgba(127,212,208,0.7)]">
                          {' · '}{formatDate(campaign.startDate)} → {campaign.endDate ? formatDate(campaign.endDate) : ''} ({totalDays} days)
                        </span>
                      )}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeekView;
