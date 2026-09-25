import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAY_NAMES,
  DutySlot,
  IDLE_COLOR,
  STEWARDS,
  dutyAt,
  slotColor,
  weeklyHours,
  slotLabel,
} from '../../constants/stewards';
import { formatUtcOffset, shiftHourLabel } from '../../utils/dateHelpers';
import { useCurrentDuty } from '../../hooks/useCurrentDuty';

const ROW_HEIGHT = 30;
const GUTTER = 76;
const ZONE_STORAGE_KEY = 'mantle-sync-duty-zone';

interface Zone {
  id: string;
  minutes: number;
}

// The printed rota carries UTC-6 and UTC-3 beside UTC because that is where the
// stewards sit; Local is added so nobody has to do the arithmetic themselves.
const buildZones = (): Zone[] => [
  { id: 'utc', minutes: 0 },
  { id: 'utc-3', minutes: -180 },
  { id: 'utc-6', minutes: -360 },
  { id: 'local', minutes: -new Date().getTimezoneOffset() },
];

const readStoredZone = (): string => {
  try {
    return localStorage.getItem(ZONE_STORAGE_KEY) || 'utc';
  } catch {
    return 'utc';
  }
};

const storeZone = (id: string): void => {
  try {
    localStorage.setItem(ZONE_STORAGE_KEY, id);
  } catch {
    // A blocked localStorage costs the remembered zone, not the rota.
  }
};

const pad = (n: number): string => String(n).padStart(2, '0');
const hourRangeUtc = (hour: number): string => `${pad(hour)}:00-${pad((hour + 1) % 24)}:00 UTC`;

