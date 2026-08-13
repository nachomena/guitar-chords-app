// Pure helpers that turn a ParsedSong's flat line list into the shape ChordSheetView
// renders: lyric lines split into chord+text tokens (§5.1/§8.4), strum patterns turned
// into glyphs with a plain-text fallback (§5.8), and consecutive tab lines grouped
// into one block (§5.9/§8.4: "consecutive tab lines are grouped into one bordered
// block by the renderer").
import type { LyricParsedLine, ParsedLine, RenderableLyricToken } from './types';

/**
 * Non-standard extension: a bracket whose contents are entirely stroke glyphs
 * (↓/↑/x/–, the same vocabulary §5.8's `{strum: ...}` renders to) is a per-chord
 * strum accent rather than a chord name — e.g. `[A] [↓ ↓ ↓ ↓]` for "A, strummed
 * with 4 downstrokes" inline in an instrumental line. Only the glyph characters are
 * recognized here (not raw D/U/X/- letters), since a bare letter like "D" is
 * already a valid chord name and would be ambiguous.
 */
const STRUM_ACCENT_GLYPH_CHARACTERS_REGEX = /^[↓↑xX\-–\s]+$/;

function isStrumAccentBracketContent(bracketContent: string): boolean {
  return STRUM_ACCENT_GLYPH_CHARACTERS_REGEX.test(bracketContent);
}

function normalizeStrumAccentGlyphs(bracketContent: string): string {
  return bracketContent.replace(/\s+/g, '').split('').join(' ');
}

/**
 * Marker characters for an inline strum group — a "(" "..." ")" wrapped run of
 * chords within a line, given its own strum pattern (see `TokenRowSegment`'s doc
 * comment below for the full notation and rationale).
 */
const INLINE_GROUP_OPEN_MARKER_CHARACTER = '(';
const INLINE_GROUP_CLOSE_MARKER_CHARACTER = ')';

/**
 * Merges runs of consecutive tokens that repeat the same chord with no real lyric
 * text between them (a `[G][G]` back-to-back repeat some sources use to mark a chord
 * held an extra bar) into a single token labelled "Gx2" — but only when there's
 * nothing but whitespace between the repeats. A chord reappearing later in the line
 * over different lyrics (`[G]word one [G]word two`) is left untouched. Strum-accent
 * tokens (chordSymbol null) never start or extend a run.
 */
function collapseRepeatedChordTokens(tokens: RenderableLyricToken[]): RenderableLyricToken[] {
  const collapsedTokens: RenderableLyricToken[] = [];
  let runStartIndex = 0;

  while (runStartIndex < tokens.length) {
    const runChordSymbol = tokens[runStartIndex].chordSymbol;
    let runEndIndex = runStartIndex;

    while (
      runChordSymbol !== null &&
      runEndIndex + 1 < tokens.length &&
      tokens[runEndIndex + 1].chordSymbol === runChordSymbol &&
      tokens[runEndIndex].lyricText.trim() === ''
    ) {
      runEndIndex += 1;
    }

    const runLength = runEndIndex - runStartIndex + 1;
    const lastTokenInRun = tokens[runEndIndex];
    collapsedTokens.push(
      runLength > 1
        ? {
            ...lastTokenInRun,
            chordSymbol: runChordSymbol,
            chordDisplayLabel: runChordSymbol,
            repeatCountLabel: `x${runLength}`,
          }
        : lastTokenInRun,
    );

    runStartIndex = runEndIndex + 1;
  }

  return collapsedTokens;
}

