// The Library list's "..." dropdown (Edit/Duplicate/Delete), rendered once and
// shared across every row instead of embedded per-row. A `Modal` is what makes
// outside-tap-to-dismiss actually work here: it renders in its own native layer, so
// a full-screen backdrop Pressable and the menu itself are true siblings with a
// reliable paint/touch order (backdrop first, menu on top) — unlike an absolutely-
// positioned backdrop living alongside a FlatList, where touch order follows the
// render tree rather than any zIndex, and ends up swallowing taps meant for the
// menu's own buttons (the bug this replaced).
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeProvider';

export type SongOptionsMenuAnchor = { x: number; y: number; width: number; height: number };

const MENU_WIDTH_PIXELS = 130;
const MENU_VERTICAL_OFFSET_PIXELS = 4;

export function SongOptionsMenu({
  anchor,
  onEdit,
  onDuplicate,
  onDelete,
  onRequestClose,
}: {
  /** Screen-space position of the "..." button that opened this, from measureInWindow. `null` hides the menu. */
  anchor: SongOptionsMenuAnchor | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRequestClose: () => void;
}) {
  const { colorPalette, cornerRadius, elevationShadow } = useAppTheme();

  return (
    <Modal
      visible={anchor !== null}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
      {anchor ? (
        <View
          style={[
            styles.menu,
            {
              top: anchor.y + anchor.height + MENU_VERTICAL_OFFSET_PIXELS,
              left: anchor.x + anchor.width - MENU_WIDTH_PIXELS,
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
              onRequestClose();
              onEdit();
            }}
          >
            <Text style={{ color: colorPalette.elevatedSurfaceText, fontSize: 13 }}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              onRequestClose();
              onDuplicate();
            }}
          >
            <Text style={{ color: colorPalette.elevatedSurfaceText, fontSize: 13 }}>Duplicate</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              onRequestClose();
              onDelete();
            }}
          >
            <Text style={{ color: colorPalette.destructive, fontSize: 13 }}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH_PIXELS,
    borderWidth: 1,
    padding: 4,
    gap: 1,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
