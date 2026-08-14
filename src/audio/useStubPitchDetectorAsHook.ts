import { stubPitchDetector } from './stubPitchDetector';
import type { PitchDetector } from './PitchDetector';

/** Hook-shaped wrapper around the stub, so it has the same call signature as useRealAudioStudioPitchDetector — see usePitchDetector.ts. */
export function useStubPitchDetectorAsHook(): PitchDetector {
  return stubPitchDetector;
}
