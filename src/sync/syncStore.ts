// Sync settings and state. Persisted like settingsStore (AsyncStorage, which is
// localStorage on web); the in-progress/error fields are runtime-only.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DeletedSongRecord } from './syncedLibrary';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncState = {
  gitHubToken: string | null;
  syncGistId: string | null;
  lastSyncedAt: string | null;
  // Songs deleted on this device, kept so the deletion reaches the gist (and from
  // there the other devices) instead of the song being restored by the next sync.
  deletedSongs: DeletedSongRecord[];
  syncStatus: SyncStatus;
  syncErrorMessage: string | null;
};

export const useSyncStore = create<SyncState>()(
  persist(
    (): SyncState => ({
      gitHubToken: null,
      syncGistId: null,
      lastSyncedAt: null,
      deletedSongs: [],
      syncStatus: 'idle',
      syncErrorMessage: null,
    }),
    {
      name: 'chord-app-sync',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ gitHubToken, syncGistId, lastSyncedAt, deletedSongs }) => ({
        gitHubToken,
        syncGistId,
        lastSyncedAt,
        deletedSongs,
      }),
    },
  ),
);

export function recordSongDeletions(deletedSongIds: string[]): void {
  if (deletedSongIds.length === 0) return;
  const deletedAt = new Date().toISOString();
  useSyncStore.setState((state) => ({
    deletedSongs: [
      ...state.deletedSongs.filter((deletedSong) => !deletedSongIds.includes(deletedSong.id)),
      ...deletedSongIds.map((id) => ({ id, deletedAt })),
    ],
  }));
}

export function waitForSyncStoreHydration(): Promise<void> {
  if (useSyncStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useSyncStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