export function splitLyricLineIntoRenderableTokens(
  lyricLine: LyricParsedLine,
): RenderableLyricToken[] {
  if (lyricLine.chords.length === 0) {
    const lyricText = lyricLine.text.length > 0 ? lyricLine.text : ' ';
    return [
      { chordSymbol: null, chordDisplayLabel: null, repeatCountLabel: null, strumAccentGlyphs: null, lyricText },
    ];
  }

  const chordPlacementsSortedByPosition = [...lyricLine.chords].sort(
    (firstPlacement, secondPlacement) => firstPlacement.charIndex - secondPlacement.charIndex,
  );

  const renderableTokens: RenderableLyricToken[] = [];

  const firstChordPlacement = chordPlacementsSortedByPosition[0];
  if (firstChordPlacement.charIndex > 0) {
    renderableTokens.push({
      chordSymbol: null,
      chordDisplayLabel: null,
      repeatCountLabel: null,
      strumAccentGlyphs: null,
      lyricText: lyricLine.text.slice(0, firstChordPlacement.charIndex),
    });
  }

  chordPlacementsSortedByPosition.forEach((chordPlacement, placementIndex) => {
    const nextChordPlacement = chordPlacementsSortedByPosition[placementIndex + 1];
    const textSegmentEndIndex = nextChordPlacement
      ? nextChordPlacement.charIndex
      : lyricLine.text.length;
    const lyricText = lyricLine.text.slice(chordPlacement.charIndex, textSegmentEndIndex);

    if (isStrumAccentBracketContent(chordPlacement.symbol)) {
      renderableTokens.push({
        chordSymbol: null,
        chordDisplayLabel: null,
        repeatCountLabel: null,
        strumAccentGlyphs: normalizeStrumAccentGlyphs(chordPlacement.symbol),
        lyricText,
      });
      return;
    }

    renderableTokens.push({
      chordSymbol: chordPlacement.symbol,
      chordDisplayLabel: chordPlacement.symbol,
      repeatCountLabel: null,
      strumAccentGlyphs: null,
      lyricText,
    });
  });

  return collapseRepeatedChordTokens(renderableTokens);
}

/**
 * Splits a `distributedChordLine`'s real lyric text into one word-chunk per chord
 * token, front-loaded so a short lyric (fewer words than chords, e.g. one ad-lib
 * word under three chords) lands entirely under the first chord(s) instead of
 * leaving later chords with nothing under them — which otherwise reads fine, but a
 * naive even split (last tokens get the leftover word) would put the word under the
 * *last* chord, which doesn't match how the phrase is actually sung. Letting each
 * chord keep its own word chunk (rather than the previous "spread chords evenly
 * across the full row width, print the whole lyric line separately underneath"
 * approach) also means the row's width now tracks the real lyric text's length
 * instead of ballooning out to the container's full width when the lyric is short.
 *
 * Chunks are sized by *character* length, not word count: each chord greedily takes
 * whole words until it's as close as it can get to an equal share (in characters) of
 * whatever text is still left, then hands the rest on to the remaining chords with a
 * freshly recomputed target. Splitting by word count alone looks visibly uneven the
 * moment word lengths vary — e.g. "asustes si me" (13 chars) next to "río como" (8
 * chars) for two chords that should otherwise look evenly spaced — since it ignores
 * how wide each chunk actually renders. Character count is a reasonable proxy for
 * render width without needing real text measurement (RN has no synchronous way to
 * measure text before layout).
 *
 * Strum-accent tokens (e.g. the `↓` in `[Em] [↓]`) never receive their own chunk —
 * an accent annotates the chord right before it rather than singing its own
 * syllable, so it always keeps an empty `lyricText`. Only "real" chord tokens
 * (`chordDisplayLabel !== null`) compete for word chunks — this also correctly
 * excludes a chordless leading text token (see `splitLyricLineIntoRenderableTokens`),
 * which a line-initial inline strum group's "(" can otherwise land on.
 *
 * Runs *before* `buildTokenRowSegments` in the render pipeline (a distributedChordLine
 * word-chunks its real lyric text first, then the result gets grouped into segments),
 * so any "(" / ")" inline-strum-group marker embedded in a token's original lyricText
 * (see `buildTokenRowSegments`'s doc comment) is preserved through the rewrite rather
 * than being silently overwritten — otherwise the group boundary those markers encode
 * would be destroyed before `buildTokenRowSegments` ever gets to read it.
 */
