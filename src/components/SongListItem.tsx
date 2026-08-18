// A single row in the Library list (SPEC.md §5.1 item 1): title + artist, a
// favorite star, and a "..." button that opens the shared SongOptionsMenu (Edit/
// Duplicate/Delete) — in lieu of swipe/long-press gestures, which need a
// gesture-handler-driven swipeable row.
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import type { SongOptionsMenuAnchor } from './SongOptionsMenu';
import type { SongRow } from '../db/schema';
import { useAppTheme } from '../theme/ThemeProvider';

function FavoriteStarIcon({ isFavorite, color }: { isFavorite: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill={isFavorite ? color : 'none'}
        stroke={color}
        strokeWidth={isFavorite ? 2 : 2.5}
      />
    </Svg>
  );
}

function OverflowMenuIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.8} fill={color} />
      <Circle cx={12} cy={12} r={1.8} fill={color} />
      <Circle cx={19} cy={12} r={1.8} fill={color} />
    </Svg>
  );
}

export function SongListItem({
  song,
  onPress,
  onToggleFavorite,
  onOpenMenu,
}: {
  song: SongRow;
  onPress: () => void;
  onToggleFavorite: () => void;
  /** The actual Edit/Duplicate/Delete menu is a single shared Modal owned by
   * LibraryScreen (SongOptionsMenu) — this just reports where its "..." button
   * landed on screen so that menu can anchor itself there. */
  onOpenMenu: (anchor: SongOptionsMenuAnchor) => void;
}) {
  const { colorPalette, spacing, cornerRadius, fontFamily } = useAppTheme();
  const menuButtonRef = useRef<View>(null);

  const handleOpenMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      onOpenMenu({ x, y, width, height });
    });
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colorPalette.surface,
          borderRadius: cornerRadius.medium,
          padding: spacing.large,
          borderWidth: 1,
          borderColor: colorPalette.divider,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleColumn}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}
          >
            {song.title}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, { color: colorPalette.textMuted }]}>
            {song.artist}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable hitSlop={8} onPress={onToggleFavorite} style={styles.iconButton}>
            <FavoriteStarIcon
              isFavorite={song.isFavorite ?? false}
              color={song.isFavorite ? colorPalette.accent : colorPalette.textMuted}
            />
          </Pressable>

          <Pressable ref={menuButtonRef} hitSlop={8} onPress={handleOpenMenu} style={styles.iconButton}>
            <OverflowMenuIcon color={colorPalette.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleColumn: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 20,
  },
  artist: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
