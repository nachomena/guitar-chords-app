// The Performance view's transport control (SPEC.md §5.1 item 2): a single
// floating play/pause button for auto-scroll (speed is fully automatic — no BPM
// display or nudge control here). Lyric/chord font size now only lives in Settings
// (§5.1 item 1's defaults) — there's no separate in-performance override anymore.
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

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
  accentColor,
  surfaceColor,
  bottomOffset,
}: {
  isPlaying: boolean;
  isAutoScrollAvailable: boolean;
  onTogglePlayPause: () => void;
  accentColor: string;
  surfaceColor: string;
  /** Safe-area-aware distance from the bottom edge, so it clears the home indicator. */
  bottomOffset: number;
}) {
  const { elevationShadow } = useAppTheme();

  return (
    <Pressable
      onPress={onTogglePlayPause}
      disabled={!isAutoScrollAvailable}
      style={[
        styles.playButton,
        {
          backgroundColor: surfaceColor,
          borderColor: accentColor,
          opacity: isAutoScrollAvailable ? 1 : 0.4,
        },
        elevationShadow.small,
      ]}
    >
      {isPlaying ? <PauseIcon color={accentColor} /> : <PlayIcon color={accentColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
