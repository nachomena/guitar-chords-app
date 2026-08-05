// The interface both Follow Mode (§5.5) and the Tuner (§5.6) consume — onset
// detection and continuous pitch tracking are two ways of using the same
// mic-capture + pitch-detection pipeline described in §8.8. Swapping the stub
// implementation (stubPitchDetector.ts) for a real one backed by a native
// streaming-audio module is a single-file change: no UI or state code depends on
// which implementation is wired up.
export type PitchDetectionSample = {
  /** A new note onset was detected in this analysis window (vs. a sustained note still ringing). */
  isOnsetDetected: boolean;
  /** A fundamental frequency is present at all, within the guitar's range (~80Hz–1200Hz). */
  isFundamentalFrequencyPresent: boolean;
  estimatedFrequencyHz: number | null;
};

export type PitchDetectionSampleListener = (sample: PitchDetectionSample) => void;

export interface PitchDetector {
  /** False for the stub implementation — callers use this to show honest "not yet available" affordances instead of pretending to detect pitch. */
  readonly isImplemented: boolean;
  requestMicrophonePermission(): Promise<boolean>;
  startListening(onSample: PitchDetectionSampleListener): Promise<void>;
  stopListening(): Promise<void>;
}
