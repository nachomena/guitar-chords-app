// Splits a stored `chordSheet` (which carries the song-level metadata directives —
// title/artist/key/bpm/time/capo/duration — as its first lines, §6) back into just
// the editable body text for the Song Editor, which edits those fields separately
// (§5.1). Only the song-level metadata directive lines are stripped; body directives
// (`{comment: ...}`, `{strum: ...}`, `{start_of_tab}`/`{end_of_tab}`) are kept intact
// so re-opening an existing song for editing doesn't silently drop them.
const SONG_LEVEL_METADATA_DIRECTIVE_NAMES = new Set([
  'title',
  'artist',
  'key',
  'bpm',
  'time',
  'capo',
  'duration',
]);

export function extractEditableChordSheetBodyText(chordProSourceText: string): string {
  const lines = (chordProSourceText ?? '').split('\n');
  const bodyLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    const directiveWithValueMatch = trimmedLine.match(/^\{([a-zA-Z_]+):/);
    if (!directiveWithValueMatch) return true;
    return !SONG_LEVEL_METADATA_DIRECTIVE_NAMES.has(directiveWithValueMatch[1].toLowerCase());
  });
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
    bodyLines.shift();
  }
  return bodyLines.join('\n');
}
