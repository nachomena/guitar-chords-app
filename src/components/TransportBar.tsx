// The Performance view's transport bar (SPEC.md §5.1 item 2): play/pause auto-scroll
// (speed is fully automatic — no BPM display or nudge control here), the Follow
// toggle for mic-based auto-pause (§5.5), and the "Aa" font-size panel with
// independent Lyrics/Chords steppers.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import type { FollowModeStatus } from '../audio/useFollowMode';
import { formatSecondsAsMinutesColonSeconds } from '../utils/formatDuration';
import { useAppTheme } from '../theme/ThemeProvider';

function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Polygon points="6 3 20 12 6 21 6 3" fill={color} />
    </Svg>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={6} y={4} width={4} height={16} fill={color} />
      <Rect x={14} y={4} width={4} height={16} fill={color} />
    </Svg>
  );
}

export function TransportBar({
  isPlaying,
  isAutoScrollAvailable,
  onTogglePlayPause,
  elapsedSeconds,
  totalSeconds,
  isFollowModeEnabled,
  followModeStatus,
  onToggleFollowMode,
  lyricFontScale,
  chordFontScale,
  onIncreaseLyricFontScale,
  onDecreaseLyricFontScale,
  onIncreaseChordFontScale,
  onDecreaseChordFontScale,
  foregroundColor,
  mutedColor,
  surfaceColor,
  accentColor,
}: {
  isPlaying: boolean;
  isAutoScrollAvailable: boolean;
  onTogglePlayPause: () => void;
  /** Playback progress readout — shown even when the scroll movement itself is too subtle to notice (a long duration spread over a short chart). */
  elapsedSeconds: number;
  totalSeconds: number | null;
  isFollowModeEnabled: boolean;
  followModeStatus: FollowModeStatus;
  onToggleFollowMode: () => void;
  lyricFontScale: number;
  chordFontScale: number;
  onIncreaseLyricFontScale: () => void;
  onDecreaseLyricFontScale: () => void;
  onIncreaseChordFontScale: () => void;
  onDecreaseChordFontScale: () => void;
  foregroundColor: string;
  mutedColor: string;
  surfaceColor: string;
  accentColor: string;
}) {
  const { fontFamily, cornerRadius, elevationShadow } = useAppTheme();
  const [isFontPanelOpen, setIsFontPanelOpen] = useState(false);

  const followLabel = !isFollowModeEnabled
    ? 'Follow'
    : followModeStatus === 'paused'
      ? 'Follow: paused'
      : 'Follow: listening';
  const followColor = isFollowModeEnabled ? accentColor : mutedColor;
  const borderColor = `${mutedColor}59`; // ~35% opacity border, matching the design's translucent dividers

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
      {totalSeconds !== null ? (
        <Text style={[styles.elapsedTimeLabel, { color: mutedColor }]}>
          {formatSecondsAsMinutesColonSeconds(elapsedSeconds)} / {formatSecondsAsMinutesColonSeconds(totalSeconds)}
        </Text>
      ) : null}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={onToggleFollowMode}
          style={[styles.followButton, { borderColor }]}
        >
          <Text style={{ color: followColor, fontSize: 12, fontFamily: fontFamily.bodyMedium }}>
            {followLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onTogglePlayPause}
          disabled={!isAutoScrollAvailable}
          style={[
            styles.playButton,
            { borderColor: accentColor, opacity: isAutoScrollAvailable ? 1 : 0.4 },
            elevationShadow.medium,
          ]}
        >
          {isPlaying ? <PauseIcon color={accentColor} /> : <PlayIcon color={accentColor} />}
        </Pressable>

        <View>
          <Pressable
            onPress={() => setIsFontPanelOpen((open) => !open)}
            style={[styles.fontPanelToggle, { borderColor }]}
          >
            <Text style={{ color: foregroundColor, fontFamily: fontFamily.bodyMedium }}>Aa</Text>
          </Pressable>

          {isFontPanelOpen ? (
            <View
              style={[
                styles.fontPanel,
                { backgroundColor: surfaceColor, borderColor, borderRadius: cornerRadius.medium },
                elevationShadow.medium,
              ]}
            >
              <FontScaleRow
                label="Lyrics"
                mutedColor={mutedColor}
                foregroundColor={foregroundColor}
                borderColor={borderColor}
                onDecrease={onDecreaseLyricFontScale}
                onIncrease={onIncreaseLyricFontScale}
              />
              <FontScaleRow
                label="Chords"
                mutedColor={mutedColor}
                foregroundColor={foregroundColor}
                borderColor={borderColor}
                onDecrease={onDecreaseChordFontScale}
                onIncrease={onIncreaseChordFontScale}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function FontScaleRow({
  label,
  mutedColor,
  foregroundColor,
  borderColor,
  onDecrease,
  onIncrease,
}: {
  label: string;
  mutedColor: string;
  foregroundColor: string;
  borderColor: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.fontScaleRow}>
      <Text style={{ color: mutedColor, fontSize: 11 }}>{label}</Text>
      <View style={styles.fontScaleButtons}>
        <Pressable onPress={onDecrease} style={[styles.fontScaleButton, { borderColor }]}>
          <Text style={{ color: foregroundColor }}>-</Text>
        </Pressable>
        <Pressable onPress={onIncrease} style={[styles.fontScaleButton, { borderColor }]}>
          <Text style={{ color: foregroundColor }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  elapsedTimeLabel: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPanelToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPanel: {
    position: 'absolute',
    bottom: 44,
    right: 0,
    borderWidth: 1,
    padding: 10,
    minWidth: 150,
    gap: 8,
  },
  fontScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fontScaleButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  fontScaleButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
