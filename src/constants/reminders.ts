import { addDays, startOfDay } from '../utils/dateHelpers';

export type ReminderRepeat = 'weekly' | 'monthly';

// One row of public.recurring_reminders, as the app uses it. Any approved
// steward can add, edit and remove these from the reminders tray.
export interface RecurringReminder {
  id: string;
  title: string;
  icon: string;
  repeat: ReminderRepeat;
  // JavaScript getDay() numbering: 0 = Sunday … 6 = Saturday.
  weekday: number | null;
  monthDay: number | null;
  aboutPreviousMonth: boolean;
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

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Monday-first, to match the week view; the values are getDay() numbers.
export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export const REMINDER_ICONS = ['🔔', '📝', '📊', '📣', '🎁', '🧾', '📅', '🚀'];

// What the app shows before the shared list has loaded (or if it cannot be
// reached): the two reminders the table was seeded with.
export const DEFAULT_REMINDERS: RecurringReminder[] = [
  { id: 'default-weekly-report', title: 'Weekly Steward Report', icon: '📝', repeat: 'weekly', weekday: 5, monthDay: null, aboutPreviousMonth: false },
  { id: 'default-monthly-stats', title: 'Launch member-message stats', icon: '📊', repeat: 'monthly', weekday: null, monthDay: 30, aboutPreviousMonth: true },
];

const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

export const scheduleText = (r: RecurringReminder): string => {
  if (r.repeat === 'weekly') {
    return `Every ${WEEKDAY_OPTIONS.find((d) => d.value === r.weekday)?.label ?? '—'}`;
  }
  const day = r.monthDay ?? 1;
  const shortMonths = day > 28 ? ' (last day in shorter months)' : '';
  return `Every ${ordinal(day)}${r.aboutPreviousMonth ? ', for the previous month' : ''}${shortMonths}`;
};

const daysInMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

// A month too short for the chosen day (the 30th in February) has the
// reminder on its last day instead of silently skipping a month.
const occursOn = (r: RecurringReminder, date: Date): boolean =>
  r.repeat === 'weekly'
    ? date.getDay() === r.weekday
    : r.monthDay !== null && date.getDate() === Math.min(r.monthDay, daysInMonth(date));

const occurrence = (reminder: RecurringReminder, date: Date): ReminderOccurrence => {
  const detail =
    reminder.repeat === 'monthly' && reminder.aboutPreviousMonth
      ? `${MONTH_NAMES[(date.getMonth() + 11) % 12]}`
      : undefined;
  return {
    reminder,
    date: startOfDay(date),
    detail,
    label: detail ? `${reminder.title} · ${detail}` : reminder.title,
  };
};

// Dates are the viewer's local calendar days: a Friday is Friday wherever the
// steward reading it is.
export const remindersOn = (date: Date, reminders: RecurringReminder[]): ReminderOccurrence[] =>
  reminders.filter((r) => occursOn(r, date)).map((r) => occurrence(r, date));

export const remindersBetween = (
  start: Date,
  end: Date,
  reminders: RecurringReminder[],
): ReminderOccurrence[] => {
  const occurrences: ReminderOccurrence[] = [];
  for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
    occurrences.push(...remindersOn(day, reminders));
  }
  return occurrences;
};

// The next date (today included) a reminder falls on. Every rule recurs
// within a month, so 31 days ahead always finds one.
export const nextOccurrence = (reminder: RecurringReminder, from: Date): ReminderOccurrence | null => {
  for (let offset = 0; offset <= 31; offset++) {
    const day = addDays(from, offset);
    if (occursOn(reminder, day)) return occurrence(reminder, day);
  }
  return null;
};

export const daysUntilLabel = (date: Date, today: Date): string => {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
};
