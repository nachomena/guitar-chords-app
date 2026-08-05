// Drives the Performance view's auto-scroll (SPEC.md §5.2/§8.5). A virtual playhead
// (elapsedMilliseconds) advances every frame while playing and maps to a target
// scroll offset — implemented with react-native-reanimated's useFrameCallback +
// scrollTo running entirely on the UI thread, so the scroll position updates
// smoothly every frame rather than jumping line-to-line, and stays responsive even
// if the JS thread is briefly busy.
//
// Pausing simply stops the frame callback from advancing the virtual clock;
// resuming restarts it from the stored elapsed time (not from zero). Manual
// dragging (via the ScrollView's own onScrollBeginDrag/onScrollEndDrag/
// onMomentumScrollEnd — see SPEC.md deviation notes) pauses auto-scroll and
// re-anchors the virtual playhead to the new visual position, so a subsequent
// play() continues sensibly from where the user scrolled to.
import { useCallback, useEffect, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

export type UseScrollEngineParameters = {
  /** null when the song has neither a duration nor a bpm set (§5.2: auto-scroll unavailable). */
  totalDurationMilliseconds: number | null;
};

export type UseScrollEngineResult = {
  isAutoScrollAvailable: boolean;
  isPlaying: boolean;
  animatedScrollViewRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  resetPlaybackToStart: () => void;
  handleScrollViewLayout: (layoutChangeEvent: LayoutChangeEvent) => void;
  handleContentSizeChange: (contentWidth: number, contentHeight: number) => void;
  handleManualScrollBeginDrag: () => void;
  handleManualScrollPositionSettled: (
    scrollEvent: NativeSyntheticEvent<NativeScrollEvent>,
  ) => void;
  /** Read `.value` from JS (e.g. on a polling interval) to show playback progress — safe and instant from either thread. */
  elapsedMillisecondsSharedValue: SharedValue<number>;
};

export function useScrollEngine({
  totalDurationMilliseconds,
}: UseScrollEngineParameters): UseScrollEngineResult {
  const animatedScrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const elapsedMillisecondsSharedValue = useSharedValue(0);
  const isPlayingSharedValue = useSharedValue(false);
  const lastFrameTimestampSharedValue = useSharedValue(0);
  const scrollViewHeightSharedValue = useSharedValue(0);
  const contentHeightSharedValue = useSharedValue(0);
  const totalDurationMillisecondsSharedValue = useSharedValue(totalDurationMilliseconds ?? 0);

  const [isPlaying, setIsPlaying] = useState(false);

  const isAutoScrollAvailable =
    totalDurationMilliseconds !== null && totalDurationMilliseconds > 0;

  useEffect(() => {
    totalDurationMillisecondsSharedValue.value = totalDurationMilliseconds ?? 0;
  }, [totalDurationMilliseconds, totalDurationMillisecondsSharedValue]);

  const handlePlaybackReachedEnd = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useFrameCallback(() => {
    'worklet';
    if (!isPlayingSharedValue.value) return;

    // Deliberately Date.now() rather than the frameInfo.timestamp this callback
    // receives: the latter comes from react-native-reanimated's own
    // requestAnimationFrame scheduling, and in testing its deltas under-reported
    // real elapsed wall-clock time by a large, consistent factor (playback tracked
    // roughly 3x slower than real time) — a discrepancy specific to that internal
    // clock, not to this app's math. Date.now() is unambiguous wall-clock time
    // regardless of frame-scheduling internals, and worklets can call it directly.
    const currentFrameTimestamp = Date.now();
    if (lastFrameTimestampSharedValue.value === 0) {
      // First frame after a play()/resume — establish a baseline without adding a
      // delta, so a long pause never produces a large forward jump.
      lastFrameTimestampSharedValue.value = currentFrameTimestamp;
      return;
    }

    const deltaMilliseconds = currentFrameTimestamp - lastFrameTimestampSharedValue.value;
    lastFrameTimestampSharedValue.value = currentFrameTimestamp;

    const totalDuration = totalDurationMillisecondsSharedValue.value;
    const nextElapsedMilliseconds = Math.min(
      totalDuration,
      elapsedMillisecondsSharedValue.value + deltaMilliseconds,
    );
    elapsedMillisecondsSharedValue.value = nextElapsedMilliseconds;

    const maximumScrollOffset = Math.max(
      0,
      contentHeightSharedValue.value - scrollViewHeightSharedValue.value,
    );
    const playbackFraction = totalDuration > 0 ? nextElapsedMilliseconds / totalDuration : 0;
    scrollTo(animatedScrollViewRef, 0, playbackFraction * maximumScrollOffset, false);

    if (nextElapsedMilliseconds >= totalDuration) {
      isPlayingSharedValue.value = false;
      runOnJS(handlePlaybackReachedEnd)();
    }
  }, true);

  const play = useCallback(() => {
    if (!isAutoScrollAvailable) return;
    lastFrameTimestampSharedValue.value = 0;
    isPlayingSharedValue.value = true;
    setIsPlaying(true);
  }, [isAutoScrollAvailable, isPlayingSharedValue, lastFrameTimestampSharedValue]);

  const pause = useCallback(() => {
    isPlayingSharedValue.value = false;
    setIsPlaying(false);
  }, [isPlayingSharedValue]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const resetPlaybackToStart = useCallback(() => {
    isPlayingSharedValue.value = false;
    elapsedMillisecondsSharedValue.value = 0;
    lastFrameTimestampSharedValue.value = 0;
    setIsPlaying(false);
  }, [elapsedMillisecondsSharedValue, isPlayingSharedValue, lastFrameTimestampSharedValue]);

  const handleScrollViewLayout = useCallback(
    (layoutChangeEvent: LayoutChangeEvent) => {
      scrollViewHeightSharedValue.value = layoutChangeEvent.nativeEvent.layout.height;
    },
    [scrollViewHeightSharedValue],
  );

  const handleContentSizeChange = useCallback(
    (_contentWidth: number, contentHeight: number) => {
      contentHeightSharedValue.value = contentHeight;
    },
    [contentHeightSharedValue],
  );

  const handleManualScrollBeginDrag = useCallback(() => {
    if (isPlayingSharedValue.value) {
      isPlayingSharedValue.value = false;
      setIsPlaying(false);
    }
  }, [isPlayingSharedValue]);

  const handleManualScrollPositionSettled = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = scrollEvent.nativeEvent;
      const maximumScrollOffset = Math.max(0, contentSize.height - layoutMeasurement.height);
      const playbackFraction =
        maximumScrollOffset > 0 ? contentOffset.y / maximumScrollOffset : 0;
      elapsedMillisecondsSharedValue.value =
        playbackFraction * totalDurationMillisecondsSharedValue.value;
    },
    [elapsedMillisecondsSharedValue, totalDurationMillisecondsSharedValue],
  );

  return {
    isAutoScrollAvailable,
    isPlaying,
    animatedScrollViewRef,
    play,
    pause,
    togglePlayPause,
    resetPlaybackToStart,
    handleScrollViewLayout,
    handleContentSizeChange,
    elapsedMillisecondsSharedValue,
    handleManualScrollBeginDrag,
    handleManualScrollPositionSettled,
  };
}
