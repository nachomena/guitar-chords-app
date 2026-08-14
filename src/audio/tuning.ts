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

/**
 * SPEC.md §5.6's auto string detection: no manual picker needed — find whichever of
 * the 6 standard-tuning notes the detected pitch is closest to (by cents, not raw Hz
 * difference, so this stays correct across the whole frequency range).
 */
export function findNearestStandardTuningStringIndex(detectedFrequencyHz: number): number {
  let nearestStringIndex = 0;
  let smallestAbsoluteCentsOffset = Infinity;

  STANDARD_GUITAR_TUNING_STRINGS.forEach((string, stringIndex) => {
    const absoluteCentsOffset = Math.abs(
      computeCentsOffsetFromTargetFrequency(detectedFrequencyHz, string.targetFrequencyHz),
    );
    if (absoluteCentsOffset < smallestAbsoluteCentsOffset) {
      smallestAbsoluteCentsOffset = absoluteCentsOffset;
      nearestStringIndex = stringIndex;
    }
  });

  return nearestStringIndex;
}
