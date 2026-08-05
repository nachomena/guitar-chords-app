// The fallback scroll-speed source (SPEC.md §5.2), used only when no duration is
// set: each line advances proportionally to how many musical beats it spans.
// beatsPerLine defaults to the time signature's numerator (no per-line override UI
// in this pass — see SPEC.md §5.2's "overridable per line" note).
export function computeTotalDurationMillisecondsFromBpmClock(parameters: {
  beatsPerMinute: number;
  beatsPerLine: number;
  lineCount: number;
}): number {
  const millisecondsPerBeat = 60000 / parameters.beatsPerMinute;
  const millisecondsPerLine = millisecondsPerBeat * parameters.beatsPerLine;
  return Math.max(1, parameters.lineCount) * millisecondsPerLine;
}
