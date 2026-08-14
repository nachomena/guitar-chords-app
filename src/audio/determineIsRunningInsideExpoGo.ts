import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Expo Go can only run the fixed set of native modules it ships with — it can't load
 * the live microphone-streaming module the real PitchDetector implementation will
 * need (SPEC.md §8.8). Used to fall back to the stub detector there, regardless of
 * which real implementation exists, and pick the real one in an Expo Dev Client or
 * standalone build.
 */
export function determineIsRunningInsideExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
