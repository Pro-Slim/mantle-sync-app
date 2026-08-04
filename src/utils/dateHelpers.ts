export const TIMELINE_START = new Date(2025, 0, 1); // Jan 2025
export const TIMELINE_END = new Date(2027, 11, 31); // Dec 2027

export const getTotalTimelineDays = (): number => {
  const diff = TIMELINE_END.getTime() - TIMELINE_START.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil(diff / oneDay);
};

export const getPositionFromDate = (date: Date, timelineWidth: number): number => {
  const diff = date.getTime() - TIMELINE_START.getTime();
  const totalDays = getTotalTimelineDays();
  const oneDay = 1000 * 60 * 60 * 24;
  const daysSinceStart = Math.floor(diff / oneDay);
  return (daysSinceStart / totalDays) * timelineWidth;
};

export const getMonthLabel = (monthIndex: number): string => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return months[monthIndex];
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Monday-first, matching the calendar grid's Mon..Sun columns.
export const startOfWeek = (date: Date): Date =>
  addDays(date, -((date.getDay() + 6) % 7));

export const getWeekDays = (date: Date): Date[] => {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

// A campaign occupies every day from its start through its end (inclusive), so
// a 1–30 August campaign reads as active on all 30 days. Undefined or invalid
// end dates collapse to a single-day campaign.
export const isEventActiveOn = (
  event: { startDate: Date; endDate?: Date },
  date: Date
): boolean => {
  const day = startOfDay(date).getTime();
  const start = startOfDay(event.startDate).getTime();
  const end = event.endDate ? Math.max(startOfDay(event.endDate).getTime(), start) : start;
  return day >= start && day <= end;
};

// Rounded because local-midnight differences drift by an hour across DST.
export const inclusiveDayCount = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;

export const formatWeekRange = (weekStart: Date, weekEnd: Date): string => {
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = weekEnd.toLocaleDateString('en-US', {
    month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : 'short',
    day: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
};

// For <input type="date">: format/parse in LOCAL time. Using toISOString()
// or new Date('YYYY-MM-DD') goes through UTC and shifts the day in non-UTC timezones.
export const toDateInputValue = (date: Date): string => {
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDateInputValue = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};
