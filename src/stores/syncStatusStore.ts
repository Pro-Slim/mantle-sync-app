import { create } from 'zustand';

interface SyncStatusStore {
  pendingCount: number;
  isSyncing: boolean;
  syncError: string | null;

  setPendingCount: (count: number) => void;
  setIsSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  syncError: null,

  setPendingCount: (count) => set({ pendingCount: count }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncError: (error) => set({ syncError: error }),
}));
