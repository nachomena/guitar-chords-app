// The chromatic tuner (SPEC.md §5.6). usePitchDetector() picks the real
// implementation outside Expo Go and the stub inside it (see usePitchDetector.ts) —
// with the stub, detection never produces a frequency, so the screen falls back to
// the manual string picker SPEC.md §5.6 already calls for as an edge-case fallback.
import { useCallback, useEffect, useRef, useState } from 'react';

import { createExponentialMovingAverageFrequencySmoother } from './frequencySmoothing';
import { usePitchDetector } from './usePitchDetector';
import {
  computeCentsOffsetFromTargetFrequency,
  findNearestStandardTuningStringIndex,
  STANDARD_GUITAR_TUNING_STRINGS,
} from './tuning';
import type { PitchDetectionSample, PitchDetector } from './PitchDetector';

const FREQUENCY_SMOOTHING_FACTOR = 0.3;

export function useTuner(pitchDetectorOverride?: PitchDetector) {
  const selectedPitchDetector = usePitchDetector();
  const pitchDetector = pitchDetectorOverride ?? selectedPitchDetector;
  const [activeStringIndex, setActiveStringIndex] = useState(0);
  const [detectedFrequencyHz, setDetectedFrequencyHz] = useState<number | null>(null);
  const smoothFrequency = useRef(
    createExponentialMovingAverageFrequencySmoother(FREQUENCY_SMOOTHING_FACTOR),
  ).current;

  useEffect(() => {
    let isMounted = true;

    const handlePitchDetectionSample = (sample: PitchDetectionSample) => {
      if (!isMounted) return;
      const smoothedFrequencyHz = smoothFrequency(sample.estimatedFrequencyHz);
      setDetectedFrequencyHz(smoothedFrequencyHz);
      if (smoothedFrequencyHz !== null) {
        // Auto string detection (SPEC.md §5.6) — no need to pick a string manually;
        // whichever string you're actually playing becomes the active one. The
        // manual picker below still works as the edge-case fallback the spec calls
        // for, but the next detected sample will override it again if you're
        // actively playing a different string.
        setActiveStringIndex(findNearestStandardTuningStringIndex(smoothedFrequencyHz));
      }
    };

    void (async () => {
      const isPermissionGranted = await pitchDetector.requestMicrophonePermission();
      if (!isPermissionGranted || !isMounted) return;
      await pitchDetector.startListening(handlePitchDetectionSample);
    })();

    return () => {
      isMounted = false;
      void pitchDetector.stopListening();
    };
  }, [pitchDetector]);

  const selectString = useCallback((stringIndex: number) => {
    setActiveStringIndex(stringIndex);
  }, []);

  const activeString = STANDARD_GUITAR_TUNING_STRINGS[activeStringIndex];
  const centsOffset =
    detectedFrequencyHz !== null
      ? computeCentsOffsetFromTargetFrequency(detectedFrequencyHz, activeString.targetFrequencyHz)
      : 0;

  return {
    isDetectionImplemented: pitchDetector.isImplemented,
    strings: STANDARD_GUITAR_TUNING_STRINGS,
    activeStringIndex,
    activeString,
    selectString,
    detectedFrequencyHz,
    centsOffset,
  };
}
