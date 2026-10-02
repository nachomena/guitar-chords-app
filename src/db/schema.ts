// A song as stored in the library (SPEC.md §8.2). bpm/timeSignature*/capo/
// durationSeconds mirror the ChordPro metadata directives parsed out of chordSheet.
export type SongRow = {
  id: string; // uuid, generated client-side
  title: string;
  artist: string;
  originalKey: string | null; // e.g. "F#m"
  bpm: number | null;
  timeSignatureNumerator: number | null;
  timeSignatureDenominator: number | null;
  capo: number | null;
  durationSeconds: number | null; // used by the duration scroll engine, §5.2
  chordSheet: string; // ChordPro-style source, see §6
  tags: string | null; // JSON-encoded string[]
  isFavorite: boolean | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};
