// Types for the parsed representation of a ChordPro-style chord sheet. See
// SPEC.md §6 (notation format) and §8.4 (parser output shape).

export type SongMetadata = {
  title: string | null;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  timeSignature: { numerator: number; denominator: number } | null;
  capo: number | null;
  durationSeconds: number | null;
};

export type ChordPlacement = {
  /** Character offset into the lyric line's stripped `text` (chord markers removed). */
  charIndex: number;
  symbol: string;
};

export type LyricParsedLine = {
  type: 'lyric';
  text: string;
  chords: ChordPlacement[];
};

export type StrumParsedLine = {
  type: 'strum';
  pattern: string;
};

export type CommentParsedLine = {
  type: 'comment';
  text: string;
};

export type TabParsedLine = {
  type: 'tab';
  text: string;
};

export type ParsedLine = LyricParsedLine | StrumParsedLine | CommentParsedLine | TabParsedLine;

export type ParsedSong = {
  metadata: SongMetadata;
  lines: ParsedLine[];
};

export type RenderableLyricToken = {
  /** The real chord name — used to look up/open the chord diagram on tap. Null for strum-accent tokens (there's no chord to look up). */
  chordSymbol: string | null;
  /**
   * What's actually printed as the chord label. Equal to `chordSymbol` normally;
   * becomes e.g. "Gx2" when consecutive identical chords with no lyric text between
   * them (`[G][G]`) are collapsed into one repeat-count label. Null for strum-accent
   * tokens, which render `strumAccentGlyphs` in a pill instead of a plain label.
   */
  chordDisplayLabel: string | null;
  /**
   * Set when a bracket's contents are stroke glyphs (↓/↑/x/–) rather than a chord
   * name — e.g. `[A] [↓ ↓ ↓ ↓]` for "A, strummed with 4 downstrokes" inline in an
   * instrumental line. Rendered as a small pill instead of a bold chord label, and
   * not tappable (there's no chord diagram for a strum pattern).
   */
  strumAccentGlyphs: string | null;
  lyricText: string;
};
