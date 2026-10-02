import type { SongRow } from './schema';

/**
 * The low-level persistence operations songs.ts builds on. Native builds back this
 * with SQLite via Drizzle (songStorage.ts); the web build (GitHub Pages) backs it
 * with the browser's localStorage (songStorage.web.ts), since expo-sqlite's web
 * implementation needs SharedArrayBuffer — i.e. COOP/COEP response headers, which
 * GitHub Pages can't send.
 */
export type SongStorage = {
  selectAllSongRows(): Promise<SongRow[]>;
  selectSongRowById(songId: string): Promise<SongRow | undefined>;
  insertSongRows(songRows: SongRow[]): Promise<void>;
  updateSongRowFields(songId: string, changedFields: Partial<Omit<SongRow, 'id'>>): Promise<void>;
  deleteSongRow(songId: string): Promise<void>;
  deleteAllSongRows(): Promise<void>;
};
