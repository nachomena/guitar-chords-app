// Renders a parsed song's lines in place, in document order (SPEC.md §8.4): chord
// symbols positioned above the lyric they apply to, section-label comments set apart
// with extra spacing (§5.9), strum-pattern glyph rows (§5.8), and tab blocks as a
// bordered monospace box (§5.9). Reused by both the Performance view and the Song
// Editor's live preview, so colors are passed in rather than read from the app theme
// directly — the Performance view has its own independent light/dark toggle that can
// differ from the Settings theme (§5.1/§5.6).
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import type { RenderableChordSheetLine } from '../chordpro/rendering';
import type { RenderableLyricToken } from '../chordpro/types';
import { useAppTheme } from '../theme/ThemeProvider';

export type ChordSheetViewColors = {
  lyricText: string;
  chordText: string;
  mutedText: string;
  surface: string;
  divider: string;
};

function LyricLineTokenView({
  token,
  lyricFontSizePixels,
  chordFontSizePixels,
  colors,
  onChordPress,
  isChordSymbolRecognized,
}: {
  token: RenderableLyricToken;
  lyricFontSizePixels: number;
  chordFontSizePixels: number;
  colors: ChordSheetViewColors;
  onChordPress: (chordSymbol: string) => void;
  isChordSymbolRecognized?: (chordSymbol: string) => boolean;
}) {
  const { fontFamily } = useAppTheme();
  const isUnrecognizedChord =
    token.chordSymbol !== null &&
    isChordSymbolRecognized !== undefined &&
    !isChordSymbolRecognized(token.chordSymbol);

  return (
    <View style={styles.lyricToken}>
      {token.strumAccentGlyphs ? (
        <View style={[styles.strumAccentPill, { backgroundColor: colors.surface, marginHorizontal: 4 }]}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: chordFontSizePixels * 0.8,
              color: colors.chordText,
              fontFamily: fontFamily.bodyBold,
            }}
          >
            {token.strumAccentGlyphs}
          </Text>
        </View>
      ) : token.chordDisplayLabel ? (
        <Text
          onPress={() => onChordPress(token.chordSymbol as string)}
          suppressHighlighting
          numberOfLines={1}
          style={[
            styles.chordLabel,
            {
              fontSize: chordFontSizePixels,
              color: colors.chordText,
              fontFamily: fontFamily.bodyBold,
              textDecorationLine: isUnrecognizedChord ? 'underline' : 'none',
              textDecorationStyle: isUnrecognizedChord ? 'dotted' : 'solid',
              textDecorationColor: isUnrecognizedChord ? colors.mutedText : undefined,
            },
          ]}
        >
          {token.chordDisplayLabel}
        </Text>
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.lyricText,
          { fontSize: lyricFontSizePixels, color: colors.lyricText, fontFamily: fontFamily.bodyRegular },
        ]}
      >
        {token.lyricText}
      </Text>
    </View>
  );
}

function DistributedChordChip({
  chordToken,
  chordFontSizePixels,
  colors,
  onChordPress,
  isChordSymbolRecognized,
}: {
  chordToken: RenderableLyricToken;
  chordFontSizePixels: number;
  colors: ChordSheetViewColors;
  onChordPress: (chordSymbol: string) => void;
  isChordSymbolRecognized?: (chordSymbol: string) => boolean;
}) {
  const { fontFamily } = useAppTheme();

  if (chordToken.strumAccentGlyphs) {
    return (
      <View style={[styles.strumAccentPill, { backgroundColor: colors.surface }]}>
        <Text
          numberOfLines={1}
          style={{ fontSize: chordFontSizePixels * 0.8, color: colors.chordText, fontFamily: fontFamily.bodyBold }}
        >
          {chordToken.strumAccentGlyphs}
        </Text>
      </View>
    );
  }

  if (!chordToken.chordDisplayLabel) return null;

  const isUnrecognizedChord =
    chordToken.chordSymbol !== null &&
    isChordSymbolRecognized !== undefined &&
    !isChordSymbolRecognized(chordToken.chordSymbol);

  return (
    <Text
      onPress={() => onChordPress(chordToken.chordSymbol as string)}
      suppressHighlighting
      numberOfLines={1}
      style={{
        fontSize: chordFontSizePixels,
        color: colors.chordText,
        fontFamily: fontFamily.bodyBold,
        textDecorationLine: isUnrecognizedChord ? 'underline' : 'none',
        textDecorationStyle: isUnrecognizedChord ? 'dotted' : 'solid',
        textDecorationColor: isUnrecognizedChord ? colors.mutedText : undefined,
      }}
    >
      {chordToken.chordDisplayLabel}
    </Text>
  );
}

