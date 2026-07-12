import { create } from 'zustand';
import { supabase, getCurrentUserId } from '../utils/supabaseClient';
import { offlineQueue } from '../utils/offlineQueue';

export interface LogEntry {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
}

interface LogStore {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;

  fetchLogs: (userId: string) => Promise<void>;
  addLog: (action: string, details?: string) => Promise<LogEntry | null>;
  clearLogs: () => Promise<boolean>;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  loading: false,
  error: null,

  fetchLogs: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      set({ logs: data || [], loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  addLog: async (action, details) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      set({ error: 'Not authenticated' });
      return null;
    }

    const tempLog: LogEntry = {
      id: `temp-${Date.now()}`,
      action,
      details: details || null,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    set((state) => ({ logs: [tempLog, ...state.logs] }));

    try {
      const { data, error } = await supabase.from('activity_logs').insert({
        user_id: userId,
        action,
        details,
        timestamp: new Date().toISOString(),
      }).select();

      if (error) throw error;
      if (!data || !data[0]) throw new Error('No data returned');

      const created: LogEntry = {
        id: data[0].id,
        action: data[0].action,
        details: data[0].details,
        timestamp: data[0].timestamp,
      };

      set((state) => ({
        logs: state.logs.map((l) => (l.id === tempLog.id ? created : l)),
      }));

      return created;
    } catch (error) {
      // Keep the optimistic log visible; syncAll's refetch replaces it with
      // the server copy after the queue drains.
      set({ error: String(error) });

      // Queue the DB-shaped record (no temp id — Supabase would reject it).
      await offlineQueue.add({
        type: 'create',
        table: 'activity_logs',
        record: {
          action,
          details: details || null,
          timestamp: tempLog.timestamp,
        },
      });

      return tempLog;
    }
  },

  clearLogs: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const oldLogs = useLogStore.getState().logs;
    set({ logs: [] });

    try {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      set({ logs: oldLogs, error: String(error) });
      return false;
    }
  },
}));
