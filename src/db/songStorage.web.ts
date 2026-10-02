// localStorage-backed SongStorage for the web build. See songStorage.types.ts for
// why web doesn't use SQLite. The whole library is kept as one JSON array — fine at
// personal-library scale (SPEC.md §8.7): chord sheets are a few KB of text each.
import type { SongRow } from './schema';
import type { SongStorage } from './songStorage.types';

const SONGS_LOCAL_STORAGE_KEY = 'chord-app.songs.v1';

function readAllSongRows(): SongRow[] {
  const serializedSongRows = window.localStorage.getItem(SONGS_LOCAL_STORAGE_KEY);
  if (serializedSongRows === null) return [];
  try {
    const parsedSongRows: unknown = JSON.parse(serializedSongRows);
    return Array.isArray(parsedSongRows) ? (parsedSongRows as SongRow[]) : [];
  } catch {
    return [];
  }
}

function writeAllSongRows(songRows: SongRow[]): void {
  window.localStorage.setItem(SONGS_LOCAL_STORAGE_KEY, JSON.stringify(songRows));
}

// Columns with a SQL default in schema.ts — applied here too so rows look the same
// as they would coming out of SQLite.
function applyColumnDefaults(songRow: SongRow): SongRow {
  return {
    ...songRow,
    originalKey: songRow.originalKey ?? null,
    bpm: songRow.bpm ?? null,
    timeSignatureNumerator: songRow.timeSignatureNumerator ?? 4,
    timeSignatureDenominator: songRow.timeSignatureDenominator ?? 4,
    capo: songRow.capo ?? 0,
    durationSeconds: songRow.durationSeconds ?? null,
    tags: songRow.tags ?? '[]',
    isFavorite: songRow.isFavorite ?? false,
  };
}

export const songStorage: SongStorage = {
  selectAllSongRows: async () => readAllSongRows(),

  selectSongRowById: async (songId) =>
    readAllSongRows().find((songRow) => songRow.id === songId),

  insertSongRows: async (songRowsToInsert) => {
    const existingSongRows = readAllSongRows();
    const existingSongIds = new Set(existingSongRows.map((songRow) => songRow.id));
    for (const songRowToInsert of songRowsToInsert) {
      if (existingSongIds.has(songRowToInsert.id)) {
        // Mirrors the SQLite primary-key constraint.
        throw new Error(`A song with id ${songRowToInsert.id} already exists.`);
      }
      existingSongIds.add(songRowToInsert.id);
    }
    writeAllSongRows([...existingSongRows, ...songRowsToInsert.map(applyColumnDefaults)]);
  },

  updateSongRowFields: async (songId, changedFields) => {
    writeAllSongRows(
      readAllSongRows().map((songRow) =>
        songRow.id === songId ? { ...songRow, ...changedFields } : songRow,
      ),
    );
  },

  deleteSongRow: async (songId) => {
    writeAllSongRows(readAllSongRows().filter((songRow) => songRow.id !== songId));
  },

  deleteAllSongRows: async () => {
    writeAllSongRows([]);
  },
};
