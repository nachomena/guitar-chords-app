/**
 * Smooths a noisy stream of detected frequencies (SPEC.md §8.8: "Smooth the
 * displayed value... so the needle doesn't jitter frame-to-frame") via an
 * exponential moving average. Resets immediately on `null` (detection lost) rather
 * than holding onto a stale smoothed value once the player stops.
 *
 * `smoothingFactor` is how much each new reading moves the smoothed value toward
 * it, from 0 (frozen, ignores new readings) to 1 (no smoothing at all).
 */
export function createExponentialMovingAverageFrequencySmoother(smoothingFactor: number) {
  let smoothedFrequencyHz: number | null = null;

  return (newFrequencyHz: number | null): number | null => {
    if (newFrequencyHz === null) {
      smoothedFrequencyHz = null;
      return null;
    }

    smoothedFrequencyHz =
      smoothedFrequencyHz === null
        ? newFrequencyHz
        : smoothedFrequencyHz + smoothingFactor * (newFrequencyHz - smoothedFrequencyHz);

    return smoothedFrequencyHz;
  };
}
