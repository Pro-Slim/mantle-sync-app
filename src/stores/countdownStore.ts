import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';

export type CountdownType = 'endDate' | 'rewardDelivery';

export interface SharedCountdown {
  eventId: string;
  type: CountdownType;
}

interface CountdownRow {
  event_id: string;
  type: CountdownType;
}

// Countdown clocks used to live in one person's React state: gone on reload
// and never seen by anyone else. They are shared now (public.shared_countdowns),
// so a clock one steward starts is on everyone's dashboard when they log in.
interface CountdownStore {
  countdowns: SharedCountdown[];
  error: string | null;
  fetchCountdowns: () => Promise<void>;
  addCountdown: (eventId: string, type: CountdownType) => Promise<boolean>;
  changeType: (eventId: string, type: CountdownType) => Promise<boolean>;
  removeCountdown: (eventId: string) => Promise<boolean>;
}

const fromRow = (row: CountdownRow): SharedCountdown => ({ eventId: row.event_id, type: row.type });

export const useCountdownStore = create<CountdownStore>((set, get) => ({
  countdowns: [],
  error: null,

  fetchCountdowns: async () => {
    const { data, error } = await supabase
      .from('shared_countdowns')
      .select('event_id, type')
      .order('created_at', { ascending: true });
    if (error) {
      set({ error: `Could not load countdowns: ${error.message}` });
      return;
    }
    set({ countdowns: (data as CountdownRow[]).map(fromRow), error: null });
  },

  addCountdown: async (eventId, type) => {
    if (get().countdowns.some((c) => c.eventId === eventId)) return true;
    // Upsert: if another steward added the same event a moment ago, this just
    // agrees with them instead of failing on the primary key.
    const { error } = await supabase
      .from('shared_countdowns')
      .upsert({ event_id: eventId, type }, { onConflict: 'event_id' });
    if (error) {
      set({ error: `Could not add the countdown: ${error.message}` });
      return false;
    }
    set({ countdowns: [...get().countdowns.filter((c) => c.eventId !== eventId), { eventId, type }], error: null });
    return true;
  },

  changeType: async (eventId, type) => {
    const before = get().countdowns;
    set({ countdowns: before.map((c) => (c.eventId === eventId ? { ...c, type } : c)) });
    const { error } = await supabase.from('shared_countdowns').update({ type }).eq('event_id', eventId);
    if (error) {
      set({ countdowns: before, error: `Could not change the countdown: ${error.message}` });
      return false;
    }
    return true;
  },

  removeCountdown: async (eventId) => {
    const before = get().countdowns;
    set({ countdowns: before.filter((c) => c.eventId !== eventId) });
    const { error } = await supabase.from('shared_countdowns').delete().eq('event_id', eventId);
    if (error) {
      set({ countdowns: before, error: `Could not remove the countdown: ${error.message}` });
      return false;
    }
    return true;
  },
}));
