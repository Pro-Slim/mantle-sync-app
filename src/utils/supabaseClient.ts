import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Returns the current signed-in user's id, or null. Uses getSession()
// (reads local storage, works offline) rather than getUser() (network call
// that fails when offline).
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          start_date: string;
          end_date: string | null;
          type: string;
          description: string | null;
          requirements: string | null;
          resources: string | null;
          application_link: string | null;
          x_post_link: string | null;
          winner_criteria: string | null;
          winner_announcement_date: string | null;
          notion_link: string | null;
          reward_amount: string | null;
          reward_currency: string | null;
          reward_default_delivery_date: string | null;
          reward_realized_delivery_date: string | null;
          reward_status: string | null;
          tags: string[];
          is_favorite: boolean;
          version: number;
          last_modified_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          title: string;
          version: number;
          last_modified_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          details: string | null;
          timestamp: string;
          created_at: string;
        };
      };
    };
  };
};
