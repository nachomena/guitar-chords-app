// The interface the Tuner (§5.6) consumes for continuous pitch tracking, per the
// mic-capture + pitch-detection pipeline described in §8.8. No UI or state code
// depends on which implementation is wired up (see usePitchDetector.ts).
export type PitchDetectionSample = {
  /** A fundamental frequency is present at all, within the guitar's range (~80Hz–1200Hz). */
  isFundamentalFrequencyPresent: boolean;
  estimatedFrequencyHz: number | null;
};

export type PitchDetectionSampleListener = (sample: PitchDetectionSample) => void;

export interface PitchDetector {
  requestMicrophonePermission(): Promise<boolean>;
  startListening(onSample: PitchDetectionSampleListener): Promise<void>;
  stopListening(): Promise<void>;
}
