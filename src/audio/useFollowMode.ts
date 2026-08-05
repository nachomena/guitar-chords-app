// Mic-based auto-pause ("Follow Mode", SPEC.md §5.5). Opt-in, off by default;
// mic permission is only requested the first time it's enabled. The grace-period/
// hysteresis engine below only actually runs against a real PitchDetector
// implementation (`pitchDetector.isImplemented`) — with the current stub, toggling
// Follow on simply reflects "listening" state without ever auto-pausing, rather
// than fabricating pauses with nothing real behind them.
import { useCallback, useEffect, useRef, useState } from 'react';

import { stubPitchDetector } from './stubPitchDetector';
import type { FollowModeDetectionSetting } from '../state/settingsStore';
import type { PitchDetectionSample, PitchDetector } from './PitchDetector';

export type FollowModeStatus = 'idle' | 'listening' | 'paused';

const MINIMUM_GRACE_PERIOD_MILLISECONDS = 2000;
const GRACE_PERIOD_WATCHDOG_INTERVAL_MILLISECONDS = 250;
/** Auto-resume requires a short run of consistent onsets, not a single detected note (§5.5). */
const REQUIRED_CONSECUTIVE_ONSETS_TO_AUTO_RESUME = 3;

function computeGracePeriodMilliseconds(beatsPerMinute: number | null): number {
  if (!beatsPerMinute || beatsPerMinute <= 0) return MINIMUM_GRACE_PERIOD_MILLISECONDS;
  const twoBeatsInMilliseconds = (60000 / beatsPerMinute) * 2;
  return Math.max(MINIMUM_GRACE_PERIOD_MILLISECONDS, twoBeatsInMilliseconds);
}

export function useFollowMode({
  beatsPerMinute,
  followModeDetectionSetting,
  onAutoPauseRequested,
  onAutoResumeRequested,
  pitchDetector = stubPitchDetector,
}: {
  beatsPerMinute: number | null;
  followModeDetectionSetting: FollowModeDetectionSetting;
  onAutoPauseRequested: () => void;
  onAutoResumeRequested: () => void;
  pitchDetector?: PitchDetector;
}) {
  const [isFollowModeEnabled, setIsFollowModeEnabled] = useState(false);
  const [followModeStatus, setFollowModeStatus] = useState<FollowModeStatus>('idle');

  const followModeStatusRef = useRef<FollowModeStatus>('idle');
  const lastOnsetDetectedAtRef = useRef<number>(0);
  const consecutiveOnsetCountRef = useRef<number>(0);

  useEffect(() => {
    followModeStatusRef.current = followModeStatus;
  }, [followModeStatus]);

  const handlePitchDetectionSample = useCallback(
    (sample: PitchDetectionSample) => {
      if (!sample.isOnsetDetected) {
        consecutiveOnsetCountRef.current = 0;
        return;
      }
      lastOnsetDetectedAtRef.current = Date.now();
      consecutiveOnsetCountRef.current += 1;
      if (
        followModeStatusRef.current === 'paused' &&
        consecutiveOnsetCountRef.current >= REQUIRED_CONSECUTIVE_ONSETS_TO_AUTO_RESUME
      ) {
        setFollowModeStatus('listening');
        onAutoResumeRequested();
      }
    },
    [onAutoResumeRequested],
  );

  const disableFollowMode = useCallback(async () => {
    await pitchDetector.stopListening();
    setIsFollowModeEnabled(false);
    setFollowModeStatus('idle');
  }, [pitchDetector]);

  const enableFollowMode = useCallback(async () => {
    const permissionGranted = await pitchDetector.requestMicrophonePermission();
    if (pitchDetector.isImplemented && !permissionGranted) return;

    lastOnsetDetectedAtRef.current = Date.now();
    consecutiveOnsetCountRef.current = 0;
    setIsFollowModeEnabled(true);
    setFollowModeStatus('listening');
    await pitchDetector.startListening(handlePitchDetectionSample);
  }, [handlePitchDetectionSample, pitchDetector]);

  const toggleFollowMode = useCallback(() => {
    if (isFollowModeEnabled) {
      void disableFollowMode();
    } else {
      void enableFollowMode();
    }
  }, [isFollowModeEnabled, disableFollowMode, enableFollowMode]);

  // The auto-pause watchdog: fires onAutoPauseRequested once the grace period
  // elapses with no onset. Only runs against a real (non-stub) detector — see the
  // module comment above.
  useEffect(() => {
    if (!isFollowModeEnabled || !pitchDetector.isImplemented) return undefined;

    const gracePeriodMilliseconds = computeGracePeriodMilliseconds(beatsPerMinute);
    const watchdogIntervalId = setInterval(() => {
      const millisecondsSinceLastOnset = Date.now() - lastOnsetDetectedAtRef.current;
      if (
        followModeStatusRef.current === 'listening' &&
        millisecondsSinceLastOnset > gracePeriodMilliseconds
      ) {
        setFollowModeStatus('paused');
        onAutoPauseRequested();
      }
    }, GRACE_PERIOD_WATCHDOG_INTERVAL_MILLISECONDS);

    return () => clearInterval(watchdogIntervalId);
  }, [isFollowModeEnabled, beatsPerMinute, pitchDetector, onAutoPauseRequested]);

  useEffect(() => {
    return () => {
      void pitchDetector.stopListening();
    };
  }, [pitchDetector]);

  return {
    isFollowModeEnabled,
    followModeStatus,
    toggleFollowMode,
    isDetectionImplemented: pitchDetector.isImplemented,
    // Exposed so the Settings screen's Precise/Simple toggle (§5.5) reads as wired
    // up even though only one (stub) detection mode exists today.
    followModeDetectionSetting,
  };
}
