import { useEffect, useState } from 'react';
import { DutySlot, HOURS_IN_WEEK, Shift, dutyAt, shiftAround } from '../constants/stewards';
import { getUtcDayIndex, getUtcHour, getUtcHourFraction } from '../utils/dateHelpers';

export interface CurrentDuty {
  now: Date;
  dayIndex: number;
  utcHour: number;
  hourFraction: number;
  slot: DutySlot;
  shift: Shift;
  minutesLeftInShift: number;
}

// Hours from the current one to the end of the run, counted forward over the
// week ring so a shift crossing Sunday into Monday still counts down.
const hoursToShiftEnd = (shift: Shift, dayIndex: number, utcHour: number): number => {
  const diff = shift.endDayIndex * 24 + shift.endHour - (dayIndex * 24 + utcHour);
  return ((diff % HOURS_IN_WEEK) + HOURS_IN_WEEK) % HOURS_IN_WEEK;
};

const read = (): CurrentDuty => {
  const now = new Date();
  const dayIndex = getUtcDayIndex(now);
  const utcHour = getUtcHour(now);
  const hourFraction = getUtcHourFraction(now);
  const shift = shiftAround(dayIndex, utcHour);

  return {
    now,
    dayIndex,
    utcHour,
    hourFraction,
    slot: dutyAt(dayIndex, utcHour),
    shift,
    minutesLeftInShift: Math.round((hoursToShiftEnd(shift, dayIndex, utcHour) - hourFraction) * 60),
  };
};

// One second, matching UTCClock: the readout ticks seconds and the cursor
// creeps down its row rather than jumping once an hour.
export const useCurrentDuty = (intervalMs: number = 1000): CurrentDuty => {
  const [duty, setDuty] = useState<CurrentDuty>(read);

  useEffect(() => {
    const tick = () => setDuty(read());
    tick();
    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return duty;
};
