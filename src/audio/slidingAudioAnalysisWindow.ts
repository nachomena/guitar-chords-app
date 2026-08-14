/**
 * Accumulates raw-PCM buffers delivered in small chunks (e.g. every ~46ms from a
 * live microphone stream) into one rolling analysis window long enough for reliable
 * low-frequency pitch detection — see the buffer-size finding documented in
 * pitchDetectionAlgorithm.ts. Keeps only the most recent `windowSampleCount` samples.
 */
export function appendSamplesToSlidingAnalysisWindow(
  existingWindow: Float32Array,
  newSamples: Float32Array,
  windowSampleCount: number,
): Float32Array {
  const combinedSampleCount = existingWindow.length + newSamples.length;
  const combinedWindow = new Float32Array(combinedSampleCount);
  combinedWindow.set(existingWindow, 0);
  combinedWindow.set(newSamples, existingWindow.length);

  if (combinedSampleCount <= windowSampleCount) {
    return combinedWindow;
  }

  return combinedWindow.slice(combinedSampleCount - windowSampleCount);
}
