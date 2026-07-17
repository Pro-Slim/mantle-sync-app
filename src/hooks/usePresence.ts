import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface OnlineUser {
  user_id: string;
  email?: string;
  last_seen_at: string;
}

export const usePresence = (userId: string | null, userEmail?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const setUserOnline = async () => {
      try {
        await supabase.from('user_presence').upsert(
          {
            user_id: userId,
            status: 'online',
            email: userEmail || null,
            last_seen_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      } catch (error) {
        console.error('Error setting user online:', error);
      }
    };

    const fetchOnlineUsers = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('user_presence')
          .select('user_id, email, status, last_seen_at')
          .eq('status', 'online')
          .gt('last_seen_at', fiveMinutesAgo);

        if (error) throw error;

        setOnlineUsers((data || []) as OnlineUser[]);
      } catch (error) {
        console.error('Error fetching online users:', error);
      } finally {
        setLoading(false);
      }
    };

    setUserOnline();
    fetchOnlineUsers();

    // Heartbeat: Update presence every 30 seconds
    const heartbeatInterval = setInterval(() => {
      setUserOnline();
    }, 30000);

    // Fetch online users every 5 seconds
    const pollInterval = setInterval(() => {
      fetchOnlineUsers();
    }, 5000);

    // Set user offline on unmount (when they leave)
    const handleBeforeUnload = async () => {
      await supabase.from('user_presence').update({ status: 'offline' }).eq('user_id', userId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
    };
  }, [userId, userEmail]);

  return { onlineUsers, loading };
};
