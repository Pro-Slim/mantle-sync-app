import { create } from 'zustand';
import { supabase, getCurrentUserId } from '../utils/supabaseClient';
import { offlineQueue } from '../utils/offlineQueue';
import { Event } from '../types';

interface EventStore {
  events: Event[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<Event | null>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<boolean>;

  optimisticAdd: (event: Event) => void;
  optimisticUpdate: (id: string, updates: Partial<Event>) => void;
  optimisticDelete: (id: string) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  loading: false,
  error: null,
  initialized: false,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const events = (data || []).map(dbToEvent);
      set({ events, loading: false, initialized: true });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  addEvent: async (eventData) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      set({ error: 'Not authenticated' });
      return null;
    }

    const newEvent: Event = {
      id: `temp-${Date.now()}`,
      ...eventData,
    };

    // Optimistic update
    set((state) => ({ events: [...state.events, newEvent] }));

    try {
      const dbRecord = eventToDb(eventData);
      const { data, error } = await supabase.from('events').insert({
        ...dbRecord,
        user_id: userId,
      }).select();

      if (error) throw error;
      if (!data || !data[0]) throw new Error('No data returned');

      const created = dbToEvent(data[0]);
      set((state) => ({
        events: state.events.map((e) => (e.id === newEvent.id ? created : e)),
      }));

      return created;
    } catch (error) {
      // Keep the optimistic event visible; it stays until syncAll's refetch
      // replaces it with the server copy after the queue drains.
      set({ error: String(error) });

      // Queue the DB-shaped record (snake_case columns, no temp id) — the
      // temp id and camelCase fields would be rejected by Supabase on sync.
      await offlineQueue.add({
        type: 'create',
        table: 'events',
        record: eventToDb(eventData) as Record<string, unknown>,
      });

      return newEvent;
    }
  },

  updateEvent: async (id, updates) => {
    const oldEvent = useEventStore.getState().events.find((e) => e.id === id);
    if (!oldEvent) return null;

    const updated = { ...oldEvent, ...updates };

    // Optimistic update
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? updated : e)),
    }));

    try {
      // Convert the MERGED event, not the patch. eventToDb emits every column,
      // so converting a partial patch would send null for every field the
      // caller didn't mention and blank the rest of the row.
      const dbRecord = eventToDb(updated);
      const { data, error } = await supabase
        .from('events')
        .update(dbRecord)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || !data[0]) throw new Error('No data returned');

      const result = dbToEvent(data[0]);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? result : e)),
      }));

      return result;
    } catch (error) {
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? oldEvent : e)),
        error: String(error),
      }));

      // Queue the DB-shaped record for the same reason the create path does:
      // queueSync hands these keys straight to Supabase, which has no
      // camelCase columns and no Date type.
      await offlineQueue.add({
        type: 'update',
        table: 'events',
        record: { id, ...eventToDb(updated) } as Record<string, unknown>,
      });

      return null;
    }
  },

  deleteEvent: async (id) => {
    const oldState = useEventStore.getState().events;

    // Optimistic delete
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));

    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      set({ events: oldState, error: String(error) });

      await offlineQueue.add({
        type: 'delete',
        table: 'events',
        record: { id } as Record<string, unknown>,
      });

      return false;
    }
  },

  optimisticAdd: (event) => {
    set((state) => ({ events: [...state.events, event] }));
  },

  optimisticUpdate: (id, updates) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  },

  optimisticDelete: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },
}));

// supabase-js JSON-serializes the record, which DROPS undefined keys — so a
// field the user cleared would silently keep its old column value. null is what
// actually clears a column, so every optional field goes through this.
function orNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

// Utility functions to convert between Event and DB formats
function eventToDb(event: Partial<Event>) {
  return {
    title: event.title,
    category: event.category,
    start_date: event.startDate?.toISOString(),
    end_date: orNull(event.endDate?.toISOString()),
    type: event.type,
    description: event.description,
    requirements: orNull(event.requirements),
    resources: orNull(event.resources),
    application_link: orNull(event.applicationLink),
    x_post_link: orNull(event.xPostLink),
    winner_criteria: orNull(event.winnerCriteria),
    winner_announcement_date: orNull(event.winnerAnnouncementDate?.toISOString()),
    notion_link: orNull(event.notionLink),
    reward_amount: orNull(event.rewards?.amount),
    reward_currency: orNull(event.rewards?.currency),
    reward_default_delivery_date: orNull(event.rewards?.defaultDeliveryDate?.toISOString()),
    reward_realized_delivery_date: orNull(event.rewards?.realizedDeliveryDate?.toISOString()),
    reward_status: orNull(event.rewards?.status),
    tags: event.tags,
    is_favorite: event.isFavorite,
    requirements_details: orNull(event.requirementsDetails),
    winner_criteria_details: orNull(event.winnerCriteriaDetails),
    winners_pine: orNull(event.winnersPine),
    remarks: orNull(event.remarks),
  };
}

function dbToEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as Event['category'],
    startDate: new Date(row.start_date as string),
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    type: row.type as Event['type'],
    description: (row.description as string) || '',
    requirements: (row.requirements as string) || undefined,
    resources: (row.resources as string) || undefined,
    applicationLink: (row.application_link as string) || undefined,
    xPostLink: (row.x_post_link as string) || undefined,
    winnerCriteria: (row.winner_criteria as string) || undefined,
    winnerAnnouncementDate: row.winner_announcement_date
      ? new Date(row.winner_announcement_date as string)
      : undefined,
    notionLink: (row.notion_link as string) || undefined,
    rewards:
      (row.reward_amount as string) || (row.reward_currency as string)
        ? {
            amount: (row.reward_amount as string) || '',
            currency: (row.reward_currency as string) || '',
            defaultDeliveryDate: new Date(row.reward_default_delivery_date as string),
            realizedDeliveryDate: row.reward_realized_delivery_date
              ? new Date(row.reward_realized_delivery_date as string)
              : undefined,
            status: (row.reward_status as 'pending' | 'delayed' | 'delivered') || 'pending',
          }
        : undefined,
    tags: (row.tags as string[]) || [],
    isFavorite: (row.is_favorite as boolean) || false,
    requirementsDetails: (row.requirements_details as string) || undefined,
    winnerCriteriaDetails: (row.winner_criteria_details as string) || undefined,
    winnersPine: (row.winners_pine as string) || undefined,
    remarks: (row.remarks as string) || undefined,
  };
}
