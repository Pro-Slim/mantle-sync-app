import Dexie from 'dexie';
import { useSyncStatusStore } from '../stores/syncStatusStore';

export type QueuedAction = {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: 'events' | 'reminders' | 'activity_logs';
  record: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
};

export class OfflineDB extends Dexie {
  queue!: Dexie.Table<QueuedAction, number>;

  constructor() {
    super('mantle-sync-offline');
    this.version(1).stores({
      queue: '++id, timestamp, retryCount',
    });
  }
}

export const offlineDb = new OfflineDB();

async function refreshPendingCount() {
  const count = await offlineDb.queue.count();
  useSyncStatusStore.getState().setPendingCount(count);
}

export const offlineQueue = {
  // Add an action to the queue
  async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) {
    const id = await offlineDb.queue.add({
      ...action,
      timestamp: Date.now(),
      retryCount: 0,
    });
    await refreshPendingCount();
    return id;
  },

  // Get pending actions (everything in the queue is pending until removed)
  async getPending() {
    return offlineDb.queue.toArray();
  },

  // Mark action as processed by removing it
  async remove(id: number) {
    await offlineDb.queue.delete(id);
    await refreshPendingCount();
  },

  // Update retry count
  async incrementRetry(id: number, error: string) {
    return offlineDb.queue.update(id, {
      retryCount: (old: number | undefined) => (old || 0) + 1,
      lastError: error,
    });
  },

  // Clear the entire queue (use with caution)
  async clear() {
    return offlineDb.queue.clear();
  },

  // Get queue size
  async size() {
    return offlineDb.queue.count();
  },
};
