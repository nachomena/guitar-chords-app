import type { PitchDetectionSampleListener, PitchDetector } from './PitchDetector';

/**
 * Stands in for the real on-device pitch-detection pipeline (useRealAudioStudioPitchDetector.ts)
 * while running inside Expo Go, which can't load that native module — see
 * usePitchDetector.ts. Deliberately never reports a frequency, rather than
 * fabricating fake detections that would make the Tuner appear to work when it doesn't.
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