const StewardDutyCalendar: React.FC = () => {
  const duty = useCurrentDuty();
  const [zoneId, setZoneId] = useState<string>(readStoredZone);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  const zones = useMemo(buildZones, []);
  const zone = zones.find((z) => z.id === zoneId) ?? zones[0];
  const totals = useMemo(weeklyHours, []);

  const utcNow = duty.now.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // The day header sits outside the scroller, so its seven columns are the
  // scrollbar's width wider than the rows beneath unless that width is padded
  // back on. Measured rather than assumed: it is 10px on the styled desktop
  // scrollbar and 0 wherever the scrollbar overlays.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setScrollbarWidth(el.offsetWidth - el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Land on the current hour rather than at midnight, so the cursor is on
  // screen the moment the view opens. Snapped to a row so the grid never opens
  // with a half-cut row at the top.
  useEffect(() => {
    if (hasScrolled.current || !scrollRef.current) return;
    const el = scrollRef.current;
    if (el.clientHeight === 0) return;
    const centred = (duty.utcHour + 0.5) * ROW_HEIGHT - el.clientHeight / 2;
    const maxScroll = Math.max(0, 24 * ROW_HEIGHT - el.clientHeight);
    el.scrollTop = Math.min(maxScroll, Math.max(0, Math.round(centred / ROW_HEIGHT) * ROW_HEIGHT));
    hasScrolled.current = true;
  }, [duty.utcHour]);

  const onDuty = duty.slot === 'IDLE' ? null : slotLabel(duty.slot);
  const accent = slotColor(duty.slot);
  const hoursLeft = Math.floor(duty.minutesLeftInShift / 60);
  const minsLeft = duty.minutesLeftInShift % 60;
  const endsIn = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
  const cursorTop = (duty.utcHour + duty.hourFraction) * ROW_HEIGHT;
  const columns = `${GUTTER}px repeat(7, minmax(0, 1fr))`;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(101,179,174,0.15)] flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[#65B3AE] font-bold text-sm tracking-wide">STEWARD ROTA</span>
          <span
            className="font-mono text-sm text-[#7FD4D0] tabular-nums"
            title="Current UTC time. The rota is defined in UTC."
          >
            {utcNow} UTC
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}59` }}
          title={
            onDuty
              ? `${onDuty} is on duty now, until ${pad(duty.shift.endHour)}:00 UTC`
              : 'No steward is rostered for this hour'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${onDuty ? 'animate-pulse' : ''}`}
            style={{ background: accent }}
          />
          <span className="text-xs font-semibold" style={{ color: accent }}>
            {onDuty ? `${onDuty} on duty` : 'Idle hour'}
          </span>
          <span className="text-xs text-[#7FD4D0] opacity-70">
            {onDuty ? `ends in ${endsIn}` : `next shift in ${endsIn}`}
          </span>
        </div>

        <div className="flex gap-1 p-0.5 rounded-lg bg-[rgba(101,179,174,0.08)]">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => {
                setZoneId(z.id);
                storeZone(z.id);
              }}
              title={`Label the hour column in ${formatUtcOffset(z.minutes)}`}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                zone.id === z.id
                  ? 'bg-[#65B3AE] text-[#050D20]'
                  : 'text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]'
              }`}
            >
              {z.id === 'local' ? 'Local' : formatUtcOffset(z.minutes)}
            </button>
          ))}
        </div>
      </div>

      {/* Day header */}
      <div
        className="grid flex-shrink-0 border-b border-[rgba(101,179,174,0.15)]"
        style={{ gridTemplateColumns: columns, paddingRight: `${scrollbarWidth}px` }}
      >
        <div className="px-2 py-2 text-[10px] font-semibold text-[#7FD4D0] opacity-60 text-right">
          {formatUtcOffset(zone.minutes)}
        </div>
        {DAY_NAMES.map((day, i) => (
          <div
            key={day}
            className={`px-2 py-2 text-center text-xs font-bold transition-colors ${
              i === duty.dayIndex ? 'text-[#65B3AE]' : 'text-[#7FD4D0] opacity-60'
            }`}
          >
            {day}
            {i === duty.dayIndex && <span className="ml-1 text-[9px] opacity-80">now</span>}
          </div>
        ))}
      </div>

      {/* Rota grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ height: `${24 * ROW_HEIGHT}px` }}>
          {Array.from({ length: 24 }, (_, hour) => {
            const { label, dayShift } = shiftHourLabel(hour, zone.minutes);
            return (
              <div
                key={hour}
                className="grid absolute left-0 right-0"
                style={{
                  top: `${hour * ROW_HEIGHT}px`,
                  height: `${ROW_HEIGHT}px`,
                  gridTemplateColumns: columns,
                }}
              >
                <div
                  className={`px-2 flex items-center justify-end gap-1 font-mono text-[11px] tabular-nums border-t border-[rgba(101,179,174,0.06)] ${
                    hour === duty.utcHour ? 'text-[#65B3AE] font-bold' : 'text-[#7FD4D0] opacity-50'
                  }`}
                  title={hourRangeUtc(hour)}
                >
                  {label}
                  {dayShift !== 0 && (
                    <span className="text-[8px] opacity-70">{dayShift > 0 ? '+1d' : '−1d'}</span>
                  )}
                </div>

                {DAY_NAMES.map((day, dayIndex) => {
                  const slot: DutySlot = dutyAt(dayIndex, hour);
                  const color = slotColor(slot);
                  const isNow = dayIndex === duty.dayIndex && hour === duty.utcHour;
                  const isToday = dayIndex === duty.dayIndex;
                  const idle = slot === 'IDLE';

                  return (
                    <div
                      key={day}
                      className="px-1 py-[2px] border-t border-[rgba(101,179,174,0.06)]"
                      style={{
                        background: isToday && !isNow ? 'rgba(101,179,174,0.04)' : undefined,
                      }}
                    >
                      <div
                        className={`h-full rounded flex items-center justify-center text-[10px] font-bold tracking-wide transition-all ${
                          isNow ? 'mantle-glow-pulse' : ''
                        }`}
                        style={{
                          background: isNow ? color : idle ? 'transparent' : `${color}1F`,
                          color: isNow ? '#050D20' : idle ? IDLE_COLOR : color,
                          border: `1px solid ${isNow ? color : 'transparent'}`,
                          opacity: idle && !isNow ? 0.45 : 1,
                        }}
                        title={`${day} ${hourRangeUtc(hour)} — ${
                          idle ? 'no steward rostered' : slotLabel(slot)
                        }`}
                      >
                        {idle ? '·' : slotLabel(slot)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Live cursor: creeps down the current hour's row as the minutes pass */}
          <div
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: `${cursorTop}px` }}
          >
            <div className="relative h-0">
              <div
                className="absolute right-0 h-[2px] -translate-y-1/2"
                style={{
                  left: `${GUTTER}px`,
                  background: '#65B3AE',
                  boxShadow: '0 0 8px rgba(101,179,174,0.9)',
                }}
              />
              <div
                className="absolute w-3 h-3 rounded-full -translate-y-1/2 mantle-glow-pulse-fast"
                style={{ left: `${GUTTER - 12}px`, background: '#65B3AE' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[rgba(101,179,174,0.15)] flex-shrink-0 flex-wrap">
        <span className="text-[10px] text-[#7FD4D0] opacity-50 uppercase tracking-wider">
          Weekly hours
        </span>
        {STEWARDS.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-xs font-semibold" style={{ color: s.color }}>
              {s.label}
            </span>
            <span className="text-xs text-[#7FD4D0] opacity-60 tabular-nums">{totals[s.id]}h</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm opacity-40" style={{ background: IDLE_COLOR }} />
          <span className="text-xs text-[#7FD4D0] opacity-60">Idle</span>
          <span className="text-xs text-[#7FD4D0] opacity-60 tabular-nums">{totals.IDLE}h</span>
        </div>
        <span className="text-[10px] text-[#7FD4D0] opacity-40 ml-auto">
          Rota is fixed in UTC; the hour column only re-labels.
        </span>
      </div>
    </div>
  );
};

export default StewardDutyCalendar;