function preserveInlineGroupMarkers(originalLyricText: string, newLyricText: string): string {
  const hasOpenMarker = originalLyricText.includes(INLINE_GROUP_OPEN_MARKER_CHARACTER);
  const hasCloseMarker = originalLyricText.includes(INLINE_GROUP_CLOSE_MARKER_CHARACTER);
  if (!hasOpenMarker && !hasCloseMarker) return newLyricText;
  return `${hasOpenMarker ? INLINE_GROUP_OPEN_MARKER_CHARACTER : ''}${newLyricText}${hasCloseMarker ? INLINE_GROUP_CLOSE_MARKER_CHARACTER : ''}`;
}

export function distributeLyricWordsAcrossChordTokens(
  lyricText: string,
  chordTokens: RenderableLyricToken[],
): RenderableLyricToken[] {
  const trimmedLyricText = lyricText.trim();
  const words = trimmedLyricText.length > 0 ? trimmedLyricText.split(/\s+/) : [];

  const realChordTokenCount = chordTokens.filter((token) => token.chordDisplayLabel !== null).length;
  let wordCursor = 0;
  let realChordTokensAssignedSoFar = 0;

  return chordTokens.map((chordToken) => {
    if (chordToken.chordDisplayLabel === null) {
      return { ...chordToken, lyricText: preserveInlineGroupMarkers(chordToken.lyricText, '') };
    }

    realChordTokensAssignedSoFar += 1;
    const remainingWords = words.slice(wordCursor);
    const isLastRealChordToken = realChordTokensAssignedSoFar === realChordTokenCount;

    // The last chord always takes everything left over, rather than running the
    // same target-based logic — that avoids stray words being stranded by rounding
    // and matches the front-loading behavior above (a short remainder lands on the
    // next chord in line, never silently dropped).
    if (isLastRealChordToken || remainingWords.length === 0) {
      wordCursor = words.length;
      return { ...chordToken, lyricText: preserveInlineGroupMarkers(chordToken.lyricText, remainingWords.join(' ')) };
    }

    const chordTokensLeft = realChordTokenCount - realChordTokensAssignedSoFar + 1;
    const targetCharacterLength = remainingWords.join(' ').length / chordTokensLeft;

    let accumulatedLength = 0;
    let wordCountForThisToken = 0;
    for (const word of remainingWords) {
      if (wordCountForThisToken === 0) {
        // Always take at least one word, even if it already overshoots the target —
        // a chord can't be left with a genuinely empty chunk while words remain.
        accumulatedLength = word.length;
        wordCountForThisToken = 1;
        continue;
      }
      const prospectiveLength = accumulatedLength + 1 + word.length; // +1 for the joining space
      const overshootIfTaken = prospectiveLength - targetCharacterLength;
      const undershootIfStopped = targetCharacterLength - accumulatedLength;
      if (overshootIfTaken > undershootIfStopped) break;
      accumulatedLength = prospectiveLength;
      wordCountForThisToken += 1;
    }

    const wordsForThisToken = remainingWords.slice(0, wordCountForThisToken);
    wordCursor += wordCountForThisToken;
    return { ...chordToken, lyricText: preserveInlineGroupMarkers(chordToken.lyricText, wordsForThisToken.join(' ')) };
  });
}

/**
 * Non-standard extension: wrapping a run of chords in "(" "..." ")" *within* a
 * chord-only line, immediately followed by a strum-accent-glyph bracket, marks that
 * sub-group as strummed with its own pattern — distinct from the rest of the line,
 * which keeps whatever strum was already in effect. e.g.
 * ```
 * [Bm7] [Em] ([Em] [G])[↓–––↓––↑↓↑↓–––––]
 * ```
 * says "Bm7 and the first Em play normally; Em and G together are strummed with
 * that specific down/up pattern." This mirrors the whole-line `(...)xN` repeat-group
 * convention (§ `GROUP_OPEN_MARKER_REGEX` above) — same "(" "..." ")" bracketing —
 * but scoped to a run of chords *within* a line instead of whole lines, and with a
 * strum pattern instead of a repeat count. The pattern must use the same stroke-glyph
 * vocabulary (↓↑x–) as a single-chord strum accent, not raw D/U/X/- letters — a
 * letter-based pattern bracket would be ambiguous with a real chord name (e.g. a
 * bracket containing just "D" is already a valid chord).
 */
