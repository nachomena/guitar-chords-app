// The song library as stored in the sync gist, and how two copies of it (this
// device's and the gist's) are merged. Pure functions — no I/O — so the merge rules
// are unit-testable (syncedLibrary.test.ts).
import type { SongRow } from '../db/schema';

export type DeletedSongRecord = {
  id: string;
  deletedAt: string; // ISO string
};

export type SyncedLibrary = {
  songs: SongRow[];
  // Tombstones: without them a song deleted on one device would be brought back by
  // the next sync from any device that still has it.
  deletedSongs: DeletedSongRecord[];
};

export const SYNCED_LIBRARY_FORMAT_VERSION = 1;

type SyncedLibraryFile = SyncedLibrary & { formatVersion: number };

function timestampToMilliseconds(isoTimestamp: string): number {
  const milliseconds = Date.parse(isoTimestamp);
  return Number.isNaN(milliseconds) ? 0 : milliseconds;
}

/**
 * Merges two copies of the library song by song: the most recently updated version
 * of each song wins, and a song stays deleted unless it was edited after the
 * deletion.
 */
export function mergeSyncedLibraries(
  firstLibrary: SyncedLibrary,
  secondLibrary: SyncedLibrary,
): SyncedLibrary {
  const latestDeletionBySongId = new Map<string, DeletedSongRecord>();
  for (const deletedSong of [...firstLibrary.deletedSongs, ...secondLibrary.deletedSongs]) {
    const knownDeletion = latestDeletionBySongId.get(deletedSong.id);
    if (
      !knownDeletion ||
      timestampToMilliseconds(deletedSong.deletedAt) > timestampToMilliseconds(knownDeletion.deletedAt)
    ) {
      latestDeletionBySongId.set(deletedSong.id, deletedSong);
    }
  }

  const latestSongById = new Map<string, SongRow>();
  for (const song of [...firstLibrary.songs, ...secondLibrary.songs]) {
    const knownSong = latestSongById.get(song.id);
    if (
      !knownSong ||
      timestampToMilliseconds(song.updatedAt) > timestampToMilliseconds(knownSong.updatedAt)
    ) {
      latestSongById.set(song.id, song);
    }
  }

  const mergedSongs = [...latestSongById.values()].filter((song) => {
    const deletion = latestDeletionBySongId.get(song.id);
    return (
      !deletion ||
      timestampToMilliseconds(song.updatedAt) > timestampToMilliseconds(deletion.deletedAt)
    );
  });

  return {
    songs: sortById(mergedSongs),
    deletedSongs: sortById([...latestDeletionBySongId.values()]),
  };
}

function sortById<TItem extends { id: string }>(items: TItem[]): TItem[] {
  return [...items].sort((first, second) => (first.id < second.id ? -1 : first.id > second.id ? 1 : 0));
}

/** Order-insensitive equality, used to skip writes when nothing changed. */
export function areSyncedLibrariesEqual(first: SyncedLibrary, second: SyncedLibrary): boolean {
  return (
    JSON.stringify(sortById(first.songs)) === JSON.stringify(sortById(second.songs)) &&
    JSON.stringify(sortById(first.deletedSongs)) === JSON.stringify(sortById(second.deletedSongs))
  );
}

export function serializeSyncedLibrary(library: SyncedLibrary): string {
  const libraryFile: SyncedLibraryFile = {
    formatVersion: SYNCED_LIBRARY_FORMAT_VERSION,
    songs: sortById(library.songs),
    deletedSongs: sortById(library.deletedSongs),
  };
  return JSON.stringify(libraryFile, null, 2);
}

/** Throws if the gist file isn't a library this app wrote. */
export function parseSyncedLibrary(serializedLibrary: string): SyncedLibrary {
  const parsedFile = JSON.parse(serializedLibrary) as Partial<SyncedLibraryFile> | null;
  if (
    !parsedFile ||
    !Array.isArray(parsedFile.songs) ||
    !Array.isArray(parsedFile.deletedSongs) ||
    typeof parsedFile.formatVersion !== 'number'
  ) {
    throw new Error('The sync gist doesn’t contain a Chord App library.');
  }
  if (parsedFile.formatVersion > SYNCED_LIBRARY_FORMAT_VERSION) {
    throw new Error('The sync gist was written by a newer version of Chord App.');
  }
  return { songs: parsedFile.songs, deletedSongs: parsedFile.deletedSongs };
}
