// A small hand-written parser for the ChordPro-style chord sheet format described in
// SPEC.md §6. Pure and independent of React so it can be unit-tested directly (§8.4).
import type {
  ChordPlacement,
  CommentParsedLine,
  LyricParsedLine,
  ParsedLine,
  ParsedSong,
  SongMetadata,
} from './types';

const START_OF_TAB_DIRECTIVE_REGEX = /^\{(start_of_tab|sot)\}$/i;
const END_OF_TAB_DIRECTIVE_REGEX = /^\{(end_of_tab|eot)\}$/i;
const DIRECTIVE_WITH_VALUE_REGEX = /^\{([a-zA-Z_]+):\s*([^}]*)\}$/;
const CHORD_MARKER_REGEX = /\[([^\]]+)\]/g;

function createEmptySongMetadata(): SongMetadata {
  return {
    title: null,
    artist: null,
    key: null,
    bpm: null,
    timeSignature: null,
    capo: null,
    durationSeconds: null,
  };
}

function parseTimeSignatureDirectiveValue(
  rawValue: string,
): { numerator: number; denominator: number } | null {
  const match = rawValue.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function parseDurationDirectiveValueToSeconds(rawValue: string): number | null {
  const match = rawValue.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseIntegerDirectiveValue(rawValue: string): number | null {
  const parsedNumber = Number(rawValue.trim());
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

function parseLyricLineWithInlineChords(rawLine: string): LyricParsedLine {
  let strippedText = '';
  const chordPlacements: ChordPlacement[] = [];
  let cursorPosition = 0;

  CHORD_MARKER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CHORD_MARKER_REGEX.exec(rawLine)) !== null) {
    strippedText += rawLine.slice(cursorPosition, match.index);
    chordPlacements.push({ charIndex: strippedText.length, symbol: match[1] });
    cursorPosition = CHORD_MARKER_REGEX.lastIndex;
  }
  strippedText += rawLine.slice(cursorPosition);

  return { type: 'lyric', text: strippedText, chords: chordPlacements };
}

/**
 * Parses raw ChordPro-style chord sheet source text into a render-ready structure:
 * song-level metadata directives plus an ordered list of lines (lyric, strum-marker,
 * comment/section-label, or tab). See SPEC.md §6 and §8.4.
 */
export function parseChordProSongText(chordProSourceText: string): ParsedSong {
  const metadata = createEmptySongMetadata();
  const lines: ParsedLine[] = [];

  const rawLines = (chordProSourceText ?? '').split('\n');
  while (rawLines.length > 0 && rawLines[0].trim() === '') {
    rawLines.shift();
  }

  let isInsideTabBlock = false;

  for (const rawLine of rawLines) {
    const trimmedLine = rawLine.trim();

    if (isInsideTabBlock) {
      if (END_OF_TAB_DIRECTIVE_REGEX.test(trimmedLine)) {
        isInsideTabBlock = false;
        continue;
      }
      lines.push({ type: 'tab', text: rawLine });
      continue;
    }

    if (START_OF_TAB_DIRECTIVE_REGEX.test(trimmedLine)) {
      isInsideTabBlock = true;
      continue;
    }

    const directiveMatch = trimmedLine.match(DIRECTIVE_WITH_VALUE_REGEX);
    if (directiveMatch) {
      const directiveName = directiveMatch[1].toLowerCase();
      const directiveValue = directiveMatch[2].trim();

      switch (directiveName) {
        case 'title':
          metadata.title = directiveValue;
          break;
        case 'artist':
          metadata.artist = directiveValue;
          break;
        case 'key':
          metadata.key = directiveValue;
          break;
        case 'bpm':
          metadata.bpm = parseIntegerDirectiveValue(directiveValue) ?? metadata.bpm;
          break;
        case 'time':
          metadata.timeSignature =
            parseTimeSignatureDirectiveValue(directiveValue) ?? metadata.timeSignature;
          break;
        case 'capo':
          metadata.capo = parseIntegerDirectiveValue(directiveValue) ?? metadata.capo;
          break;
        case 'duration':
          metadata.durationSeconds =
            parseDurationDirectiveValueToSeconds(directiveValue) ?? metadata.durationSeconds;
          break;
        case 'comment': {
          const commentLine: CommentParsedLine = { type: 'comment', text: directiveValue };
          lines.push(commentLine);
          break;
        }
        case 'strum':
          lines.push({ type: 'strum', pattern: directiveValue });
          break;
        default:
          // Unrecognized directive — not meaningful content, so it isn't rendered.
          break;
      }
      continue;
    }

    // A malformed/unrecognized brace line that didn't match the directive pattern
    // above (e.g. missing a colon) — still not lyric content.
    if (trimmedLine.startsWith('{')) continue;

    lines.push(parseLyricLineWithInlineChords(rawLine));
  }

  return { metadata, lines };
}
