// Selects which PitchDetector implementation the app uses.
//
// Must not statically `import` from '@siteed/audio-studio' anywhere reachable while
// running inside Expo Go — evaluating that package's entry point calls
// expo-modules-core's requireNativeModule('AudioStudio') immediately, which throws
// there (that native module isn't part of the fixed set Expo Go ships with). So the
// real implementation is only ever loaded via require(), gated behind
// determineIsRunningInsideExpoGo(), and only at module-load time, below.
//
// Resolving `usePitchDetector` to one fixed function reference (rather than
// branching inside a single hook body) is what keeps this safe under React's rules
// of hooks: whichever implementation is picked calls its own hooks unconditionally
// within itself, and which one is picked can never change during the app's
// lifetime — you can't switch from Expo Go to a native build without restarting the
// whole process.
import { determineIsRunningInsideExpoGo } from './determineIsRunningInsideExpoGo';
import { useStubPitchDetectorAsHook } from './useStubPitchDetectorAsHook';
import type { PitchDetector } from './PitchDetector';

export const usePitchDetector: () => PitchDetector = determineIsRunningInsideExpoGo()
  ? useStubPitchDetectorAsHook
  : (require('./useRealAudioStudioPitchDetector') as typeof import('./useRealAudioStudioPitchDetector'))
      .useRealAudioStudioPitchDetector;
