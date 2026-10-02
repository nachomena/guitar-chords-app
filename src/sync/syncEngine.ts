// Keeps the local library and the sync gist in step: pull the gist, merge it with
// the local songs (syncedLibrary.ts), then write back whichever side is behind.
// Runs on app start, when the app comes back to the foreground, and a couple of
// seconds after each local change (requestLibrarySync).
import { songStorage } from '../db/songStorage';
import {
  createSyncGist,
  findSyncGistId,
  GistApiError,
  readSyncGistFile,
  writeSyncGistFile,
} from './gistApi';
import {
  areSyncedLibrariesEqual,
  mergeSyncedLibraries,
  parseSyncedLibrary,
  serializeSyncedLibrary,
  type SyncedLibrary,
} from './syncedLibrary';
import { useSyncStore } from './syncStore';

const LOCAL_CHANGE_SYNC_DELAY_MILLISECONDS = 2000;
const MAXIMUM_SYNC_ATTEMPTS = 3;

let pendingSyncTimeout: ReturnType<typeof setTimeout> | null = null;
let runningSync: Promise<void> | null = null;
let isSyncRequestedWhileRunning = false;
let localLibraryReplacedListener: (() => void) | null = null;

/** Called after a sync rewrote the local songs, so the UI can refetch them. */
export function setLocalLibraryReplacedListener(listener: (() => void) | null): void {
  localLibraryReplacedListener = listener;
}

/** Schedules a sync (debounced). A no-op while sync isn't set up. */
export function requestLibrarySync(delayMilliseconds = LOCAL_CHANGE_SYNC_DELAY_MILLISECONDS): void {
  if (!useSyncStore.getState().gitHubToken) return;
  if (pendingSyncTimeout) clearTimeout(pendingSyncTimeout);
  pendingSyncTimeout = setTimeout(() => {
    pendingSyncTimeout = null;
    void syncLibraryNow();
  }, delayMilliseconds);
}

/** Runs a sync right away (or right after the one in flight). Never throws. */
export function syncLibraryNow(): Promise<void> {
  if (runningSync) {
    isSyncRequestedWhileRunning = true;
    return runningSync;
  }
  runningSync = (async () => {
    try {
      do {
        isSyncRequestedWhileRunning = false;
        await runSyncOnce();
      } while (isSyncRequestedWhileRunning);
    } finally {
      runningSync = null;
    }
  })();
  return runningSync;
}

async function readLocalLibrary(): Promise<SyncedLibrary> {
  return {
    songs: await songStorage.selectAllSongRows(),
    deletedSongs: useSyncStore.getState().deletedSongs,
  };
}

async function runSyncOnce(): Promise<void> {
  const { gitHubToken } = useSyncStore.getState();
  if (!gitHubToken) return;

  useSyncStore.setState({ syncStatus: 'syncing', syncErrorMessage: null });
  try {
    for (let attempt = 1; attempt <= MAXIMUM_SYNC_ATTEMPTS; attempt++) {
      const isSynced = await pullMergeAndPush(gitHubToken);
      if (isSynced) {
        useSyncStore.setState({
          syncStatus: 'idle',
          lastSyncedAt: new Date().toISOString(),
        });
        return;
      }
      // The local library changed while we were talking to GitHub — start over so
      // that edit isn't overwritten by the merge result.
    }
    useSyncStore.setState({ syncStatus: 'idle' });
    requestLibrarySync();
  } catch (syncError) {
    if (syncError instanceof GistApiError && syncError.httpStatus === 404) {
      // The gist was deleted on GitHub: forget it so the next sync recreates it.
      useSyncStore.setState({ syncGistId: null });
    }
    useSyncStore.setState({
      syncStatus: 'error',
      syncErrorMessage:
        syncError instanceof Error ? syncError.message : 'Sync failed. Try again later.',
    });
  }
}

/** Returns false (and writes nothing locally) if the local library changed mid-sync. */
async function pullMergeAndPush(gitHubToken: string): Promise<boolean> {
  const localLibrary = await readLocalLibrary();

  let syncGistId = useSyncStore.getState().syncGistId ?? (await findSyncGistId(gitHubToken));
  let remoteLibrary: SyncedLibrary | null = null;
  if (syncGistId) {
    remoteLibrary = parseSyncedLibrary(await readSyncGistFile(gitHubToken, syncGistId));
  }

  const mergedLibrary = remoteLibrary
    ? mergeSyncedLibraries(localLibrary, remoteLibrary)
    : mergeSyncedLibraries(localLibrary, { songs: [], deletedSongs: [] });

  if (!areSyncedLibrariesEqual(localLibrary, mergedLibrary)) {
    const currentLocalLibrary = await readLocalLibrary();
    if (!areSyncedLibrariesEqual(localLibrary, currentLocalLibrary)) return false;
    if (
      !areSyncedLibrariesEqual(
        { ...localLibrary, deletedSongs: [] },
        { ...mergedLibrary, deletedSongs: [] },
      )
    ) {
      await songStorage.deleteAllSongRows();
      await songStorage.insertSongRows(mergedLibrary.songs);
      localLibraryReplacedListener?.();
    }
    useSyncStore.setState({ deletedSongs: mergedLibrary.deletedSongs });
  }

  if (!syncGistId) {
    syncGistId = await createSyncGist(gitHubToken, serializeSyncedLibrary(mergedLibrary));
  } else if (!remoteLibrary || !areSyncedLibrariesEqual(remoteLibrary, mergedLibrary)) {
    await writeSyncGistFile(gitHubToken, syncGistId, serializeSyncedLibrary(mergedLibrary));
  }
  useSyncStore.setState({ syncGistId });
  return true;
}

/** Saves the token and runs the first sync, which merges this device's songs in. */
export async function connectLibrarySync(gitHubToken: string): Promise<void> {
  useSyncStore.setState({ gitHubToken: gitHubToken.trim(), syncGistId: null });
  await syncLibraryNow();
}

/** Stops syncing on this device. Local songs and the gist are both left as they are. */
export function disconnectLibrarySync(): void {
  if (pendingSyncTimeout) clearTimeout(pendingSyncTimeout);
  pendingSyncTimeout = null;
  useSyncStore.setState({
    gitHubToken: null,
    syncGistId: null,
    lastSyncedAt: null,
    syncStatus: 'idle',
    syncErrorMessage: null,
  });
}
