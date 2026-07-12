import { supabase } from './supabaseClient';
import { offlineQueue, QueuedAction } from './offlineQueue';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { useEventStore } from '../stores/eventStore';
import { useReminderStore } from '../stores/reminderStore';
import { useLogStore } from '../stores/logStore';

const MAX_RETRIES = 3;

// Drain the offline queue once, then refresh every store that could have
// changed. This is the single entry point for coming back online — draining
// per-store would re-run the whole (table-agnostic) queue for each table.
export const syncAll = async (userId: string): Promise<void> => {
  await processQueue(userId);
  await Promise.all([
    useEventStore.getState().fetchEvents(userId),
    useReminderStore.getState().fetchReminders(userId),
    useLogStore.getState().fetchLogs(userId),
  ]);
};

export const processQueue = async (userId: string): Promise<void> => {
  const { setIsSyncing, setSyncError, setPendingCount } = useSyncStatusStore.getState();

  try {
    setIsSyncing(true);
    setSyncError(null);

    // offlineQueue.remove() keeps pendingCount current as items drain, so we
    // only need to seed it here and let the queue maintain it.
    const pending = await offlineQueue.getPending();
    setPendingCount(pending.length);
    if (pending.length === 0) return;

    for (const action of pending) {
      try {
        await syncAction(action, userId);
        // Remove from queue after successful sync
        await offlineQueue.remove(action.id!);
      } catch (error) {
        const errorMsg = String(error);

        // If max retries exceeded, drop it; otherwise bump the retry count.
        if (action.retryCount >= MAX_RETRIES) {
          await offlineQueue.remove(action.id!);
          setSyncError(`Max retries exceeded for ${action.type}: ${errorMsg}`);
        } else {
          await offlineQueue.incrementRetry(action.id!, errorMsg);
        }
      }
    }
  } catch (error) {
    setSyncError(String(error));
  } finally {
    setIsSyncing(false);
  }
};

// Helper function to sync a single action.
// supabase-js does not throw on failure — it returns { error } — so each
// call must check and throw, or failed actions would be treated as synced.
async function syncAction(action: QueuedAction, userId: string): Promise<void> {
  switch (action.type) {
    case 'create': {
      const { error } = await supabase.from(action.table).insert({
        ...action.record,
        user_id: userId,
      });
      if (error) throw error;
      break;
    }

    case 'update': {
      const { id, ...updates } = action.record;
      const { error } = await supabase
        .from(action.table)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from(action.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', action.record.id);
      if (error) throw error;
      break;
    }
  }
}
