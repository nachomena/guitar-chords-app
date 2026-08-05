// Drizzle schema for the local SQLite database. See SPEC.md §8.2 — the columns and
// their names are dictated by the spec (bpm/timeSigNum/timeSigDen/capo/durationSec
// mirror the ChordPro metadata directives parsed out of chordSheet).
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const songsTable = sqliteTable('songs', {
  id: text('id').primaryKey(), // uuid, generated client-side
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  originalKey: text('original_key'), // e.g. "F#m"
  bpm: integer('bpm'),
  timeSignatureNumerator: integer('time_sig_num').default(4),
  timeSignatureDenominator: integer('time_sig_den').default(4),
  capo: integer('capo').default(0),
  durationSeconds: integer('duration_sec'), // used by the duration scroll engine, §5.2
  chordSheet: text('chord_sheet').notNull(), // ChordPro-style source, see §6
  tags: text('tags').default('[]'), // JSON-encoded string[]
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(), // ISO string
  updatedAt: text('updated_at').notNull(), // ISO string
});

export type SongRow = typeof songsTable.$inferSelect;
export type NewSongRow = typeof songsTable.$inferInsert;
