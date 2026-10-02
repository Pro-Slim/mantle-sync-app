import { addDays, startOfDay } from '../utils/dateHelpers';

export type RecurringReminderId = 'weekly-report' | 'monthly-stats';

export interface RecurringReminder {
  id: RecurringReminderId;
  title: string;
  shortTitle: string;
  schedule: string;
  icon: string;
}

export interface ReminderOccurrence {
  reminder: RecurringReminder;
  date: Date;
  // What this particular date is for, e.g. "September stats".
  detail?: string;
  // Title and detail together, for tooltips.
  label: string;
}

// One pink across the tray, the week view and the timeline, so a reminder
// reads as a reminder wherever it shows. Kept clear of the steward colours and
// the teal of the app's own chrome.
export const REMINDER_COLOR = '#F472B6';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RECURRING_REMINDERS: RecurringReminder[] = [
  {
    id: 'weekly-report',
    title: 'Weekly Steward Report',
    shortTitle: 'Weekly report',
    schedule: 'Every Friday',
    icon: '📝',
  },
  {
    id: 'monthly-stats',
    title: 'Launch member-message stats',
    shortTitle: 'Monthly stats',
    schedule: "Every 30th, for the previous month (last day in February)",
    icon: '📊',
  },
];

const daysInMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

// February has no 30th, so its stats fall due on its last day instead of
// silently skipping a month.
const occursOn = (id: RecurringReminderId, date: Date): boolean =>
  id === 'weekly-report'
    ? date.getDay() === 5
    : date.getDate() === Math.min(30, daysInMonth(date));

const occurrence = (reminder: RecurringReminder, date: Date): ReminderOccurrence => {
  const detail =
    reminder.id === 'monthly-stats' ? `${MONTH_NAMES[(date.getMonth() + 11) % 12]} stats` : undefined;
  return {
    reminder,
    date: startOfDay(date),
    detail,
    label: detail ? `${reminder.title} · ${detail}` : reminder.title,
  };
};

// Dates are the viewer's local calendar days: a Friday is Friday wherever the
// steward reading it is.
export const remindersOn = (date: Date): ReminderOccurrence[] =>
  RECURRING_REMINDERS.filter((r) => occursOn(r.id, date)).map((r) => occurrence(r, date));

export const remindersBetween = (start: Date, end: Date): ReminderOccurrence[] => {
  const occurrences: ReminderOccurrence[] = [];
  for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
    occurrences.push(...remindersOn(day));
  }
  return occurrences;
};

// The next date (today included) each reminder falls on. Every rule recurs
// within a month, so 31 days ahead always finds one.
export const nextOccurrence = (reminder: RecurringReminder, from: Date): ReminderOccurrence => {
  for (let offset = 0; offset <= 31; offset++) {
    const day = addDays(from, offset);
    if (occursOn(reminder.id, day)) return occurrence(reminder, day);
  }
  throw new Error(`No occurrence of ${reminder.id} within a month of ${from.toDateString()}`);
};

export const daysUntilLabel = (date: Date, today: Date): string => {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
};