export type TokenRowSegment =
  | { type: 'token'; token: RenderableLyricToken; attachedStrumAccentGlyphs: string | null }
  | { type: 'inlineStrumGroup'; chordTokens: RenderableLyricToken[]; strumPatternGlyphs: string };

/**
 * Turns a line's flat token list into renderable segments: a plain chord/lyric token
 * (optionally carrying a single attached strum accent — see below), or an
 * `inlineStrumGroup` for a `(...)` sub-run of chords with its own strum pattern (see
 * this module's doc comment above `TokenRowSegment`).
 *
 * Also merges a strum-accent token that immediately follows a single chord (`[Em]
 * [↓]`, nothing but whitespace between them) into that chord's own segment as
 * `attachedStrumAccentGlyphs`, rather than leaving it as its own token. Rendering it
 * as an independent sibling token breaks down as soon as the chord's own lyricText is
 * long (e.g. a whole sung phrase under a distributedChordLine's word-chunked "Em"):
 * the chord's token box widens to fit that text, so the accent — positioned after
 * that whole wide box — ends up far to the right of the chord label it's meant to sit
 * beside, no matter how small the margin between the two tokens is. Attaching it to
 * the chord's own segment fixes this at the source.
 */
export function buildTokenRowSegments(tokens: RenderableLyricToken[]): TokenRowSegment[] {
  const segments: TokenRowSegment[] = [];
  let tokenIndex = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];

    if (token.strumAccentGlyphs === null && token.lyricText.includes(INLINE_GROUP_OPEN_MARKER_CHARACTER)) {
      const strippedOpenToken = {
        ...token,
        lyricText: token.lyricText.replace(INLINE_GROUP_OPEN_MARKER_CHARACTER, ''),
      };
      // When the group opens right at the start of a line, the "(" lands on its own
      // chordless leading token (see splitLyricLineIntoRenderableTokens's leading-text
      // token) — once stripped, that token has nothing left to show, so drop it
      // instead of rendering a pointless empty box.
      const isVacuousAfterStripping =
        strippedOpenToken.chordDisplayLabel === null &&
        strippedOpenToken.strumAccentGlyphs === null &&
        strippedOpenToken.lyricText.trim() === '';
      if (!isVacuousAfterStripping) {
        segments.push({ type: 'token', token: strippedOpenToken, attachedStrumAccentGlyphs: null });
      }
      tokenIndex += 1;

      const groupChordTokens: RenderableLyricToken[] = [];
      while (tokenIndex < tokens.length) {
        const groupToken = tokens[tokenIndex];
        const closesGroup = groupToken.lyricText.includes(INLINE_GROUP_CLOSE_MARKER_CHARACTER);
        groupChordTokens.push({
          ...groupToken,
          lyricText: groupToken.lyricText.replace(INLINE_GROUP_CLOSE_MARKER_CHARACTER, ''),
        });
        tokenIndex += 1;
        if (closesGroup) break;
      }

      const possiblePatternToken = tokens[tokenIndex];
      const strumPatternGlyphs = possiblePatternToken?.strumAccentGlyphs ?? null;
      if (strumPatternGlyphs !== null) tokenIndex += 1; // consumed as this group's pattern

      segments.push({ type: 'inlineStrumGroup', chordTokens: groupChordTokens, strumPatternGlyphs: strumPatternGlyphs ?? '' });
      continue;
    }

    if (token.strumAccentGlyphs === null && token.chordDisplayLabel !== null) {
      const nextToken = tokens[tokenIndex + 1];
      if (nextToken?.strumAccentGlyphs != null) {
        segments.push({ type: 'token', token, attachedStrumAccentGlyphs: nextToken.strumAccentGlyphs });
        tokenIndex += 2;
        continue;
      }
    }

    segments.push({ type: 'token', token, attachedStrumAccentGlyphs: null });
    tokenIndex += 1;
  }

  return segments;
}

const STRUM_STROKE_GLYPHS_BY_CHARACTER: Record<string, string> = {
  D: '↓',
  U: '↑',
  X: 'x',
  '-': '–',
};
const STRUM_PATTERN_CHARACTERS_REGEX = /^[DUX\-|]+$/i;

