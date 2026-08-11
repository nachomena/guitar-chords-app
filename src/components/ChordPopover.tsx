// Tapping any chord symbol opens a small bottom-sheet diagram (SPEC.md §5.7). A
// plain RN Modal + slide-up View stands in for a dedicated bottom-sheet library
// (§8.9 lists one as an option, not a requirement — see the implementation plan's
// deviation notes). Multiple voicings page via a swipeable ScrollView with a
// dot-indicator row, defaulting to the first/most common voicing.
import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { lookupChordDiagram } from '../chords/lookup';
import { useAppTheme } from '../theme/ThemeProvider';
import { ChordDiagram } from './ChordDiagram';

export function useChordPopover() {
  const [selectedChordSymbol, setSelectedChordSymbol] = useState<string | null>(null);

  const openChordPopover = useCallback((chordSymbol: string) => {
    setSelectedChordSymbol(chordSymbol);
  }, []);

  const closeChordPopover = useCallback(() => {
    setSelectedChordSymbol(null);
  }, []);

  return { selectedChordSymbol, openChordPopover, closeChordPopover };
}

export function ChordPopover({
  chordSymbol,
  onRequestClose,
}: {
  chordSymbol: string | null;
  onRequestClose: () => void;
}) {
  const { colorPalette, spacing, cornerRadius, fontFamily, elevationShadow } = useAppTheme();
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState(0);
  // The sheet has no horizontal padding, so a page can be exactly the window's
  // width — read live so rotation/split-screen don't leave a stale value.
  const voicingPageWidth = useWindowDimensions().width;
  const voicingScrollViewRef = useRef<ScrollView>(null);

  const lookupResult = chordSymbol ? lookupChordDiagram(chordSymbol) : null;

  const handleVoicingPageScrollEnd = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      const pageIndex = Math.round(scrollEvent.nativeEvent.contentOffset.x / voicingPageWidth);
      setSelectedVoicingIndex(pageIndex);
    },
    [voicingPageWidth],
  );

  // Swiping the ScrollView is the primary way to page through voicings, but it's an
  // unreliable gesture on some platforms (e.g. mouse-drag on web) — the dots double
  // as tappable page buttons so there's always a reliable way to reach every voicing.
  const handleVoicingDotPress = useCallback(
    (pageIndex: number) => {
      voicingScrollViewRef.current?.scrollTo({ x: pageIndex * voicingPageWidth, animated: true });
      setSelectedVoicingIndex(pageIndex);
    },
    [voicingPageWidth],
  );

  const handleClose = useCallback(() => {
    setSelectedVoicingIndex(0);
    onRequestClose();
  }, [onRequestClose]);

  return (
    <Modal
      visible={chordSymbol !== null}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* A sibling of the sheet, not an ancestor — if this Pressable wrapped the
            sheet's content instead, it would claim the touch responder before the
            ScrollView below gets a chance to recognize a horizontal swipe, breaking
            paging between voicings (taps would still work, drags wouldn't). */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colorPalette.neutral[800],
              borderTopLeftRadius: cornerRadius.large,
              borderTopRightRadius: cornerRadius.large,
              paddingBottom: spacing.extraLarge,
            },
            elevationShadow.large,
          ]}
        >
          <Text
            style={[
              styles.chordName,
              { color: colorPalette.text, fontFamily: fontFamily.headingMedium },
            ]}
          >
            {chordSymbol}
          </Text>

          {lookupResult ? (
            <>
              <ScrollView
                ref={voicingScrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleVoicingPageScrollEnd}
                style={{ width: voicingPageWidth }}
              >
                {lookupResult.positions.map((position, positionIndex) => (
                  <View
                    key={positionIndex}
                    style={[styles.voicingPage, { width: voicingPageWidth }]}
                  >
                    <ChordDiagram position={position} />
                  </View>
                ))}
              </ScrollView>
              {lookupResult.positions.length > 1 ? (
                <View style={styles.voicingDotRow}>
                  {lookupResult.positions.map((_position, positionIndex) => (
                    <Pressable
                      key={positionIndex}
                      hitSlop={8}
                      onPress={() => handleVoicingDotPress(positionIndex)}
                    >
                      <View
                        style={[
                          styles.voicingDot,
                          {
                            backgroundColor:
                              positionIndex === selectedVoicingIndex
                                ? colorPalette.accent
                                : colorPalette.neutral[600],
                          },
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text
              style={{
                color: colorPalette.textMuted,
                fontFamily: fontFamily.bodyRegular,
                paddingVertical: spacing.extraLarge,
              }}
            >
              No diagram available
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 14,
  },
  chordName: {
    fontSize: 20,
  },
  voicingPage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicingDotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  voicingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