export function ChordSheetView({
  renderableLines,
  lyricFontSizePixels,
  chordFontSizePixels,
  colors,
  onChordPress,
  isChordSymbolRecognized,
  onLineHeightMeasured,
}: {
  renderableLines: RenderableChordSheetLine[];
  lyricFontSizePixels: number;
  chordFontSizePixels: number;
  colors: ChordSheetViewColors;
  onChordPress: (chordSymbol: string) => void;
  /** When provided (the Editor's live preview — §5.1), unrecognized chord names get a dotted underline instead of the normal solid chord label. */
  isChordSymbolRecognized?: (chordSymbol: string) => boolean;
  /** When provided (the Performance view), reports each rendered line's real height as it's measured — feeds the scroll engine's comment-lines-scroll-faster pacing. */
  onLineHeightMeasured?: (lineIndex: number, height: number) => void;
}) {
  const { fontFamily } = useAppTheme();

  const makeOnLayoutHandler = (lineIndex: number) =>
    onLineHeightMeasured
      ? (layoutChangeEvent: LayoutChangeEvent) =>
          onLineHeightMeasured(lineIndex, layoutChangeEvent.nativeEvent.layout.height)
      : undefined;

  return (
    <View>
      {renderableLines.map((renderableLine, lineIndex) => {
        if (renderableLine.type === 'comment') {
          return (
            <Text
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              style={[
                styles.sectionLabel,
                {
                  fontSize: lyricFontSizePixels * 0.65,
                  color: colors.mutedText,
                  fontFamily: fontFamily.bodyBold,
                },
              ]}
            >
              {renderableLine.text.toUpperCase()}
            </Text>
          );
        }

        if (renderableLine.type === 'tabBlock') {
          return (
            <View
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              style={[
                styles.tabBlock,
                { backgroundColor: colors.surface, borderColor: colors.divider },
              ]}
            >
              {renderableLine.tabLines.map((tabLineText, tabLineIndex) => (
                <Text
                  key={tabLineIndex}
                  style={[
                    styles.tabLineText,
                    { fontSize: lyricFontSizePixels * 0.6, color: colors.lyricText },
                  ]}
                >
                  {tabLineText}
                </Text>
              ))}
            </View>
          );
        }

        if (renderableLine.type === 'distributedChordLine') {
          return (
            <View
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              style={styles.distributedChordLineContainer}
            >
              <View style={styles.distributedChordRow}>
                {renderableLine.chordTokens.map((chordToken, chordTokenIndex) => (
                  <DistributedChordChip
                    key={chordTokenIndex}
                    chordToken={chordToken}
                    chordFontSizePixels={chordFontSizePixels}
                    colors={colors}
                    onChordPress={onChordPress}
                    isChordSymbolRecognized={isChordSymbolRecognized}
                  />
                ))}
              </View>
              <Text
                style={{
                  fontSize: lyricFontSizePixels,
                  color: colors.lyricText,
                  fontFamily: fontFamily.bodyRegular,
                }}
              >
                {renderableLine.lyricText}
              </Text>
            </View>
          );
        }

        if (renderableLine.type === 'repeatedChordGroup') {
          return (
            <View
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              style={[styles.repeatedGroupContainer, { borderColor: colors.divider }]}
            >
              {renderableLine.groupLines.map((groupLineTokens, groupLineIndex) => (
                <View key={groupLineIndex} style={styles.lyricLine}>
                  {groupLineTokens.map((token, tokenIndex) => (
                    <LyricLineTokenView
                      key={tokenIndex}
                      token={token}
                      lyricFontSizePixels={lyricFontSizePixels}
                      chordFontSizePixels={chordFontSizePixels}
                      colors={colors}
                      onChordPress={onChordPress}
                      isChordSymbolRecognized={isChordSymbolRecognized}
                    />
                  ))}
                </View>
              ))}
              <View style={[styles.repeatedGroupBadge, { backgroundColor: colors.surface }]}>
                <Text
                  style={{ fontSize: lyricFontSizePixels * 0.75, color: colors.chordText, fontFamily: fontFamily.bodyBold }}
                >
                  × {renderableLine.repeatCount}
                </Text>
              </View>
            </View>
          );
        }

        if (renderableLine.type === 'strum') {
          return (
            <View
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              style={[styles.strumPill, { backgroundColor: colors.surface }]}
            >
              <Text
                style={{
                  fontSize: lyricFontSizePixels * 0.85,
                  color: colors.chordText,
                  fontFamily: fontFamily.bodyBold,
                  letterSpacing: renderableLine.isGlyphPattern ? 2 : 0,
                }}
              >
                {renderableLine.displayText}
              </Text>
            </View>
          );
        }

        return (
          <View key={lineIndex} onLayout={makeOnLayoutHandler(lineIndex)} style={styles.lyricLine}>
            {renderableLine.tokens.map((token, tokenIndex) => (
              <LyricLineTokenView
                key={tokenIndex}
                token={token}
                lyricFontSizePixels={lyricFontSizePixels}
                chordFontSizePixels={chordFontSizePixels}
                colors={colors}
                onChordPress={onChordPress}
                isChordSymbolRecognized={isChordSymbolRecognized}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lyricLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  lyricToken: {
    flexDirection: 'column',
    marginRight: 2,
  },
  chordLabel: {
    flexShrink: 0,
  },
  strumAccentPill: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  lyricText: {
    flexShrink: 0,
  },
  distributedChordLineContainer: {
    marginBottom: 6,
  },
  distributedChordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 0,
    marginBottom: 2,
    marginRight: 20,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 4,
  },
  tabBlock: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  tabLineText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 18,
  },
  strumPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginVertical: 6,
  },
  repeatedGroupContainer: {
    position: 'relative',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    paddingRight: 34,
    marginVertical: 8,
  },
  repeatedGroupBadge: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
