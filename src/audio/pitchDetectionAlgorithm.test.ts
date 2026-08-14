import { computeCentsOffsetFromTargetFrequency, STANDARD_GUITAR_TUNING_STRINGS } from './tuning';
import {
  createGuitarStringPitchDetectionFunction,
  GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
} from './pitchDetectionAlgorithm';

const TEST_SAMPLE_RATE_HERTZ = 44100;

function generateSineWaveAudioBuffer(
  frequencyHertz: number,
  sampleCount: number,
  sampleRateHertz: number,
): Float32Array {
  const audioBuffer = new Float32Array(sampleCount);
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    audioBuffer[sampleIndex] = Math.sin(
      (2 * Math.PI * frequencyHertz * sampleIndex) / sampleRateHertz,
    );
  }
  return audioBuffer;
}

function generateWhiteNoiseAudioBuffer(sampleCount: number): Float32Array {
  const audioBuffer = new Float32Array(sampleCount);
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    audioBuffer[sampleIndex] = Math.random() * 2 - 1;
  }
  return audioBuffer;
}

describe('createGuitarStringPitchDetectionFunction', () => {
  const detectPitch = createGuitarStringPitchDetectionFunction(TEST_SAMPLE_RATE_HERTZ);

  it.each(STANDARD_GUITAR_TUNING_STRINGS)(
    'detects a clean $noteName tone ($targetFrequencyHz Hz) within 10 cents',
    ({ targetFrequencyHz }) => {
      const audioBuffer = generateSineWaveAudioBuffer(
        targetFrequencyHz,
        GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
        TEST_SAMPLE_RATE_HERTZ,
      );

      const detectedFrequencyHertz = detectPitch(audioBuffer);

      expect(detectedFrequencyHertz).not.toBeNull();
      const centsOffset = computeCentsOffsetFromTargetFrequency(
        detectedFrequencyHertz as number,
        targetFrequencyHz,
      );
      expect(Math.abs(centsOffset)).toBeLessThan(10);
    },
  );

  it('returns null for silence', () => {
    const silentBuffer = new Float32Array(
      GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
    );
    expect(detectPitch(silentBuffer)).toBeNull();
  });

  it('returns null for unpitched white noise', () => {
    const noiseBuffer = generateWhiteNoiseAudioBuffer(
      GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
    );
    expect(detectPitch(noiseBuffer)).toBeNull();
  });

  it('returns null for a tone far outside the guitar string range', () => {
    const ultrasonicTonebuffer = generateSineWaveAudioBuffer(
      5000,
      GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
      TEST_SAMPLE_RATE_HERTZ,
    );
    expect(detectPitch(ultrasonicTonebuffer)).toBeNull();
  });

  it('reports a confidently wrong frequency for the low E string in a short ~46ms buffer (documents the buffer-size finding)', () => {
    // This is worse than returning null: the analysis window is too short to find the
    // true ~535-sample period of E2, so YIN locks onto a shorter, spurious period
    // instead of failing safe — the UI would show a plausible-looking but wrong
    // reading rather than "no pitch detected." This is why the real capture pipeline
    // must accumulate a large-enough analysis window (see the module comment in
    // pitchDetectionAlgorithm.ts) rather than run detection on each raw ~46ms buffer.
    const shortBufferSampleCount = 2048;
    const lowEStringTargetFrequencyHertz = STANDARD_GUITAR_TUNING_STRINGS[0].targetFrequencyHz;
    const shortAudioBuffer = generateSineWaveAudioBuffer(
      lowEStringTargetFrequencyHertz,
      shortBufferSampleCount,
      TEST_SAMPLE_RATE_HERTZ,
    );

    const detectedFrequencyHertz = detectPitch(shortAudioBuffer);

    expect(detectedFrequencyHertz).not.toBeNull();
    const centsOffset = computeCentsOffsetFromTargetFrequency(
      detectedFrequencyHertz as number,
      lowEStringTargetFrequencyHertz,
    );
    expect(Math.abs(centsOffset)).toBeGreaterThan(50);
  });
});
