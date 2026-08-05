// Distributes a song's already-computed total scroll duration (§5.2) unevenly
// across its lines, instead of one flat proportional rate across the whole chart.
// The motivating case: a `{comment: ...}` section label isn't sung or played, so it
// gets a much smaller time slice than a real musical line (see
// chordpro/rendering.ts's computeLineTimeWeights) — the scroll visibly speeds up
// while passing over it (a fast transition, not an instant jump) and slows back
// down for the surrounding content. The total elapsed time still lands on the same
// total scroll distance either way: every other line's slice grows very slightly to
// absorb what a comment line gave up, so this changes pacing only, never the song's
// overall duration.
export type ScrollPacingBreakpoint = {
  /** 0..1 — this line's end position as a fraction of the total elapsed time. */
  timeFraction: number;
  /** 0..1 — this line's end position as a fraction of the total scrollable pixels. */
  pixelFraction: number;
};

/** Used for a line whose real height hasn't been measured (via onLayout) yet. */
const DEFAULT_LINE_HEIGHT_ESTIMATE_PIXELS = 46;

export function buildScrollPacingBreakpoints(
  lineTimeWeights: number[],
  lineHeightsPixels: (number | undefined)[],
): ScrollPacingBreakpoint[] {
  const totalWeight = lineTimeWeights.reduce((sum, weight) => sum + weight, 0);
  const totalHeightPixels = lineTimeWeights.reduce(
    (sum: number, _weight, lineIndex) =>
      sum + (lineHeightsPixels[lineIndex] ?? DEFAULT_LINE_HEIGHT_ESTIMATE_PIXELS),
    0,
  );
  if (totalWeight <= 0 || totalHeightPixels <= 0) return [];

  const breakpoints: ScrollPacingBreakpoint[] = [];
  let cumulativeWeight = 0;
  let cumulativeHeightPixels = 0;
  for (let lineIndex = 0; lineIndex < lineTimeWeights.length; lineIndex += 1) {
    cumulativeWeight += lineTimeWeights[lineIndex];
    cumulativeHeightPixels += lineHeightsPixels[lineIndex] ?? DEFAULT_LINE_HEIGHT_ESTIMATE_PIXELS;
    breakpoints.push({
      timeFraction: cumulativeWeight / totalWeight,
      pixelFraction: cumulativeHeightPixels / totalHeightPixels,
    });
  }
  return breakpoints;
}

/** Walks a piecewise-linear mapping in the given direction, both fractions 0..1. */
function interpolatePiecewise(
  inputFraction: number,
  breakpoints: ScrollPacingBreakpoint[],
  readInput: (breakpoint: ScrollPacingBreakpoint) => number,
  readOutput: (breakpoint: ScrollPacingBreakpoint) => number,
): number {
  if (breakpoints.length === 0) return inputFraction;
  const clampedInputFraction = Math.min(1, Math.max(0, inputFraction));

  let previousInput = 0;
  let previousOutput = 0;
  for (const breakpoint of breakpoints) {
    const breakpointInput = readInput(breakpoint);
    const breakpointOutput = readOutput(breakpoint);
    const isFinalBreakpoint = breakpoint === breakpoints[breakpoints.length - 1];
    if (clampedInputFraction <= breakpointInput || isFinalBreakpoint) {
      const segmentInputSpan = breakpointInput - previousInput;
      const segmentProgress =
        segmentInputSpan > 0 ? (clampedInputFraction - previousInput) / segmentInputSpan : 0;
      return previousOutput + segmentProgress * (breakpointOutput - previousOutput);
    }
    previousInput = breakpointInput;
    previousOutput = breakpointOutput;
  }
  return 1;
}

export function mapTimeFractionToPixelFraction(
  timeFraction: number,
  breakpoints: ScrollPacingBreakpoint[],
): number {
  return interpolatePiecewise(
    timeFraction,
    breakpoints,
    (breakpoint) => breakpoint.timeFraction,
    (breakpoint) => breakpoint.pixelFraction,
  );
}

export function mapPixelFractionToTimeFraction(
  pixelFraction: number,
  breakpoints: ScrollPacingBreakpoint[],
): number {
  return interpolatePiecewise(
    pixelFraction,
    breakpoints,
    (breakpoint) => breakpoint.pixelFraction,
    (breakpoint) => breakpoint.timeFraction,
  );
}
