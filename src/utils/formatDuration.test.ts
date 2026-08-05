import { formatSecondsAsMinutesColonSeconds } from './formatDuration';

describe('formatSecondsAsMinutesColonSeconds', () => {
  it('pads single-digit seconds with a leading zero', () => {
    expect(formatSecondsAsMinutesColonSeconds(65)).toBe('1:05');
  });

  it('formats a whole number of minutes', () => {
    expect(formatSecondsAsMinutesColonSeconds(180)).toBe('3:00');
  });

  it('rounds fractional seconds', () => {
    expect(formatSecondsAsMinutesColonSeconds(59.6)).toBe('1:00');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatSecondsAsMinutesColonSeconds(-5)).toBe('0:00');
  });
});
