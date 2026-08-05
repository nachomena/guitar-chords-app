import { lookupChordDiagram } from './lookup';

describe('lookupChordDiagram', () => {
  it('finds a plain major chord', () => {
    const result = lookupChordDiagram('G');
    expect(result).not.toBeNull();
    expect(result?.positions.length).toBeGreaterThan(0);
  });

  it('finds chords from the seed songs in SPEC.md (Em7, Dsus4, A7sus4, Cadd9)', () => {
    for (const chordSymbol of ['Em7', 'Dsus4', 'A7sus4', 'Cadd9', 'Bm', 'Am']) {
      expect(lookupChordDiagram(chordSymbol)).not.toBeNull();
    }
  });

  it('finds a sharp-root minor chord', () => {
    expect(lookupChordDiagram('F#m')).not.toBeNull();
  });

  it('finds a flat-root chord', () => {
    expect(lookupChordDiagram('Bb')).not.toBeNull();
  });

  it('normalizes the Brazilian/Cifra-Club-style "7M" alias to maj7', () => {
    const aliasResult = lookupChordDiagram('C7M');
    const canonicalResult = lookupChordDiagram('Cmaj7');
    expect(aliasResult).not.toBeNull();
    expect(aliasResult?.positions).toEqual(canonicalResult?.positions);
  });

  it('looks up a slash chord by its base chord, ignoring the bass note', () => {
    const slashChordResult = lookupChordDiagram('D/F#');
    const baseChordResult = lookupChordDiagram('D');
    expect(slashChordResult).not.toBeNull();
    expect(slashChordResult?.positions).toEqual(baseChordResult?.positions);
  });

  it('returns null for an unrecognized symbol', () => {
    expect(lookupChordDiagram('Z9')).toBeNull();
    expect(lookupChordDiagram('')).toBeNull();
  });
});
