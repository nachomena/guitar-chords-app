import {
  computeCentsOffsetFromTargetFrequency,
  findNearestStandardTuningStringIndex,
  STANDARD_GUITAR_TUNING_STRINGS,
} from './tuning';

describe('computeCentsOffsetFromTargetFrequency', () => {
  it('returns 0 cents when the detected frequency exactly matches the target', () => {
    expect(computeCentsOffsetFromTargetFrequency(110, 110)).toBe(0);
  });

  it('returns +1200 cents (one octave) when the detected frequency is double the target', () => {
    expect(computeCentsOffsetFromTargetFrequency(220, 110)).toBeCloseTo(1200, 5);
  });

  it('returns a small negative value for a slightly flat string', () => {
    // Roughly -15.8 cents for 1 Hz flat on the A2 string (110 Hz).
    expect(computeCentsOffsetFromTargetFrequency(109, 110)).toBeLessThan(0);
    expect(computeCentsOffsetFromTargetFrequency(109, 110)).toBeCloseTo(-15.81, 1);
  });
});

describe('findNearestStandardTuningStringIndex', () => {
  it.each(STANDARD_GUITAR_TUNING_STRINGS.map((string, index) => [index, string] as const))(
    'matches a frequency right on target for string %i (%s)',
    (expectedIndex, string) => {
      expect(findNearestStandardTuningStringIndex(string.targetFrequencyHz)).toBe(expectedIndex);
    },
  );

  it('still matches the nearest string when noticeably out of tune', () => {
    // A2 (110Hz) played 40 cents sharp should still resolve to A2, not D3.
    const fortyCentsSharpOfA2 = 110 * Math.pow(2, 40 / 1200);
    expect(findNearestStandardTuningStringIndex(fortyCentsSharpOfA2)).toBe(1);
  });

  it('picks whichever string is closer at the midpoint between two strings', () => {
    // Geometric midpoint between A2 (110Hz) and D3 (146.83Hz) — equidistant in cents.
    const midpointHz = Math.sqrt(110 * 146.83);
    const nearestIndex = findNearestStandardTuningStringIndex(midpointHz);
    expect([1, 2]).toContain(nearestIndex);

    // Nudge slightly toward D3 and confirm it flips.
    const slightlyTowardD3Hz = midpointHz * 1.001;
    expect(findNearestStandardTuningStringIndex(slightlyTowardD3Hz)).toBe(2);
  });
});
