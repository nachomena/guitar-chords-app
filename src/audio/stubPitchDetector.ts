import type { PitchDetectionSampleListener, PitchDetector } from './PitchDetector';

/**
 * Stands in for the real on-device pitch-detection pipeline (SPEC.md §8.8) until a
 * native streaming-audio module is built and tested on a physical device (this
 * environment has no simulator/device to verify one against — see the
 * implementation plan). Deliberately never reports an onset or a frequency, rather
 * than fabricating fake detections that would make Follow Mode/the Tuner appear to
 * work when they don't.
 */
class StubPitchDetector implements PitchDetector {
  readonly isImplemented = false;

  async requestMicrophonePermission(): Promise<boolean> {
    return false;
  }

  async startListening(_onSample: PitchDetectionSampleListener): Promise<void> {
    // Intentionally never invokes the listener — no real mic capture in this build.
  }

  async stopListening(): Promise<void> {}
}

export const stubPitchDetector: PitchDetector = new StubPitchDetector();
