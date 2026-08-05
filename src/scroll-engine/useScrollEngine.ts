// Drives the Performance view's auto-scroll (SPEC.md §5.2/§8.5). A virtual playhead
// (elapsedMilliseconds) advances on a plain JS-thread `setInterval` and maps to a
// target scroll offset via the ScrollView's own imperative `scrollTo` method.
//
// This is deliberately NOT built on react-native-reanimated's useFrameCallback
// (an earlier version was). In testing, that callback's internal
// requestAnimationFrame-based timing under-reported real elapsed wall-clock time by
// a large, inconsistent factor (playback tracked roughly 3x slower than real time),
// and switching only the clock read inside it (from its own `frameInfo.timestamp` to
// `Date.now()`) did not resolve it — pointing at the callback's invocation
// scheduling itself, not just which clock it reads. Rather than keep chasing
// Reanimated/Worklets internals with no device to instrument directly, this uses a
// plain `setInterval` timed with `Date.now()` on the JS thread: an unambiguous,
// independently-verifiable wall clock with no dependency on any animation-frame
// scheduling internals. The auto-scroll rates this app actually produces are slow
// (often single-digit pixels per second — see the earlier duration-vs-content-height
// analysis), so a ~20-updates/second interval is indistinguishable from 60fps here.
//
// Pausing simply stops the interval; resuming restarts it from the stored elapsed
// time (not from zero).
//
// Manual dragging (via the ScrollView's own onScrollBeginDrag/onScrollEndDrag/
// onMomentumScrollEnd) deliberately does NOT pause playback — this is a product
// decision that overrides SPEC.md §5.1/§5.2's "dragging pauses auto-scroll"
// wording. While actively playing, dragging the chart works as a live seek instead:
// the tick loop keeps advancing the virtual playhead and keeps the "Play/Pause"
// button showing Pause throughout, but suspends its own scrollTo calls for the
// duration of the gesture (so it doesn't fight the user's finger), then re-anchors
// the playhead to wherever the user let go and keeps playing from there. When
// paused, dragging behaves the same as any plain ScrollView — free scrolling, with
// the playhead re-anchored so a later play() resumes from that position.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  buildScrollPacingBreakpoints,
  mapPixelFractionToTimeFraction,
  mapTimeFractionToPixelFraction,
} from './scrollPacing';

const SCROLL_TICK_INTERVAL_MILLISECONDS = 50;

export type UseScrollEngineParameters = {
  /** null when the song has neither a duration nor a bpm set (§5.2: auto-scroll unavailable). */
  totalDurationMilliseconds: number | null;
  /**
   * Relative time weight per renderable line (see
   * chordpro/rendering.ts's computeLineTimeWeights) — paces the fixed total
   * duration unevenly across the chart instead of one flat rate, so e.g. a
   * `{comment: ...}` label's line scrolls past faster than a real musical line.
   * Pass `[]` (or an all-equal-weight array) for the old flat-rate behavior.
   */
  lineTimeWeights: number[];
};

export type UseScrollEngineResult = {
  isAutoScrollAvailable: boolean;
  isPlaying: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  resetPlaybackToStart: () => void;
  handleScrollViewLayout: (layoutChangeEvent: LayoutChangeEvent) => void;
  handleContentSizeChange: (contentWidth: number, contentHeight: number) => void;
  /** Wire to each rendered line's onLayout so the pacing math knows its real height. */
  registerLineHeight: (lineIndex: number, height: number) => void;
  handleManualScrollBeginDrag: () => void;
  handleManualScrollPositionSettled: (
    scrollEvent: NativeSyntheticEvent<NativeScrollEvent>,
  ) => void;
  /** Read `.current` (e.g. on a polling interval) to show playback progress. */
  elapsedMillisecondsRef: React.RefObject<number>;
};

