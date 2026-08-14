// A single row in the Library list (SPEC.md §5.1 item 1): title + artist, a
// favorite star, and a "..." menu for Edit/Duplicate/Delete (in lieu of swipe/
// long-press gestures, which need a gesture-handler-driven swipeable row — a
// tappable menu covers the same actions with less gesture-conflict risk against
// the list's own scrolling).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

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
  onEdit,
  onDuplicate,
  onDelete,
}: {
  song: SongRow;
  onPress: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { colorPalette, spacing, cornerRadius, fontFamily, elevationShadow } = useAppTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colorPalette.surface, borderRadius: cornerRadius.medium, padding: spacing.large, borderWidth: 1, borderColor: colorPalette.divider },
        // The "..." menu below needs to render on top of the *next* card in the
        // list, not just within its own row — bump this row's stacking order
        // (and Android's elevation, which drives sibling paint order there)
        // above every other row's while its menu is open.
        isMenuOpen && styles.cardWithMenuOpen,
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

          <View>
            <Pressable
              hitSlop={8}
              onPress={() => setIsMenuOpen((open) => !open)}
              style={styles.iconButton}
            >
              <OverflowMenuIcon color={colorPalette.textMuted} />
            </Pressable>

            {isMenuOpen ? (
              <View
                style={[
                  styles.menu,
                  {
                    backgroundColor: colorPalette.elevatedSurface,
                    borderColor: colorPalette.elevatedSurfaceBorder,
                    borderRadius: cornerRadius.medium,
                  },
                  elevationShadow.medium,
                ]}
              >
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setIsMenuOpen(false);
                    onEdit();
                  }}
                >
                  <Text style={{ color: colorPalette.elevatedSurfaceText, fontSize: 13 }}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setIsMenuOpen(false);
                    onDuplicate();
                  }}
                >
                  <Text style={{ color: colorPalette.elevatedSurfaceText, fontSize: 13 }}>Duplicate</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Text style={{ color: colorPalette.destructive, fontSize: 13 }}>Delete</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  cardWithMenuOpen: {
    zIndex: 50,
    elevation: 24,
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
  menu: {
    position: 'absolute',
    right: 0,
    top: 32,
    zIndex: 10,
    minWidth: 130,
    borderWidth: 1,
    padding: 4,
    gap: 1,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
