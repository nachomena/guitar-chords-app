import { appendSamplesToSlidingAnalysisWindow } from './slidingAudioAnalysisWindow';

describe('appendSamplesToSlidingAnalysisWindow', () => {
  it('grows the window while under the target sample count', () => {
    const firstChunk = Float32Array.from([1, 2, 3]);
    const windowAfterFirstChunk = appendSamplesToSlidingAnalysisWindow(
      new Float32Array(0),
      firstChunk,
      10,
    );
    expect(Array.from(windowAfterFirstChunk)).toEqual([1, 2, 3]);

    const secondChunk = Float32Array.from([4, 5]);
    const windowAfterSecondChunk = appendSamplesToSlidingAnalysisWindow(
      windowAfterFirstChunk,
      secondChunk,
      10,
    );
    expect(Array.from(windowAfterSecondChunk)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps only the most recent windowSampleCount samples once full', () => {
    const existingWindow = Float32Array.from([1, 2, 3, 4, 5]);
    const newSamples = Float32Array.from([6, 7]);

    const slidWindow = appendSamplesToSlidingAnalysisWindow(existingWindow, newSamples, 5);

    expect(Array.from(slidWindow)).toEqual([3, 4, 5, 6, 7]);
  });

  it('drops old samples even when a single incoming chunk exceeds the window size', () => {
    const existingWindow = Float32Array.from([1, 2]);
    const newSamples = Float32Array.from([3, 4, 5, 6, 7]);

    const slidWindow = appendSamplesToSlidingAnalysisWindow(existingWindow, newSamples, 3);

    expect(Array.from(slidWindow)).toEqual([5, 6, 7]);
  });
});
