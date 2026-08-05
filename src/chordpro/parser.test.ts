import { parseChordProSongText } from './parser';
import {
  convertStrumPatternToDisplay,
  countLinesForBpmTiming,
  groupParsedLinesForRendering,
  splitLyricLineIntoRenderableTokens,
} from './rendering';
import type { LyricParsedLine } from './types';

describe('parseChordProSongText', () => {
  it('parses song-level metadata directives from the top of the sheet', () => {
    const wonderwallChordSheetText = [
      '{title: Wonderwall}',
      '{artist: Oasis}',
      '{key: Fsharpm}',
      '{bpm: 87}',
      '{time: 4/4}',
      '{duration: 4:18}',
      '',
      '{strum: D-DU-UDU-}',
      "[Em7]Today is gonna be the [G]day",
      "That they're gonna throw it [Dsus4]back to [A7sus4]you",
    ].join('\n');

    const parsedSong = parseChordProSongText(wonderwallChordSheetText);

    expect(parsedSong.metadata).toEqual({
      title: 'Wonderwall',
      artist: 'Oasis',
      key: 'Fsharpm',
      bpm: 87,
      timeSignature: { numerator: 4, denominator: 4 },
      capo: null,
      durationSeconds: 4 * 60 + 18,
    });
  });

  it('places one chord per bracket at the correct character offset in the stripped lyric text', () => {
    const parsedSong = parseChordProSongText('[Em7]Today is gonna be the [G]day');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;

    expect(lyricLine.type).toBe('lyric');
    expect(lyricLine.text).toBe('Today is gonna be the day');
    expect(lyricLine.chords).toEqual([
      { charIndex: 0, symbol: 'Em7' },
      { charIndex: 22, symbol: 'G' },
    ]);
  });

  it('parses a chords-only instrumental line with no lyric text', () => {
    const parsedSong = parseChordProSongText('[Em] [G] [D] [A]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;

    expect(lyricLine.type).toBe('lyric');
    expect(lyricLine.chords.map((chordPlacement) => chordPlacement.symbol)).toEqual([
      'Em',
      'G',
      'D',
      'A',
    ]);
  });

  it('parses {comment: ...} lines as section labels, free text', () => {
    const parsedSong = parseChordProSongText('{comment: Intro (x2)}\n[G]Hello');
    expect(parsedSong.lines[0]).toEqual({ type: 'comment', text: 'Intro (x2)' });
  });

  it('parses {strum: ...} lines and scopes them to every following line until the next one', () => {
    const parsedSong = parseChordProSongText(
      ['{strum: D-DU-UDU-}', '[C]One', '{strum: D-D-D-D-}', '[G]Two'].join('\n'),
    );
    expect(parsedSong.lines[0]).toEqual({ type: 'strum', pattern: 'D-DU-UDU-' });
    expect(parsedSong.lines[2]).toEqual({ type: 'strum', pattern: 'D-D-D-D-' });
  });

  it('renders a {start_of_tab}/{end_of_tab} block verbatim, with no chord/lyric parsing applied inside it', () => {
    const goodRiddanceIntroTabText = [
      '{comment: Intro}',
      '{start_of_tab}',
      'e|-------0-----0-|',
      'B|-----1-----1---|',
      'G|---0-------0---|',
      'D|---------------|',
      'A|---------------|',
      'E|---------------|',
      '{end_of_tab}',
      '{comment: Verse 1}',
      '{strum: Finger picking}',
      "[G]Another turning point, a fork stuck in the [Cadd9]road[D]",
    ].join('\n');

    const parsedSong = parseChordProSongText(goodRiddanceIntroTabText);

    expect(parsedSong.lines[0]).toEqual({ type: 'comment', text: 'Intro' });
    const tabLines = parsedSong.lines.slice(1, 7);
    expect(tabLines).toEqual([
      { type: 'tab', text: 'e|-------0-----0-|' },
      { type: 'tab', text: 'B|-----1-----1---|' },
      { type: 'tab', text: 'G|---0-------0---|' },
      { type: 'tab', text: 'D|---------------|' },
      { type: 'tab', text: 'A|---------------|' },
      { type: 'tab', text: 'E|---------------|' },
    ]);
    expect(parsedSong.lines[7]).toEqual({ type: 'comment', text: 'Verse 1' });
    expect(parsedSong.lines[8]).toEqual({ type: 'strum', pattern: 'Finger picking' });
  });

  it('also accepts the {sot}/{eot} short aliases', () => {
    const parsedSong = parseChordProSongText(['{sot}', 'e|---|', '{eot}'].join('\n'));
    expect(parsedSong.lines).toEqual([{ type: 'tab', text: 'e|---|' }]);
  });
});

describe('groupParsedLinesForRendering', () => {
  it('groups consecutive tab lines into a single tabBlock', () => {
    const parsedSong = parseChordProSongText(
      ['{start_of_tab}', 'e|-0-|', 'B|-1-|', '{end_of_tab}', '[C]Hello'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([
      { type: 'tabBlock', tabLines: ['e|-0-|', 'B|-1-|'] },
      {
        type: 'lyric',
        tokens: [{ chordSymbol: 'C', chordDisplayLabel: 'C', strumAccentGlyphs: null, lyricText: 'Hello' }],
      },
    ]);
  });

  it('pairs a chord-only line with the very next plain lyric line into a distributedChordLine', () => {
    const parsedSong = parseChordProSongText(
      ['[D] [G] [D] [G]', 'Qué voy a hacer con tanto cielo para mí'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([
      {
        type: 'distributedChordLine',
        chordTokens: [
          { chordSymbol: 'D', chordDisplayLabel: 'D', strumAccentGlyphs: null, lyricText: ' ' },
          { chordSymbol: 'G', chordDisplayLabel: 'G', strumAccentGlyphs: null, lyricText: ' ' },
          { chordSymbol: 'D', chordDisplayLabel: 'D', strumAccentGlyphs: null, lyricText: ' ' },
          { chordSymbol: 'G', chordDisplayLabel: 'G', strumAccentGlyphs: null, lyricText: '' },
        ],
        lyricText: 'Qué voy a hacer con tanto cielo para mí',
      },
    ]);
  });

  it('does not pair when a chord-only line is followed by another chord-only line', () => {
    const parsedSong = parseChordProSongText(['[A] [Em] [Bm]', '[F#m] [D] [A]'].join('\n'));
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines.every((line) => line.type === 'lyric')).toBe(true);
    expect(renderableLines).toHaveLength(2);
  });

  it('does not pair a chord-only line that is the last line in the song', () => {
    const parsedSong = parseChordProSongText('[A] [Em] [Bm]');
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([{ type: 'lyric', tokens: expect.any(Array) }]);
  });

  it('does not pair when the following line already has its own inline chords', () => {
    const parsedSong = parseChordProSongText(['[D] [G]', '[C]Hello'].join('\n'));
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([
      { type: 'lyric', tokens: expect.any(Array) },
      { type: 'lyric', tokens: expect.any(Array) },
    ]);
  });

  it('collects a (...)xN-marked run of chord-only lines into a repeatedChordGroup, stripping the markers', () => {
    const parsedSong = parseChordProSongText(
      ['([A] [Em] [Bm]', '[F#m] [D] [A]) x2', '[A] [G]'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toHaveLength(2);
    const [group, tag] = renderableLines;
    expect(group.type).toBe('repeatedChordGroup');
    if (group.type !== 'repeatedChordGroup') throw new Error('expected repeatedChordGroup');
    expect(group.repeatCount).toBe(2);
    expect(group.groupLines).toHaveLength(2);
    // the leading "(" and trailing ") x2" markers must not leak into the chips
    expect(group.groupLines[0].map((t) => t.chordDisplayLabel)).toEqual(['A', 'Em', 'Bm']);
    expect(group.groupLines[0][0].lyricText).not.toContain('(');
    expect(group.groupLines[1].map((t) => t.chordDisplayLabel)).toEqual(['F#m', 'D', 'A']);
    expect(group.groupLines[1][2].lyricText).not.toContain(')');
    expect(group.groupLines[1][2].lyricText).not.toContain('x2');
    // the line after the closing marker is untouched, standalone, not part of the group
    expect(tag).toEqual({ type: 'lyric', tokens: expect.any(Array) });
  });

  it('supports a single-line group, e.g. "([A] [G]) x2"', () => {
    const parsedSong = parseChordProSongText('([A] [G]) x2');
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([
      {
        type: 'repeatedChordGroup',
        repeatCount: 2,
        groupLines: [
          [
            { chordSymbol: 'A', chordDisplayLabel: 'A', strumAccentGlyphs: null, lyricText: ' ' },
            { chordSymbol: 'G', chordDisplayLabel: 'G', strumAccentGlyphs: null, lyricText: '' },
          ],
        ],
      },
    ]);
  });

  it('falls back to normal rendering when an opening "(" is never closed with ")xN"', () => {
    const parsedSong = parseChordProSongText(['([A] [G]', '[Em] [D]'].join('\n'));
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines.every((line) => line.type === 'lyric')).toBe(true);
  });
});

describe('countLinesForBpmTiming', () => {
  it('counts a distributedChordLine pair as a single line, not two', () => {
    // Written the "chords above" way (two raw source lines)...
    const pairedSong = parseChordProSongText(['[D] [G]', 'Hello there'].join('\n'));
    // ...should time the same as writing the identical content inline (one raw line).
    const inlineSong = parseChordProSongText('[D]Hello [G]there');

    const pairedRenderableLines = groupParsedLinesForRendering(pairedSong.lines);
    const inlineRenderableLines = groupParsedLinesForRendering(inlineSong.lines);

    expect(countLinesForBpmTiming(pairedRenderableLines)).toBe(1);
    expect(countLinesForBpmTiming(inlineRenderableLines)).toBe(1);
  });

  it('counts each raw tab line individually rather than the tabBlock as one unit (§5.9)', () => {
    const parsedSong = parseChordProSongText(
      ['{start_of_tab}', 'e|-0-|', 'B|-1-|', 'G|-2-|', '{end_of_tab}'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(renderableLines).toEqual([{ type: 'tabBlock', tabLines: expect.any(Array) }]);
    expect(countLinesForBpmTiming(renderableLines)).toBe(3);
  });

  it('counts comment and strum lines as one line each, same as before', () => {
    const parsedSong = parseChordProSongText(
      ['{comment: Verse 1}', '{strum: D-DU-UDU-}', '[C]Hello'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    expect(countLinesForBpmTiming(renderableLines)).toBe(3);
  });

  it('counts a repeatedChordGroup as its line count times its repeat count, since it really plays that many times', () => {
    const parsedSong = parseChordProSongText(
      ['([A] [Em] [Bm]', '[F#m] [D] [A]) x2', '[A] [G]'].join('\n'),
    );
    const renderableLines = groupParsedLinesForRendering(parsedSong.lines);

    // 2 group lines * repeatCount 2 = 4, plus the standalone "[A] [G]" tag line = 5
    expect(countLinesForBpmTiming(renderableLines)).toBe(5);
  });
});

describe('splitLyricLineIntoRenderableTokens', () => {
  it('produces a leading chordless token when lyric text precedes the first chord', () => {
    const parsedSong = parseChordProSongText('word [C]word two');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    const tokens = splitLyricLineIntoRenderableTokens(lyricLine);

    expect(tokens).toEqual([
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: null, lyricText: 'word ' },
      { chordSymbol: 'C', chordDisplayLabel: 'C', strumAccentGlyphs: null, lyricText: 'word two' },
    ]);
  });

  it('renders a blank line between sections as a single spacing token so it keeps its line height', () => {
    // The leading-blank-line trim only strips blank lines at the very start of the
    // sheet, so a blank line after the metadata block (or between verses) survives
    // as an empty lyric line, matching how the Nocturne design prototype spaces
    // sections.
    const parsedSong = parseChordProSongText('{title: X}\n\n[C]Hi');
    const blankLyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(blankLyricLine).toEqual({ type: 'lyric', text: '', chords: [] });
    expect(splitLyricLineIntoRenderableTokens(blankLyricLine)).toEqual([
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: null, lyricText: ' ' },
    ]);
  });

  it('collapses back-to-back identical chords with nothing but whitespace between them into a "Chordx N" label', () => {
    const parsedSong = parseChordProSongText('[G][G]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'G', chordDisplayLabel: 'Gx2', strumAccentGlyphs: null, lyricText: '' },
    ]);
  });

  it('collapses four repeats the same way', () => {
    const parsedSong = parseChordProSongText('[G][G][G][G]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'G', chordDisplayLabel: 'Gx4', strumAccentGlyphs: null, lyricText: '' },
    ]);
  });

  it('collapses repeats separated only by whitespace, e.g. "[G] [G]"', () => {
    const parsedSong = parseChordProSongText('[G] [G]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'G', chordDisplayLabel: 'Gx2', strumAccentGlyphs: null, lyricText: '' },
    ]);
  });

  it('does not collapse the same chord reappearing later over different lyrics', () => {
    const parsedSong = parseChordProSongText('[G]word one [G]word two');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'G', chordDisplayLabel: 'G', strumAccentGlyphs: null, lyricText: 'word one ' },
      { chordSymbol: 'G', chordDisplayLabel: 'G', strumAccentGlyphs: null, lyricText: 'word two' },
    ]);
  });

  it('does not collapse different adjacent chords', () => {
    const parsedSong = parseChordProSongText('[A] [Em] [Bm]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'A', chordDisplayLabel: 'A', strumAccentGlyphs: null, lyricText: ' ' },
      { chordSymbol: 'Em', chordDisplayLabel: 'Em', strumAccentGlyphs: null, lyricText: ' ' },
      { chordSymbol: 'Bm', chordDisplayLabel: 'Bm', strumAccentGlyphs: null, lyricText: '' },
    ]);
  });

  it('treats a bracket of stroke glyphs as a strum accent, not a chord', () => {
    const parsedSong = parseChordProSongText('[A] [↓ ↓ ↓ ↓]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: 'A', chordDisplayLabel: 'A', strumAccentGlyphs: null, lyricText: ' ' },
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: '↓ ↓ ↓ ↓', lyricText: '' },
    ]);
  });

  it('normalizes strum-accent glyphs written without spaces', () => {
    const parsedSong = parseChordProSongText('[↓↓↓↓]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: '↓ ↓ ↓ ↓', lyricText: '' },
    ]);
  });

  it('never collapses strum-accent tokens the way it collapses repeated chords', () => {
    const parsedSong = parseChordProSongText('[↓][↓]');
    const lyricLine = parsedSong.lines[0] as LyricParsedLine;
    expect(splitLyricLineIntoRenderableTokens(lyricLine)).toEqual([
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: '↓', lyricText: '' },
      { chordSymbol: null, chordDisplayLabel: null, strumAccentGlyphs: '↓', lyricText: '' },
    ]);
  });
});

describe('convertStrumPatternToDisplay', () => {
  it('converts a D/U/X/- pattern into stroke glyphs', () => {
    expect(convertStrumPatternToDisplay('D-DU-UDU-')).toEqual({
      displayText: '↓ – ↓ ↑ – ↑ ↓ ↑ –',
      isGlyphPattern: true,
    });
  });

  it('separates multi-bar patterns at |', () => {
    const result = convertStrumPatternToDisplay('D-D-D-DU|D-D-D-DU');
    expect(result.isGlyphPattern).toBe(true);
    expect(result.displayText).toContain('   |   ');
  });

  it('falls back to a plain text label for non-D/U/X/-/| values', () => {
    expect(convertStrumPatternToDisplay('Finger picking')).toEqual({
      displayText: 'Finger picking',
      isGlyphPattern: false,
    });
  });
});