export type StrumPatternDisplay = { displayText: string; isGlyphPattern: boolean };

/**
 * Converts a `{strum: ...}` directive value into its display form. A pattern made
 * entirely of D/U/X/-/| characters becomes down/up/mute/rest glyphs grouped by bar;
 * anything else (e.g. "Finger picking") is rendered as a plain text label, per §5.8.
 */
export function convertStrumPatternToDisplay(strumPattern: string): StrumPatternDisplay {
  if (!STRUM_PATTERN_CHARACTERS_REGEX.test(strumPattern)) {
    return { displayText: strumPattern, isGlyphPattern: false };
  }
  const displayText = strumPattern
    .split('|')
    .map((bar) =>
      bar
        .split('')
        .map((character) => STRUM_STROKE_GLYPHS_BY_CHARACTER[character.toUpperCase()] ?? character)
        .join(' '),
    )
    .join('   |   ');
  return { displayText, isGlyphPattern: true };
}

export type RenderableChordSheetLine =
  | { type: 'lyric'; tokens: RenderableLyricToken[] }
  | { type: 'distributedChordLine'; chordTokens: RenderableLyricToken[]; lyricText: string }
  | { type: 'repeatedChordGroup'; groupLines: RenderableLyricToken[][]; repeatCount: number }
  | ({ type: 'strum' } & StrumPatternDisplay)
  | { type: 'comment'; text: string }
  | { type: 'tabBlock'; tabLines: string[] };

/**
 * A line that's nothing but chords (§6's "instrumental bar" — `[Em] [G] [D] [A]`),
 * i.e. it has at least one chord and no real lyric text once the brackets are
 * stripped.
 */
function isChordOnlyLine(lyricLine: LyricParsedLine): boolean {
  return lyricLine.chords.length > 0 && lyricLine.text.trim() === '';
}

/**
 * Non-standard extension: a chord-only line immediately followed by a plain lyric
 * line (no brackets at all) is a chords-above-lyrics pair — e.g.
 * ```
 * [D] [G] [D] [G]
 * Qué voy a hacer con tanto cielo para mí
 * ```
 * Rather than requiring the writer to align each chord to an exact character
 * column (hard to type and easy to get wrong), the chords are distributed evenly
 * across the line instead of tied to specific syllables. Only this exact pattern
 * (chord-only line → very next line is a bracket-free lyric line) triggers it, so a
 * genuine standalone instrumental line (one not meant to pair with what follows —
 * e.g. two chord-only lines in a row, or a chord-only line followed by a comment)
 * still renders as a normal instrumental line, unchanged.
 */
function isPairableLyricLine(lyricLine: LyricParsedLine): boolean {
  return lyricLine.chords.length === 0 && lyricLine.text.trim() !== '';
}

/**
 * Non-standard extension: one or more consecutive chord-only lines wrapped in a
 * leading "(" and a trailing ") xN" mark a repeated group — e.g.
 * ```
 * ([A] [Em] [Bm]
 * [F#m] [D] [A]) x2
 * [A] [G]
 * ```
 * says "these two lines repeat twice," distinct from — and not implying anything
 * about — whatever line comes after the closing marker (here, `[A] [G]`, which
 * plays once). The markers are stripped from the rendered chips; nothing repeats
 * the actual printed content, this only attaches a repeat-count label (the same
 * "show it once, label how many times it repeats" convention `{comment: ... (x2)}`
 * already uses elsewhere).
 */
const GROUP_OPEN_MARKER_REGEX = /^\s*\(/;
const GROUP_CLOSE_MARKER_REGEX = /\)\s*x(\d+)\s*$/i;

function isGroupableChordLine(lyricLine: LyricParsedLine): boolean {
  if (lyricLine.chords.length === 0) return false;
  const textWithoutMarkers = lyricLine.text
    .replace(GROUP_OPEN_MARKER_REGEX, '')
    .replace(GROUP_CLOSE_MARKER_REGEX, '');
  return textWithoutMarkers.trim() === '';
}

