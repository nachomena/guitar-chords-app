// Chord-diagram lookup (SPEC.md §5.7/§8.9): looks up the exact chord symbol parsed
// from the song text — no transform step, since there's no live transpose (§5.3).
// Bundled `@tombatossals/chords-db` guitar data (no image assets, no network call).
import guitarChordsDatabase from '@tombatossals/chords-db/lib/guitar.json';

export type ChordDiagramPosition = {
  frets: number[]; // -1 = muted string
  fingers: number[];
  baseFret: number;
  barres: number[];
};

type GuitarChordDatabaseEntry = {
  key: string;
  suffix: string;
  positions: ChordDiagramPosition[];
};

const guitarChordsByDatabaseKey = (
  guitarChordsDatabase as { chords: Record<string, GuitarChordDatabaseEntry[]> }
).chords;

/**
 * Maps a chord root as written in a song (sharp or flat, either enharmonic spelling)
 * to the key `@tombatossals/chords-db` files its chord entries under — the dataset
 * uses one fixed spelling per pitch class, not necessarily the one the user typed.
 */
const ROOT_NOTE_NAME_TO_CHORDS_DATABASE_KEY: Record<string, string> = {
  C: 'C',
  'B#': 'C',
  'C#': 'Csharp',
  Db: 'Csharp',
  D: 'D',
  'D#': 'Eb',
  Eb: 'Eb',
  E: 'E',
  Fb: 'E',
  F: 'F',
  'E#': 'F',
  'F#': 'Fsharp',
  Gb: 'Fsharp',
  G: 'G',
  'G#': 'Ab',
  Ab: 'Ab',
  A: 'A',
  'A#': 'Bb',
  Bb: 'Bb',
  B: 'B',
  Cb: 'B',
};

/** Every suffix `@tombatossals/chords-db` recognizes directly, keyed to itself. */
const KNOWN_CHORD_DATABASE_SUFFIXES = new Set([
  'major',
  'minor',
  'dim',
  'dim7',
  'sus2',
  'sus4',
  '7sus4',
  'alt',
  'aug',
  '6',
  '69',
  '7',
  '7b5',
  'aug7',
  '9',
  '9b5',
  'aug9',
  '7b9',
  '7#9',
  '11',
  '9#11',
  '13',
  'maj7',
  'maj7b5',
  'maj7#5',
  'maj9',
  'maj11',
  'maj13',
  'm6',
  'm69',
  'm7',
  'm7b5',
  'm9',
  'm11',
  'mmaj7',
  'mmaj7b5',
  'mmaj9',
  'mmaj11',
  'add9',
  'madd9',
]);

/**
 * Alias table for chord-suffix spellings that don't already match
 * `@tombatossals/chords-db`'s vocabulary — starts with a small, known set (including
 * the Cifra-Club-style Brazilian `7M`/`M7` for "major seventh") and is easy to extend
 * (§8.9). Note this table is case-sensitive on purpose: "M7" and "m7" are different
 * chords (major seventh vs. minor seventh) in standard notation.
 */
const CHORD_SUFFIX_ALIAS_TABLE: Record<string, string> = {
  '': 'major',
  maj: 'major',
  M: 'major',
  m: 'minor',
  min: 'minor',
  '-': 'minor',
  '7M': 'maj7',
  M7: 'maj7',
  '9M': 'maj9',
  M9: 'maj9',
  M11: 'maj11',
  M13: 'maj13',
  '+': 'aug',
  sus: 'sus4',
  ø: 'm7b5',
  'm7-5': 'm7b5',
  '°': 'dim',
  '°7': 'dim7',
  mM7: 'mmaj7',
  'm/maj7': 'mmaj7',
  min7: 'm7',
  min9: 'm9',
  min11: 'm11',
  min6: 'm6',
};

function normalizeChordSuffix(rawSuffix: string): string | null {
  if (KNOWN_CHORD_DATABASE_SUFFIXES.has(rawSuffix)) return rawSuffix;
  const aliasedSuffix = CHORD_SUFFIX_ALIAS_TABLE[rawSuffix];
  return aliasedSuffix ?? null;
}

function parseChordSymbolIntoRootAndSuffix(
  chordSymbol: string,
): { root: string; suffix: string } | null {
  // Slash chords (e.g. "D/F#") specify a bass note after the slash — for diagram
  // lookup purposes we look up the chord itself and ignore the bass note, a
  // reasonable v1 simplification (falls back to "No diagram available" for the rare
  // case the chord-db doesn't have the base chord either).
  const chordSymbolWithoutBassNote = chordSymbol.split('/')[0].trim();
  const rootMatch = chordSymbolWithoutBassNote.match(/^[A-G](#|b)?/);
  if (!rootMatch) return null;
  const root = rootMatch[0];
  const suffix = chordSymbolWithoutBassNote.slice(root.length);
  return { root, suffix };
}

export type ChordDiagramLookupResult = {
  chordSymbolAsWritten: string;
  positions: ChordDiagramPosition[];
};

/**
 * Looks up diagram positions for a chord symbol exactly as written in the song text.
 * Returns null if the chord isn't recognized or isn't in the bundled dataset (§8.9 —
 * the caller should show "No diagram available" rather than blocking the tap).
 */
export function lookupChordDiagram(chordSymbolAsWritten: string): ChordDiagramLookupResult | null {
  const parsedChordSymbol = parseChordSymbolIntoRootAndSuffix(chordSymbolAsWritten);
  if (!parsedChordSymbol) return null;

  const chordsDatabaseKey = ROOT_NOTE_NAME_TO_CHORDS_DATABASE_KEY[parsedChordSymbol.root];
  if (!chordsDatabaseKey) return null;

  const normalizedSuffix = normalizeChordSuffix(parsedChordSymbol.suffix);
  if (normalizedSuffix === null) return null;

  const chordEntriesForRoot = guitarChordsByDatabaseKey[chordsDatabaseKey];
  if (!chordEntriesForRoot) return null;

  const matchingChordEntry = chordEntriesForRoot.find(
    (chordEntry) => chordEntry.suffix === normalizedSuffix,
  );
  if (!matchingChordEntry) return null;

  return { chordSymbolAsWritten, positions: matchingChordEntry.positions };
}

/** Used by the chord-name validator in the Editor's live preview (§5.1). */
export function isRecognizedChordSymbol(chordSymbol: string): boolean {
  return lookupChordDiagram(chordSymbol) !== null;
}
