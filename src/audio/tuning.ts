// SPEC.md §8.8 — the standard-tuning target frequencies and the cents-off-target
// formula, kept as pure/testable functions independent of any pitch-detector
// implementation.
export const STANDARD_GUITAR_TUNING_STRINGS = [
  { label: 'E', noteName: 'E2', targetFrequencyHz: 82.41 },
  { label: 'A', noteName: 'A2', targetFrequencyHz: 110.0 },
  { label: 'D', noteName: 'D3', targetFrequencyHz: 146.83 },
  { label: 'G', noteName: 'G3', targetFrequencyHz: 196.0 },
  { label: 'B', noteName: 'B3', targetFrequencyHz: 246.94 },
  { label: 'E', noteName: 'E4', targetFrequencyHz: 329.63 },
] as const;

export function computeCentsOffsetFromTargetFrequency(
  detectedFrequencyHz: number,
  targetFrequencyHz: number,
): number {
  return 1200 * Math.log2(detectedFrequencyHz / targetFrequencyHz);
}
