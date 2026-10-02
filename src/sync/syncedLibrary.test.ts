import type { SongRow } from '../db/schema';
import {
  areSyncedLibrariesEqual,
  mergeSyncedLibraries,
  parseSyncedLibrary,
  serializeSyncedLibrary,
} from './syncedLibrary';

function song(id: string, updatedAt: string, title = id): SongRow {
  return {
    id,
    title,
    artist: 'Artist',
    originalKey: null,
    bpm: null,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    capo: 0,
    durationSeconds: null,
    chordSheet: '[C]la',
    tags: '[]',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

describe('mergeSyncedLibraries', () => {
  it('keeps songs that exist on only one side', () => {
    const merged = mergeSyncedLibraries(
      { songs: [song('a', '2026-01-01T00:00:00.000Z')], deletedSongs: [] },
      { songs: [song('b', '2026-01-01T00:00:00.000Z')], deletedSongs: [] },
    );
    expect(merged.songs.map((mergedSong) => mergedSong.id)).toEqual(['a', 'b']);
  });

  it('keeps the most recently updated version of a song edited on both sides', () => {
    const olderEdit = song('a', '2026-01-01T00:00:00.000Z', 'Older title');
    const newerEdit = song('a', '2026-01-02T00:00:00.000Z', 'Newer title');
    expect(
      mergeSyncedLibraries(
        { songs: [newerEdit], deletedSongs: [] },
        { songs: [olderEdit], deletedSongs: [] },
      ).songs,
    ).toEqual([newerEdit]);
    expect(
      mergeSyncedLibraries(
        { songs: [olderEdit], deletedSongs: [] },
        { songs: [newerEdit], deletedSongs: [] },
      ).songs,
    ).toEqual([newerEdit]);
  });

  it('removes a song deleted on the other side after its last edit', () => {
    const merged = mergeSyncedLibraries(
      { songs: [song('a', '2026-01-01T00:00:00.000Z')], deletedSongs: [] },
      { songs: [], deletedSongs: [{ id: 'a', deletedAt: '2026-01-02T00:00:00.000Z' }] },
    );
    expect(merged.songs).toEqual([]);
    expect(merged.deletedSongs).toEqual([{ id: 'a', deletedAt: '2026-01-02T00:00:00.000Z' }]);
  });

  it('keeps a song edited after it was deleted elsewhere', () => {
    const editedSong = song('a', '2026-01-03T00:00:00.000Z');
    const merged = mergeSyncedLibraries(
      { songs: [editedSong], deletedSongs: [] },
      { songs: [], deletedSongs: [{ id: 'a', deletedAt: '2026-01-02T00:00:00.000Z' }] },
    );
    expect(merged.songs).toEqual([editedSong]);
  });

  it('keeps the latest of two deletions of the same song', () => {
    const merged = mergeSyncedLibraries(
      { songs: [], deletedSongs: [{ id: 'a', deletedAt: '2026-01-01T00:00:00.000Z' }] },
      { songs: [], deletedSongs: [{ id: 'a', deletedAt: '2026-01-05T00:00:00.000Z' }] },
    );
    expect(merged.deletedSongs).toEqual([{ id: 'a', deletedAt: '2026-01-05T00:00:00.000Z' }]);
  });
});

describe('areSyncedLibrariesEqual', () => {
  it('ignores song order', () => {
    const first = song('a', '2026-01-01T00:00:00.000Z');
    const second = song('b', '2026-01-01T00:00:00.000Z');
    expect(
      areSyncedLibrariesEqual(
        { songs: [first, second], deletedSongs: [] },
        { songs: [second, first], deletedSongs: [] },
      ),
    ).toBe(true);
  });
});

describe('serializeSyncedLibrary / parseSyncedLibrary', () => {
  it('round-trips a library', () => {
    const library = {
      songs: [song('a', '2026-01-01T00:00:00.000Z')],
      deletedSongs: [{ id: 'b', deletedAt: '2026-01-02T00:00:00.000Z' }],
    };
    expect(parseSyncedLibrary(serializeSyncedLibrary(library))).toEqual(library);
  });

  it('rejects a file that is not a synced library', () => {
    expect(() => parseSyncedLibrary('[]')).toThrow();
    expect(() => parseSyncedLibrary(JSON.stringify({ songs: [] }))).toThrow();
  });

  it('rejects a file from a newer format version', () => {
    expect(() =>
      parseSyncedLibrary(JSON.stringify({ formatVersion: 99, songs: [], deletedSongs: [] })),
    ).toThrow();
  });
});
