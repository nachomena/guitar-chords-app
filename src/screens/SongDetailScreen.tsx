// The Song Detail / Performance view (SPEC.md §5.1 item 2) — the core differentiator:
// renders the chord sheet with tempo-driven auto-scroll (§5.2).
import React, { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { ChordPopover, useChordPopover } from '../components/ChordPopover';
import { ChordSheetView } from '../components/ChordSheetView';
import { SongQrModal } from '../components/SongQrModal';
import { TransportBar } from '../components/TransportBar';
import {
  computeLineTimeWeights,
  countLinesForBpmTiming,
  groupParsedLinesForRendering,
} from '../chordpro/rendering';
import { parseChordProSongText } from '../chordpro/parser';
import { selectScrollTimeSourceForSong } from '../scroll-engine/selectScrollTimeSource';
import { useScrollEngine } from '../scroll-engine/useScrollEngine';
import { useSongQuery } from '../db/songs';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore } from '../state/settingsStore';
import { darkColorPalette, lightColorPalette } from '../theme/tokens';
import { useAppTheme } from '../theme/ThemeProvider';

const BASE_LYRIC_FONT_SIZE_PIXELS = 16;
const BASE_CHORD_FONT_SIZE_PIXELS = 12;

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function EditPencilIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <Path d="M15 5l4 4" />
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

function QrCodeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={7} height={7} />
      <Rect x={14} y={3} width={7} height={7} />
      <Rect x={3} y={14} width={7} height={7} />
      <Rect x={14} y={14} width={3} height={3} fill={color} stroke="none" />
      <Rect x={18} y={14} width={3} height={3} fill={color} stroke="none" />
      <Rect x={14} y={18} width={3} height={3} fill={color} stroke="none" />
      <Rect x={18} y={18} width={3} height={3} fill={color} stroke="none" />
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

  const [isPerformanceDarkMode, setIsPerformanceDarkMode] = useState(true);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
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

  const lineTimeWeights = useMemo(() => computeLineTimeWeights(renderableLines), [renderableLines]);

  const scrollEngine = useScrollEngine({
    totalDurationMilliseconds: scrollTimeSourceSelection.isAvailable
      ? scrollTimeSourceSelection.totalDurationMilliseconds
      : null,
    lineTimeWeights,
  });

  useEffect(() => {
    scrollEngine.resetPlaybackToStart();
    // Only reset when the song identity changes, not on every scrollEngine re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  if (!song) {
    return <View style={{ flex: 1, backgroundColor: darkColorPalette.background }} />;
  }

  const performanceColors = isPerformanceDarkMode ? darkColorPalette : lightColorPalette;

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
          onPress={() => navigation.navigate('SongEditor', { songId })}
          style={styles.headerIconButton}
        >
          <EditPencilIcon color={performanceColors.accent} />
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={() => setIsQrModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ver código QR"
          style={styles.headerIconButton}
        >
          <QrCodeIcon color={performanceColors.accent} />
        </Pressable>
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

      <ScrollView
        ref={scrollEngine.scrollViewRef}
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
          lyricFontSizePixels={BASE_LYRIC_FONT_SIZE_PIXELS * defaultLyricFontScale}
          chordFontSizePixels={BASE_CHORD_FONT_SIZE_PIXELS * defaultChordFontScale}
          colors={{
            lyricText: performanceColors.text,
            chordText: performanceColors.accent,
            mutedText: performanceColors.textMuted,
            surface: performanceColors.surface,
            divider: performanceColors.divider,
          }}
          onChordPress={openChordPopover}
          onLineHeightMeasured={scrollEngine.registerLineHeight}
        />
        <View style={{ height: 300 }} />
      </ScrollView>

      <TransportBar
        isPlaying={scrollEngine.isPlaying}
        isAutoScrollAvailable={scrollEngine.isAutoScrollAvailable}
        onTogglePlayPause={scrollEngine.togglePlayPause}
        surfaceColor={performanceColors.surface}
        accentColor={performanceColors.accent}
        bottomOffset={insets.bottom + 20}
      />

      <ChordPopover chordSymbol={selectedChordSymbol} onRequestClose={closeChordPopover} />
      <SongQrModal
        visible={isQrModalVisible}
        title={song.title}
        artist={song.artist}
        onRequestClose={() => setIsQrModalVisible(false)}
      />
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
    marginTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
});
