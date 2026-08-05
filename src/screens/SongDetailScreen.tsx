// The Song Detail / Performance view (SPEC.md §5.1 item 2) — the core differentiator:
// renders the chord sheet with tempo-driven auto-scroll (§5.2).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { ChordPopover, useChordPopover } from '../components/ChordPopover';
import { ChordSheetView } from '../components/ChordSheetView';
import { TransportBar } from '../components/TransportBar';
import { countLinesForBpmTiming, groupParsedLinesForRendering } from '../chordpro/rendering';
import { parseChordProSongText } from '../chordpro/parser';
import { useFollowMode } from '../audio/useFollowMode';
import { selectScrollTimeSourceForSong } from '../scroll-engine/selectScrollTimeSource';
import { useScrollEngine } from '../scroll-engine/useScrollEngine';
import { useSongQuery } from '../db/songs';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore } from '../state/settingsStore';
import { darkColorPalette, lightColorPalette } from '../theme/tokens';
import { useAppTheme } from '../theme/ThemeProvider';

const ELAPSED_TIME_DISPLAY_POLL_INTERVAL_MILLISECONDS = 500;

const BASE_LYRIC_FONT_SIZE_PIXELS = 16;
const BASE_CHORD_FONT_SIZE_PIXELS = 12;
const MINIMUM_FONT_SCALE = 0.8;
const MAXIMUM_LYRIC_FONT_SCALE = 1.6;
const MAXIMUM_CHORD_FONT_SCALE = 1.8;
const FONT_SCALE_STEP = 0.1;

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function DarkModeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={5} fill={color} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function LightModeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

