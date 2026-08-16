// Wraps pitchfinder's YIN implementation (SPEC.md §8.8's suggested algorithm) behind
// a minimal, pure function so it can be validated against synthetic tones
// (pitchDetectionAlgorithm.test.ts) before any real microphone capture exists.
//
// Buffer-size finding from that validation: YIN can only resolve periods up to
// roughly half of the analysis window it's given (it derives its search buffer as
// the largest power-of-two no bigger than half the input length), so the ~2048-sample
// buffer size SPEC.md §8.8 suggests as an example (~46ms at 44.1kHz) cannot reliably
// detect the guitar's low E string at 82.41Hz — that needs a window covering at least
// a few full periods, i.e. tens of milliseconds more than 46ms provides. The Tuner
// isn't latency-sensitive (nobody needs a tuning needle to react in under 50ms), so
// the real capture pipeline should accumulate several raw capture buffers into one
// larger analysis window
// (GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT below) before running
// this function, rather than running it on each raw buffer directly.
import Pitchfinder from 'pitchfinder';

/** ~186ms at 44.1kHz — comfortably covers several periods of the lowest guitar string (E2, 82.41Hz). */
export const GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT = 8192;

const GUITAR_STRING_MINIMUM_DETECTABLE_FREQUENCY_HERTZ = 70;
const GUITAR_STRING_MAXIMUM_DETECTABLE_FREQUENCY_HERTZ = 1200;

export function createGuitarStringPitchDetectionFunction(
  sampleRateHertz: number,
): (audioBuffer: Float32Array) => number | null {
  const detectPitchWithYinAlgorithm = Pitchfinder.YIN({ sampleRate: sampleRateHertz });

  return (audioBuffer: Float32Array): number | null => {
    const detectedFrequencyHertz = detectPitchWithYinAlgorithm(audioBuffer);
    if (detectedFrequencyHertz === null) return null;
    if (
      detectedFrequencyHertz < GUITAR_STRING_MINIMUM_DETECTABLE_FREQUENCY_HERTZ ||
      detectedFrequencyHertz > GUITAR_STRING_MAXIMUM_DETECTABLE_FREQUENCY_HERTZ
    ) {
      return null;
    }
    return detectedFrequencyHertz;
  };
}
