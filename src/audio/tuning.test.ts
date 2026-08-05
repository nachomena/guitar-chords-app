import { computeCentsOffsetFromTargetFrequency } from './tuning';

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
