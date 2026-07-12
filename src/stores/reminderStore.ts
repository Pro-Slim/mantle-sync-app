import { create } from 'zustand';
import { supabase, getCurrentUserId } from '../utils/supabaseClient';
import { offlineQueue } from '../utils/offlineQueue';
import { CalendarReminder } from '../types';

interface ReminderStore {
  reminders: CalendarReminder[];
  loading: boolean;
  error: string | null;

  fetchReminders: (userId: string) => Promise<void>;
  addReminder: (reminder: Omit<CalendarReminder, 'id'>) => Promise<CalendarReminder | null>;
  deleteReminder: (id: string) => Promise<boolean>;
}

export const useReminderStore = create<ReminderStore>((set) => ({
  reminders: [],
  loading: false,
  error: null,

  fetchReminders: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('date', { ascending: true });

      if (error) throw error;

      const reminders = (data || []).map(dbToReminder);
      set({ reminders, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  addReminder: async (reminderData) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      set({ error: 'Not authenticated' });
      return null;
    }

    const tempReminder: CalendarReminder = {
      id: `temp-${Date.now()}`,
      ...reminderData,
    };

    // Optimistic update
    set((state) => ({ reminders: [...state.reminders, tempReminder] }));

    try {
      const { data, error } = await supabase.from('reminders').insert({
        user_id: userId,
        date: reminderData.date.toISOString(),
        title: reminderData.title,
      }).select();

      if (error) throw error;
      if (!data || !data[0]) throw new Error('No data returned');

      const created = dbToReminder(data[0]);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === tempReminder.id ? created : r)),
      }));

      return created;
    } catch (error) {
      // Keep the optimistic reminder visible; syncAll's refetch replaces it
      // with the server copy after the queue drains.
      set({ error: String(error) });

      // Queue the DB-shaped record (no temp id — Supabase would reject it).
      await offlineQueue.add({
        type: 'create',
        table: 'reminders',
        record: {
          date: reminderData.date.toISOString(),
          title: reminderData.title,
        },
      });

      return tempReminder;
    }
  },

  deleteReminder: async (id) => {
    const oldState = useReminderStore.getState().reminders;

    // Optimistic delete
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      set({ reminders: oldState, error: String(error) });

      await offlineQueue.add({
        type: 'delete',
        table: 'reminders',
        record: { id } as Record<string, unknown>,
      });

      return false;
    }
  },
}));

function dbToReminder(row: Record<string, unknown>): CalendarReminder {
  return {
    id: row.id as string,
    date: new Date(row.date as string),
    title: row.title as string,
  };
}
