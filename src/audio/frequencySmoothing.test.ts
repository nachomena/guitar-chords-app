import { createExponentialMovingAverageFrequencySmoother } from './frequencySmoothing';

describe('createExponentialMovingAverageFrequencySmoother', () => {
  it('snaps to the first reading immediately (no lag on the very first sample)', () => {
    const smoothFrequency = createExponentialMovingAverageFrequencySmoother(0.3);
    expect(smoothFrequency(110)).toBe(110);
  });

  it('moves partway toward each new reading rather than jumping straight to it', () => {
    const smoothFrequency = createExponentialMovingAverageFrequencySmoother(0.3);
    smoothFrequency(100);
    const secondSmoothedValue = smoothFrequency(200);
    expect(secondSmoothedValue).toBeGreaterThan(100);
    expect(secondSmoothedValue).toBeLessThan(200);
    expect(secondSmoothedValue).toBeCloseTo(130, 5);
  });

  it('converges toward a steady input over repeated readings', () => {
    const smoothFrequency = createExponentialMovingAverageFrequencySmoother(0.3);
    let lastValue: number | null = null;
    for (let i = 0; i < 50; i += 1) {
      lastValue = smoothFrequency(220);
    }
    expect(lastValue).toBeCloseTo(220, 5);
  });

  it('resets immediately on null instead of holding a stale value', () => {
    const smoothFrequency = createExponentialMovingAverageFrequencySmoother(0.3);
    smoothFrequency(110);
    expect(smoothFrequency(null)).toBeNull();
    // A fresh reading after silence should snap immediately again, not resume easing
    // from the old smoothed value.
    expect(smoothFrequency(330)).toBe(330);
  });
});