export function SongDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'SongDetail'>) {
  const insets = useSafeAreaInsets();
  const { fontFamily } = useAppTheme();
  const { songId } = route.params;

  const songQuery = useSongQuery(songId);
  const song = songQuery.data;

  const defaultLyricFontScale = useSettingsStore((state) => state.defaultLyricFontScale);
  const defaultChordFontScale = useSettingsStore((state) => state.defaultChordFontScale);
  const followModeDetectionSetting = useSettingsStore((state) => state.followModeDetectionSetting);

  const [isPerformanceDarkMode, setIsPerformanceDarkMode] = useState(true);
  const [lyricFontScale, setLyricFontScale] = useState(defaultLyricFontScale);
  const [chordFontScale, setChordFontScale] = useState(defaultChordFontScale);
  const { selectedChordSymbol, openChordPopover, closeChordPopover } = useChordPopover();

  const parsedSong = useMemo(() => parseChordProSongText(song?.chordSheet ?? ''), [song?.chordSheet]);
  const renderableLines = useMemo(() => groupParsedLinesForRendering(parsedSong.lines), [parsedSong.lines]);

  const scrollTimeSourceSelection = useMemo(
    () =>
      song
        ? selectScrollTimeSourceForSong({
            durationSeconds: song.durationSeconds,
            beatsPerMinute: song.bpm,
            timeSignatureNumerator: song.timeSignatureNumerator ?? 4,
            lineCount: countLinesForBpmTiming(renderableLines),
          })
        : { isAvailable: false as const },
    [song, renderableLines],
  );

  const scrollEngine = useScrollEngine({
    totalDurationMilliseconds: scrollTimeSourceSelection.isAvailable
      ? scrollTimeSourceSelection.totalDurationMilliseconds
      : null,
  });

  // Elapsed time lives in a Reanimated shared value updated every frame on the UI
  // thread (see useScrollEngine) — polling it into React state at a slow, fixed
  // interval gives the transport bar a readable "elapsed / total" readout without
  // re-rendering 60 times a second. This exists so playback progress is visible
  // even when the scroll movement itself is too subtle to notice (a long duration
  // spread over a short chart moves only a few pixels a second).
  const [elapsedSecondsForDisplay, setElapsedSecondsForDisplay] = useState(0);
  useEffect(() => {
    const pollIntervalId = setInterval(() => {
      setElapsedSecondsForDisplay(scrollEngine.elapsedMillisecondsSharedValue.value / 1000);
    }, ELAPSED_TIME_DISPLAY_POLL_INTERVAL_MILLISECONDS);
    return () => clearInterval(pollIntervalId);
  }, [scrollEngine.elapsedMillisecondsSharedValue]);

  useEffect(() => {
    scrollEngine.resetPlaybackToStart();
    setElapsedSecondsForDisplay(0);
    setLyricFontScale(defaultLyricFontScale);
    setChordFontScale(defaultChordFontScale);
    // Only reset when the song identity changes, not on every scrollEngine re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  const followMode = useFollowMode({
    beatsPerMinute: song?.bpm ?? null,
    followModeDetectionSetting,
    onAutoPauseRequested: scrollEngine.pause,
    onAutoResumeRequested: scrollEngine.play,
  });

  const handleIncreaseLyricFontScale = useCallback(
    () => setLyricFontScale((scale) => Math.min(MAXIMUM_LYRIC_FONT_SCALE, Math.round((scale + FONT_SCALE_STEP) * 100) / 100)),
    [],
  );
  const handleDecreaseLyricFontScale = useCallback(
    () => setLyricFontScale((scale) => Math.max(MINIMUM_FONT_SCALE, Math.round((scale - FONT_SCALE_STEP) * 100) / 100)),
    [],
  );
  const handleIncreaseChordFontScale = useCallback(
    () => setChordFontScale((scale) => Math.min(MAXIMUM_CHORD_FONT_SCALE, Math.round((scale + FONT_SCALE_STEP) * 100) / 100)),
    [],
  );
  const handleDecreaseChordFontScale = useCallback(
    () => setChordFontScale((scale) => Math.max(MINIMUM_FONT_SCALE, Math.round((scale - FONT_SCALE_STEP) * 100) / 100)),
    [],
  );

  if (!song) {
    return <View style={{ flex: 1, backgroundColor: darkColorPalette.background }} />;
  }

  const performanceColors = isPerformanceDarkMode ? darkColorPalette : lightColorPalette;
  const totalSecondsForDisplay = scrollTimeSourceSelection.isAvailable
    ? scrollTimeSourceSelection.totalDurationMilliseconds / 1000
    : null;

  return (
    <View style={[styles.container, { backgroundColor: performanceColors.background, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: `${performanceColors.textMuted}40` },
        ]}
      >
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <BackChevronIcon color={performanceColors.text} />
        </Pressable>
        <View style={styles.headerTitleColumn}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: performanceColors.text, fontFamily: fontFamily.headingMedium }]}
          >
            {song.title}
          </Text>
          <Text style={[styles.headerArtist, { color: performanceColors.textMuted }]}>{song.artist}</Text>
        </View>
        {song.capo && song.capo > 0 ? (
          <View style={[styles.capoLabel, { borderColor: performanceColors.accent }]}>
            <Text style={{ color: performanceColors.accent, fontSize: 11 }}>Capo {song.capo}</Text>
          </View>
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => setIsPerformanceDarkMode((isDark) => !isDark)}
          style={styles.headerIconButton}
        >
          {isPerformanceDarkMode ? (
            <DarkModeIcon color={performanceColors.accent} />
          ) : (
            <LightModeIcon color={performanceColors.accent} />
          )}
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollEngine.animatedScrollViewRef}
        onLayout={scrollEngine.handleScrollViewLayout}
        onContentSizeChange={scrollEngine.handleContentSizeChange}
        onScrollBeginDrag={scrollEngine.handleManualScrollBeginDrag}
        onScrollEndDrag={scrollEngine.handleManualScrollPositionSettled}
        onMomentumScrollEnd={scrollEngine.handleManualScrollPositionSettled}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ChordSheetView
          renderableLines={renderableLines}
          lyricFontSizePixels={BASE_LYRIC_FONT_SIZE_PIXELS * lyricFontScale}
          chordFontSizePixels={BASE_CHORD_FONT_SIZE_PIXELS * chordFontScale}
          colors={{
            lyricText: performanceColors.text,
            chordText: performanceColors.accent,
            mutedText: performanceColors.textMuted,
            surface: performanceColors.surface,
            divider: performanceColors.divider,
          }}
          onChordPress={openChordPopover}
        />
        <View style={{ height: 300 }} />
      </Animated.ScrollView>

      <TransportBar
        isPlaying={scrollEngine.isPlaying}
        isAutoScrollAvailable={scrollEngine.isAutoScrollAvailable}
        onTogglePlayPause={scrollEngine.togglePlayPause}
        elapsedSeconds={elapsedSecondsForDisplay}
        totalSeconds={totalSecondsForDisplay}
        isFollowModeEnabled={followMode.isFollowModeEnabled}
        followModeStatus={followMode.followModeStatus}
        onToggleFollowMode={followMode.toggleFollowMode}
        lyricFontScale={lyricFontScale}
        chordFontScale={chordFontScale}
        onIncreaseLyricFontScale={handleIncreaseLyricFontScale}
        onDecreaseLyricFontScale={handleDecreaseLyricFontScale}
        onIncreaseChordFontScale={handleIncreaseChordFontScale}
        onDecreaseChordFontScale={handleDecreaseChordFontScale}
        foregroundColor={performanceColors.text}
        mutedColor={performanceColors.textMuted}
        surfaceColor={performanceColors.surface}
        accentColor={performanceColors.accent}
      />

      <ChordPopover chordSymbol={selectedChordSymbol} onRequestClose={closeChordPopover} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleColumn: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
  },
  headerArtist: {
    fontSize: 12,
  },
  capoLabel: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
});
