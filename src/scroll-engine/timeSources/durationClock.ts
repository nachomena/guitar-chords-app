// The primary scroll-speed source (SPEC.md §5.2): a straight linear interpolation
// across the whole chart over the song's real-world duration. No per-line beat
// accounting needed.
export function computeTotalDurationMillisecondsFromDurationClock(
  durationSeconds: number,
): number {
  return durationSeconds * 1000;
}
