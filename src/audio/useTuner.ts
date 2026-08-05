// The chromatic tuner (SPEC.md §5.6), reusing the same PitchDetector interface as
// Follow Mode in continuous pitch-tracking mode. With the stub detector, detection
// never produces a frequency, so the screen falls back to the manual string picker
// SPEC.md §5.6 already calls for as an edge-case fallback — here it's the primary
// interaction until real detection is wired up.
import { useCallback, useEffect, useState } from 'react';

import { stubPitchDetector } from './stubPitchDetector';
import { computeCentsOffsetFromTargetFrequency, STANDARD_GUITAR_TUNING_STRINGS } from './tuning';
import type { PitchDetectionSample, PitchDetector } from './PitchDetector';

export function useTuner(pitchDetector: PitchDetector = stubPitchDetector) {
  const [activeStringIndex, setActiveStringIndex] = useState(0);
  const [detectedFrequencyHz, setDetectedFrequencyHz] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handlePitchDetectionSample = (sample: PitchDetectionSample) => {
      if (!isMounted) return;
      setDetectedFrequencyHz(sample.estimatedFrequencyHz);
    };

    void (async () => {
      await pitchDetector.requestMicrophonePermission();
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
