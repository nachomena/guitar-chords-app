// SQLite-backed SongStorage for native builds. See songStorage.types.ts.
import { eq } from 'drizzle-orm';

import { database } from './client';
import { songsTable } from './schema';
import type { SongStorage } from './songStorage.types';

export const songStorage: SongStorage = {
  selectAllSongRows: async () => database.select().from(songsTable).all(),

  selectSongRowById: async (songId) => {
    const rows = await database.select().from(songsTable).where(eq(songsTable.id, songId)).all();
    return rows[0];
  },

  insertSongRows: async (songRows) => {
    for (const songRow of songRows) {
      await database.insert(songsTable).values(songRow).run();
    }
  },

  updateSongRowFields: async (songId, changedFields) => {
    await database.update(songsTable).set(changedFields).where(eq(songsTable.id, songId)).run();
  },

  deleteSongRow: async (songId) => {
    await database.delete(songsTable).where(eq(songsTable.id, songId)).run();
  },

  deleteAllSongRows: async () => {
    await database.delete(songsTable).run();
  },
};