function stripLeadingGroupOpenMarkerToken(tokens: RenderableLyricToken[]): RenderableLyricToken[] {
  if (tokens.length === 0) return tokens;
  const [firstToken, ...restTokens] = tokens;
  if (firstToken.chordSymbol !== null || firstToken.strumAccentGlyphs !== null) return tokens;
  const strippedText = firstToken.lyricText.replace(GROUP_OPEN_MARKER_REGEX, '');
  if (strippedText.trim() === '') return restTokens;
  return [{ ...firstToken, lyricText: strippedText }, ...restTokens];
}

function stripTrailingGroupCloseMarkerToken(tokens: RenderableLyricToken[]): RenderableLyricToken[] {
  if (tokens.length === 0) return tokens;
  const lastIndex = tokens.length - 1;
  const lastToken = tokens[lastIndex];
  const strippedText = lastToken.lyricText.replace(GROUP_CLOSE_MARKER_REGEX, '');
  const newTokens = [...tokens];
  newTokens[lastIndex] = { ...lastToken, lyricText: strippedText };
  return newTokens;
}

/**
 * Groups a ParsedSong's flat line list into renderable units: merges consecutive
 * `tab` lines into a single `tabBlock` (§8.4), pairs a chord-only line with an
 * immediately-following plain lyric line into a `distributedChordLine` (see
 * `isPairableLyricLine` above), and collects a `(...)xN`-marked run of chord-only
 * lines into a `repeatedChordGroup` (see the marker regexes above).
 */
export function groupParsedLinesForRendering(
  parsedLines: ParsedLine[],
): RenderableChordSheetLine[] {
  const renderableLines: RenderableChordSheetLine[] = [];
  let pendingTabBlockLines: string[] = [];

  const flushPendingTabBlock = () => {
    if (pendingTabBlockLines.length > 0) {
      renderableLines.push({ type: 'tabBlock', tabLines: pendingTabBlockLines });
      pendingTabBlockLines = [];
    }
  };

  let lineIndex = 0;
  while (lineIndex < parsedLines.length) {
    const parsedLine = parsedLines[lineIndex];

    if (parsedLine.type === 'tab') {
      pendingTabBlockLines.push(parsedLine.text);
      lineIndex += 1;
      continue;
    }
    flushPendingTabBlock();

    if (
      parsedLine.type === 'lyric' &&
      GROUP_OPEN_MARKER_REGEX.test(parsedLine.text) &&
      isGroupableChordLine(parsedLine)
    ) {
      const groupParsedLines: LyricParsedLine[] = [];
      let groupRepeatCount: number | null = null;
      let scanIndex = lineIndex;
      while (scanIndex < parsedLines.length) {
        const candidateLine = parsedLines[scanIndex];
        if (candidateLine.type !== 'lyric' || !isGroupableChordLine(candidateLine)) break;
        groupParsedLines.push(candidateLine);
        const closeMatch = candidateLine.text.match(GROUP_CLOSE_MARKER_REGEX);
        scanIndex += 1;
        if (closeMatch) {
          groupRepeatCount = Number(closeMatch[1]);
          break;
        }
      }

      if (groupRepeatCount !== null) {
        const lastGroupLineIndex = groupParsedLines.length - 1;
        renderableLines.push({
          type: 'repeatedChordGroup',
          repeatCount: groupRepeatCount,
          groupLines: groupParsedLines.map((groupParsedLine, indexWithinGroup) => {
            let tokens = splitLyricLineIntoRenderableTokens(groupParsedLine);
            if (indexWithinGroup === 0) tokens = stripLeadingGroupOpenMarkerToken(tokens);
            if (indexWithinGroup === lastGroupLineIndex) tokens = stripTrailingGroupCloseMarkerToken(tokens);
            return tokens;
          }),
        });
        lineIndex = scanIndex;
        continue;
      }
      // No valid closing ")xN" marker was found before the lines stopped being
      // groupable — fall through and let the lines render normally below.
    }

    if (parsedLine.type === 'lyric' && isChordOnlyLine(parsedLine)) {
      const nextParsedLine = parsedLines[lineIndex + 1];
      if (nextParsedLine?.type === 'lyric' && isPairableLyricLine(nextParsedLine)) {
        renderableLines.push({
          type: 'distributedChordLine',
          chordTokens: splitLyricLineIntoRenderableTokens(parsedLine),
          lyricText: nextParsedLine.text,
        });
        lineIndex += 2;
        continue;
      }
    }

    if (parsedLine.type === 'lyric') {
      renderableLines.push({ type: 'lyric', tokens: splitLyricLineIntoRenderableTokens(parsedLine) });
    } else if (parsedLine.type === 'strum') {
      renderableLines.push({ type: 'strum', ...convertStrumPatternToDisplay(parsedLine.pattern) });
    } else {
      renderableLines.push({ type: 'comment', text: parsedLine.text });
    }
    lineIndex += 1;
  }
  flushPendingTabBlock();

  return renderableLines;
}

