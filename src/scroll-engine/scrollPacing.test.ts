import {
  buildScrollPacingBreakpoints,
  mapPixelFractionToTimeFraction,
  mapTimeFractionToPixelFraction,
} from './scrollPacing';

describe('buildScrollPacingBreakpoints', () => {
  it('returns an empty array when there are no lines', () => {
    expect(buildScrollPacingBreakpoints([], [])).toEqual([]);
  });

  it('produces cumulative fractions that end at exactly 1', () => {
    const breakpoints = buildScrollPacingBreakpoints([1, 1, 1], [40, 60, 50]);
    const lastBreakpoint = breakpoints[breakpoints.length - 1];
    expect(lastBreakpoint.timeFraction).toBeCloseTo(1);
    expect(lastBreakpoint.pixelFraction).toBeCloseTo(1);
  });
});

describe('mapTimeFractionToPixelFraction', () => {
  it('falls back to identity mapping when there is no per-line data yet', () => {
    expect(mapTimeFractionToPixelFraction(0.42, [])).toBe(0.42);
  });

  it('is a straight line when every line has equal weight and equal height', () => {
    const breakpoints = buildScrollPacingBreakpoints([1, 1, 1, 1], [50, 50, 50, 50]);
    expect(mapTimeFractionToPixelFraction(0.5, breakpoints)).toBeCloseTo(0.5, 5);
    expect(mapTimeFractionToPixelFraction(0.25, breakpoints)).toBeCloseTo(0.25, 5);
  });

  it('moves through a low-weight (comment) line faster than a normal line of the same height', () => {
    // Line 0: a real line (weight 1). Line 1: a comment (weight 0.2). Line 2: a real line (weight 1).
    // All three lines happen to be the same pixel height, isolating the weight's effect.
    const lineTimeWeights = [1, 0.2, 1];
    const lineHeightsPixels = [50, 50, 50];
    const breakpoints = buildScrollPacingBreakpoints(lineTimeWeights, lineHeightsPixels);

    // Time spent inside the comment's own segment (weight 0.2 of total weight 2.2).
    const commentSegmentStartTimeFraction = 1 / 2.2;
    const commentSegmentEndTimeFraction = 1.2 / 2.2;
    const pixelFractionAtCommentStart = mapTimeFractionToPixelFraction(
      commentSegmentStartTimeFraction,
      breakpoints,
    );
    const pixelFractionAtCommentEnd = mapTimeFractionToPixelFraction(
      commentSegmentEndTimeFraction,
      breakpoints,
    );

    const pixelsCoveredDuringComment = pixelFractionAtCommentEnd - pixelFractionAtCommentStart;
    const pixelsCoveredDuringFirstRealLine = pixelFractionAtCommentStart - 0;

    // The comment line covers the same real pixel share (1/3 of total height) in a
    // much smaller time slice than the equally-tall real line before it — i.e. the
    // scroll moves faster (more pixels per unit of elapsed time) through it.
    expect(pixelsCoveredDuringComment).toBeCloseTo(pixelsCoveredDuringFirstRealLine, 5);
    const commentSegmentTimeSpan = commentSegmentEndTimeFraction - commentSegmentStartTimeFraction;
    const firstLineSegmentTimeSpan = commentSegmentStartTimeFraction - 0;
    expect(commentSegmentTimeSpan).toBeLessThan(firstLineSegmentTimeSpan);
  });

  it('clamps out-of-range input', () => {
    const breakpoints = buildScrollPacingBreakpoints([1, 1], [50, 50]);
    expect(mapTimeFractionToPixelFraction(-1, breakpoints)).toBe(0);
    expect(mapTimeFractionToPixelFraction(2, breakpoints)).toBe(1);
  });
});

describe('mapPixelFractionToTimeFraction', () => {
  it('is the inverse of mapTimeFractionToPixelFraction', () => {
    const breakpoints = buildScrollPacingBreakpoints([1, 0.2, 1, 1], [40, 30, 70, 55]);
    for (const originalTimeFraction of [0, 0.1, 0.37, 0.6, 0.9, 1]) {
      const pixelFraction = mapTimeFractionToPixelFraction(originalTimeFraction, breakpoints);
      const roundTrippedTimeFraction = mapPixelFractionToTimeFraction(pixelFraction, breakpoints);
      expect(roundTrippedTimeFraction).toBeCloseTo(originalTimeFraction, 5);
    }
  });

  it('falls back to identity mapping when there is no per-line data yet', () => {
    expect(mapPixelFractionToTimeFraction(0.7, [])).toBe(0.7);
  });
});
