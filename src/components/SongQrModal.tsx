// "Ver QR" on the song detail screen: a small modal showing a QR code that links to
// a Google lyrics search for the song. Follows the same Modal + backdrop-dismiss
// sheet pattern as ChordPopover.tsx for visual consistency. The QR code itself is
// generated locally/offline via react-native-qrcode-svg — no third-party QR image
// API involved, so it renders without network access.
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { buildLyricsSearchUrl } from '../utils/buildLyricsSearchUrl';
import { useAppTheme } from '../theme/ThemeProvider';

const QR_CODE_SIZE_PIXELS = 220;

export function SongQrModal({
  visible,
  title,
  artist,
  onRequestClose,
}: {
  visible: boolean;
  title: string;
  artist: string;
  onRequestClose: () => void;
}) {
  const { colorPalette, spacing, cornerRadius, fontFamily, elevationShadow } = useAppTheme();
  const lyricsSearchUrl = buildLyricsSearchUrl(title, artist);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        {/* A sibling of the sheet, not an ancestor — matches ChordPopover.tsx's
            reasoning for keeping the dismiss-tap target separate from the sheet's
            own content. */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colorPalette.elevatedSurface,
              borderRadius: cornerRadius.large,
              padding: spacing.extraLarge,
            },
            elevationShadow.large,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: colorPalette.elevatedSurfaceText, fontFamily: fontFamily.headingMedium },
            ]}
          >
            {title.trim() || 'Untitled song'}
          </Text>
          {artist.trim() ? (
            <Text
              numberOfLines={1}
              style={{ color: colorPalette.elevatedSurfaceTextMuted, fontSize: 13 }}
            >
              {artist}
            </Text>
          ) : null}

          <View style={styles.qrWrapper}>
            {lyricsSearchUrl ? (
              // The white card (not the QR component's own backgroundColor) is what
              // gives the QR its light backing — that way it gets rounded corners and
              // breathing room around the modules instead of a hard-edged white
              // square. Plain black-on-white regardless of theme: QR scanners rely on
              // strong, predictable contrast, so this deliberately doesn't pull from
              // elevatedSurface's colors the way the surrounding sheet does.
              <View style={[styles.qrCard, { borderRadius: cornerRadius.medium }]}>
                <QRCode
                  value={lyricsSearchUrl}
                  size={QR_CODE_SIZE_PIXELS}
                  color="#000000"
                  backgroundColor="#ffffff"
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.emptyStateText,
                  {
                    color: colorPalette.elevatedSurfaceTextMuted,
                    fontFamily: fontFamily.bodyRegular,
                  },
                ]}
              >
                Add a title or artist to generate a QR code.
              </Text>
            )}
          </View>

          <Pressable
            onPress={onRequestClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.closeButton, { borderColor: colorPalette.elevatedSurfaceBorder }]}
          >
            <Text style={{ color: colorPalette.elevatedSurfaceText, fontSize: 14 }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 24,
  },
  sheet: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
  },
  qrWrapper: {
    marginTop: 10,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  emptyStateText: {
    textAlign: 'center',
    width: QR_CODE_SIZE_PIXELS,
    paddingVertical: 40,
  },
  closeButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
  },
});