/**
 * How many "lines" the BPM scroll engine (§5.2) should treat a song as having.
 * This is deliberately *not* just `renderableLines.length` or the raw parsed line
 * count:
 * - A `tabBlock` groups N raw tab lines into one renderable unit, but §5.9 is
 *   explicit that each raw tab line should still get its own `beatsPerLine` share
 *   ("a 4-bar solo written as 4 tab lines naturally gets ~4 beats each") — so a
 *   tabBlock counts as its underlying tab-line count, not 1.
 * - A `distributedChordLine` merges a chord-only line with the lyric line it was
 *   paired with into one renderable/printed row, and should count as a single line
 *   for timing too — otherwise writing a line the "chords above" way (two raw
 *   source lines) would take twice as long to scroll past as writing the exact
 *   same content the inline-bracket way (one raw source line).
 * - A `repeatedChordGroup` is printed once but actually plays `repeatCount` times
 *   in the real song, so it counts as `groupLines.length * repeatCount` — the
 *   scroll engine gives it the real time it takes to play through, not just the
 *   time it takes to read the printed lines once.
 */
export function countLinesForBpmTiming(renderableLines: RenderableChordSheetLine[]): number {
  return renderableLines.reduce((totalLineCount, renderableLine) => {
    if (renderableLine.type === 'tabBlock') {
      return totalLineCount + renderableLine.tabLines.length;
    }
    if (renderableLine.type === 'repeatedChordGroup') {
      return totalLineCount + renderableLine.groupLines.length * renderableLine.repeatCount;
    }
    return totalLineCount + 1;
  }, 0);
}

/**
 * A `{comment: ...}` line isn't sung or played — it's a reference label — so it
 * shouldn't get scrolled past at the same pace as an actual musical line. This is
 * the weight it gets relative to a normal line (1) for `computeLineTimeWeights`.
 * Small enough to read as a quick transition, not zero (a zero-width segment would
 * be an instant jump, which the scroll engine is deliberately built to never do).
 */
const COMMENT_LINE_RELATIVE_TIME_WEIGHT = 0.2;

/**
 * Per-line relative time weights used to pace the scroll engine's auto-scroll
 * *within* a song's already-computed total duration (§5.2) — this doesn't change
 * how long the song takes overall, only how that fixed total gets distributed
 * across the chart: a `{comment: ...}` label gets a much smaller time slice than a
 * real musical line, so the scroll visibly speeds up while passing over it (a fast
 * transition, not an instant jump) and slows back down for the surrounding
 * content — the same total elapsed time still lands on the same total scroll
 * distance either way, since every other line's slice grows very slightly to
 * absorb what the comment gave up. Uses the same per-type weighting as
 * `countLinesForBpmTiming` for everything except comments.
 */
export function computeLineTimeWeights(renderableLines: RenderableChordSheetLine[]): number[] {
  return renderableLines.map((renderableLine) => {
    if (renderableLine.type === 'comment') return COMMENT_LINE_RELATIVE_TIME_WEIGHT;
    if (renderableLine.type === 'tabBlock') return renderableLine.tabLines.length;
    if (renderableLine.type === 'repeatedChordGroup') {
      return renderableLine.groupLines.length * renderableLine.repeatCount;
    }
    return 1;
  });
}
