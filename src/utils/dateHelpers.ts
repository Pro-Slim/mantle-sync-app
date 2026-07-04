export const YEAR_2026 = 2026;
export const YEAR_START = new Date(YEAR_2026, 0, 1);
export const YEAR_END = new Date(YEAR_2026, 11, 31);

export const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export const getDaysInYear = (year: number): number => {
  return new Date(year, 11, 31).getDate() === 31 && new Date(year, 1, 29).getDate() === 29 ? 366 : 365;
};

export const getPositionFromDate = (date: Date, timelineWidth: number): number => {
  const dayOfYear = getDayOfYear(date);
  const daysInYear = getDaysInYear(YEAR_2026);
  return (dayOfYear / daysInYear) * timelineWidth;
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