export function useScrollEngine({
  totalDurationMilliseconds,
  lineTimeWeights,
}: UseScrollEngineParameters): UseScrollEngineResult {
  const scrollViewRef = useRef<ScrollView>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const elapsedMillisecondsRef = useRef(0);
  const lastTickTimestampRef = useRef<number | null>(null);
  const tickIntervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const totalDurationMillisecondsRef = useRef(totalDurationMilliseconds ?? 0);
  const lineTimeWeightsRef = useRef<number[]>(lineTimeWeights);
  const lineHeightsPixelsRef = useRef<(number | undefined)[]>([]);
  // True for the duration of a manual drag gesture — the tick loop keeps advancing
  // the playhead underneath but skips its own scrollTo calls so it doesn't fight
  // the user's finger.
  const isManuallyDraggingRef = useRef(false);

  const isAutoScrollAvailable =
    totalDurationMilliseconds !== null && totalDurationMilliseconds > 0;

  useEffect(() => {
    totalDurationMillisecondsRef.current = totalDurationMilliseconds ?? 0;
  }, [totalDurationMilliseconds]);

  useEffect(() => {
    lineTimeWeightsRef.current = lineTimeWeights;
    // A new set of lines (new song, or the same song re-parsed) invalidates any
    // heights measured for the previous line list.
    lineHeightsPixelsRef.current = [];
  }, [lineTimeWeights]);

  const registerLineHeight = useCallback((lineIndex: number, height: number) => {
    lineHeightsPixelsRef.current[lineIndex] = height;
  }, []);

  const applyScrollPositionForElapsed = useCallback((elapsedMilliseconds: number) => {
    const totalDuration = totalDurationMillisecondsRef.current;
    const maximumScrollOffset = Math.max(
      0,
      contentHeightRef.current - scrollViewHeightRef.current,
    );
    const timeFraction = totalDuration > 0 ? elapsedMilliseconds / totalDuration : 0;
    const breakpoints = buildScrollPacingBreakpoints(
      lineTimeWeightsRef.current,
      lineHeightsPixelsRef.current,
    );
    const pixelFraction = mapTimeFractionToPixelFraction(timeFraction, breakpoints);
    scrollViewRef.current?.scrollTo({
      x: 0,
      y: pixelFraction * maximumScrollOffset,
      animated: false,
    });
  }, []);

  const stopTicking = useCallback(() => {
    if (tickIntervalIdRef.current !== null) {
      clearInterval(tickIntervalIdRef.current);
      tickIntervalIdRef.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    if (tickIntervalIdRef.current !== null) return;
    lastTickTimestampRef.current = null;
    tickIntervalIdRef.current = setInterval(() => {
      const currentTickTimestamp = Date.now();
      if (lastTickTimestampRef.current === null) {
        // First tick after a play()/resume — establish a baseline without adding a
        // delta, so a long pause never produces a large forward jump.
        lastTickTimestampRef.current = currentTickTimestamp;
        return;
      }

      const deltaMilliseconds = currentTickTimestamp - lastTickTimestampRef.current;
      lastTickTimestampRef.current = currentTickTimestamp;

      const totalDuration = totalDurationMillisecondsRef.current;
      const nextElapsedMilliseconds = Math.min(
        totalDuration,
        elapsedMillisecondsRef.current + deltaMilliseconds,
      );
      elapsedMillisecondsRef.current = nextElapsedMilliseconds;
      if (!isManuallyDraggingRef.current) {
        applyScrollPositionForElapsed(nextElapsedMilliseconds);
      }

      if (nextElapsedMilliseconds >= totalDuration) {
        stopTicking();
        setIsPlaying(false);
      }
    }, SCROLL_TICK_INTERVAL_MILLISECONDS);
  }, [applyScrollPositionForElapsed, stopTicking]);

  // Stop the interval if the component unmounts mid-playback.
  useEffect(() => stopTicking, [stopTicking]);

  const play = useCallback(() => {
    if (!isAutoScrollAvailable) return;
    setIsPlaying(true);
    startTicking();
  }, [isAutoScrollAvailable, startTicking]);

  const pause = useCallback(() => {
    stopTicking();
    setIsPlaying(false);
  }, [stopTicking]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const resetPlaybackToStart = useCallback(() => {
    stopTicking();
    elapsedMillisecondsRef.current = 0;
    lastTickTimestampRef.current = null;
    setIsPlaying(false);
  }, [stopTicking]);

  const handleScrollViewLayout = useCallback((layoutChangeEvent: LayoutChangeEvent) => {
    scrollViewHeightRef.current = layoutChangeEvent.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback(
    (_contentWidth: number, contentHeight: number) => {
      contentHeightRef.current = contentHeight;
    },
    [],
  );

  const handleManualScrollBeginDrag = useCallback(() => {
    // Deliberately does not pause — see the module comment. The tick loop (if
    // running) keeps advancing the playhead but stops calling scrollTo until the
    // drag settles, so it doesn't fight the gesture.
    isManuallyDraggingRef.current = true;
  }, []);

  const handleManualScrollPositionSettled = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      isManuallyDraggingRef.current = false;
      const { contentOffset, contentSize, layoutMeasurement } = scrollEvent.nativeEvent;
      const maximumScrollOffset = Math.max(0, contentSize.height - layoutMeasurement.height);
      const pixelFraction = maximumScrollOffset > 0 ? contentOffset.y / maximumScrollOffset : 0;
      const breakpoints = buildScrollPacingBreakpoints(
        lineTimeWeightsRef.current,
        lineHeightsPixelsRef.current,
      );
      const timeFraction = mapPixelFractionToTimeFraction(pixelFraction, breakpoints);
      elapsedMillisecondsRef.current = timeFraction * totalDurationMillisecondsRef.current;
    },
    [],
  );

  return {
    isAutoScrollAvailable,
    isPlaying,
    scrollViewRef,
    play,
    pause,
    togglePlayPause,
    resetPlaybackToStart,
    handleScrollViewLayout,
    handleContentSizeChange,
    registerLineHeight,
    handleManualScrollBeginDrag,
    handleManualScrollPositionSettled,
    elapsedMillisecondsRef,
  };
}
