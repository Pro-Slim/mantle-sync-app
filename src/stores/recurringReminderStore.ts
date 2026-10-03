import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { useLogStore } from './logStore';
import { DEFAULT_REMINDERS, RecurringReminder, ReminderRepeat } from '../constants/reminders';

export type ReminderFields = Omit<RecurringReminder, 'id'>;

interface ReminderRow {
  id: string;
  title: string;
  icon: string;
  repeat: ReminderRepeat;
  weekday: number | null;
  month_day: number | null;
  about_previous_month: boolean;
}

interface RecurringReminderStore {
  // Starts on the seeded defaults so the tray, the week view and the timeline
  // have something to show before (or without) the network; replaced by the
  // shared list as soon as it loads.
  reminders: RecurringReminder[];
  loaded: boolean;
  error: string | null;
  fetchReminders: () => Promise<void>;
  addReminder: (fields: ReminderFields) => Promise<boolean>;
  updateReminder: (id: string, fields: ReminderFields) => Promise<boolean>;
  deleteReminder: (id: string) => Promise<boolean>;
  clearError: () => void;
}

const fromRow = (row: ReminderRow): RecurringReminder => ({
  id: row.id,
  title: row.title,
  icon: row.icon,
  repeat: row.repeat,
  weekday: row.weekday,
  monthDay: row.month_day,
  aboutPreviousMonth: row.about_previous_month,
});

// Only the field that matches the repeat is kept, so switching a reminder
// from monthly to weekly cannot leave a stale day-of-month behind.
const toRow = (f: ReminderFields) => ({
  title: f.title.trim(),
  icon: f.icon,
  repeat: f.repeat,
  weekday: f.repeat === 'weekly' ? f.weekday : null,
  month_day: f.repeat === 'monthly' ? f.monthDay : null,
  about_previous_month: f.repeat === 'monthly' && f.aboutPreviousMonth,
});

const COLUMNS = 'id, title, icon, repeat, weekday, month_day, about_previous_month';

const log = (action: string, details: string) => void useLogStore.getState().addLog(action, details);

export const useRecurringReminderStore = create<RecurringReminderStore>((set, get) => ({
  reminders: DEFAULT_REMINDERS,
  loaded: false,
  error: null,

  fetchReminders: async () => {
    const { data, error } = await supabase
      .from('recurring_reminders')
      .select(COLUMNS)
      .order('created_at', { ascending: true });
    if (error) {
      set({ error: `Could not load reminders: ${error.message}` });
      return;
    }
    set({ reminders: (data as ReminderRow[]).map(fromRow), loaded: true, error: null });
  },

  addReminder: async (fields) => {
    const { data, error } = await supabase
      .from('recurring_reminders')
      .insert(toRow(fields))
      .select(COLUMNS)
      .single();
    if (error) {
      set({ error: `Could not add the reminder: ${error.message}` });
      return false;
    }
    set({ reminders: [...get().reminders, fromRow(data as ReminderRow)], error: null });
    log('create_recurring_reminder', `Added: ${fields.title.trim()}`);
    return true;
  },

  updateReminder: async (id, fields) => {
    const { data, error } = await supabase
      .from('recurring_reminders')
      .update(toRow(fields))
      .eq('id', id)
      .select(COLUMNS)
      .single();
    if (error) {
      set({ error: `Could not save the reminder: ${error.message}` });
      return false;
    }
    const saved = fromRow(data as ReminderRow);
    set({ reminders: get().reminders.map((r) => (r.id === id ? saved : r)), error: null });
    log('update_recurring_reminder', `Edited: ${saved.title}`);
    return true;
  },

  deleteReminder: async (id) => {
    const title = get().reminders.find((r) => r.id === id)?.title ?? id;
    const { error } = await supabase.from('recurring_reminders').delete().eq('id', id);
    if (error) {
      set({ error: `Could not remove the reminder: ${error.message}` });
      return false;
    }
    set({ reminders: get().reminders.filter((r) => r.id !== id), error: null });
    log('delete_recurring_reminder', `Removed: ${title}`);
    return true;
  },

  clearError: () => set({ error: null }),
}));
