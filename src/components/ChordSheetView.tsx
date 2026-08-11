// Renders a parsed song's lines in place, in document order (SPEC.md §8.4): chord
// symbols positioned above the lyric they apply to, section-label comments set apart
// with extra spacing (§5.9), strum-pattern glyph rows (§5.8), and tab blocks as a
// bordered monospace box (§5.9). Reused by both the Performance view and the Song
// Editor's live preview, so colors are passed in rather than read from the app theme
// directly — the Performance view has its own independent light/dark toggle that can
// differ from the Settings theme (§5.1/§5.6).
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { distributeLyricWordsAcrossChordTokens, type RenderableChordSheetLine } from '../chordpro/rendering';
import type { RenderableLyricToken } from '../chordpro/types';
import { useAppTheme } from '../theme/ThemeProvider';

export type ChordSheetViewColors = {
  lyricText: string;
  chordText: string;
  mutedText: string;
  surface: string;
  divider: string;
};

function StrumAccentPill({
  glyphs,
  chordFontSizePixels,
  colors,
  style,
}: {
  glyphs: string;
  chordFontSizePixels: number;
  colors: ChordSheetViewColors;
  style?: object;
}) {
  const { fontFamily } = useAppTheme();
  return (
    <View style={[styles.strumAccentPill, { backgroundColor: colors.surface }, style]}>
      <Text
        numberOfLines={1}
        style={{
          fontSize: chordFontSizePixels * 0.8,
          color: colors.chordText,
          fontFamily: fontFamily.bodyBold,
        }}
      >
        {glyphs}
      </Text>
    </View>
  );
}

function LyricLineTokenView({
  token,
  attachedStrumAccentGlyphs,
  lyricFontSizePixels,
  chordFontSizePixels,
  colors,
  onChordPress,
  isChordSymbolRecognized,
}: {
  token: RenderableLyricToken;
  /** A strum accent (e.g. `↓` in `[Em] [↓]`) immediately following this chord in the
   * source, rendered right next to the chord label instead of as its own token — see
   * `mergeAttachedStrumAccents`'s doc comment for why. */
  attachedStrumAccentGlyphs?: string | null;
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
  // No real lyric text under this chord (an instrumental line, or a trailing chord
  // in a distributedChordLine whose word chunk came up empty) — give it extra
  // breathing room from its neighbor instead of the tight word-to-chord margin,
  // since there's no lyric text underneath to visually separate them.
  const hasNoLyricTextUnderneath = token.lyricText.trim() === '';

  return (
    <View style={[styles.lyricToken, hasNoLyricTextUnderneath && styles.lyricTokenSpaced]}>
      <View style={styles.chordHeaderRow}>
        {token.strumAccentGlyphs ? (
          <StrumAccentPill
            glyphs={token.strumAccentGlyphs}
            chordFontSizePixels={chordFontSizePixels}
            colors={colors}
          />
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
            {token.repeatCountLabel ? (
              <Text style={{ fontFamily: fontFamily.bodyRegular, color: colors.chordText }}>
                {token.repeatCountLabel}
              </Text>
            ) : null}
          </Text>
        ) : null}
        {attachedStrumAccentGlyphs ? (
          <StrumAccentPill
            glyphs={attachedStrumAccentGlyphs}
            chordFontSizePixels={chordFontSizePixels}
            colors={colors}
            style={styles.attachedStrumAccentPill}
          />
        ) : null}
      </View>
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

/**
 * A strum-accent token immediately following the chord it accents (`[Em] [↓]`) isn't
 * really an independent column in the row — it's a small badge that belongs right
 * next to that chord's label. Rendering it as its own sibling token breaks down as
 * soon as the chord's own lyricText is long (e.g. a whole sung phrase under a
 * distributedChordLine's word-chunked "Em"): the chord's token box widens to fit
 * that text, so the accent — positioned after that whole wide box — ends up far to
 * the right of the chord label it's meant to sit beside, no matter how small the
 * margin between the two tokens is. Merging the accent into the chord token's own
 * header (see `attachedStrumAccentGlyphs` above) fixes this at the source: the
 * accent renders next to the chord label itself, not after the wide box beneath it.
 */
function mergeAttachedStrumAccents(
  tokens: RenderableLyricToken[],
): Array<{ token: RenderableLyricToken; attachedStrumAccentGlyphs: string | null }> {
  const mergedTokens: Array<{ token: RenderableLyricToken; attachedStrumAccentGlyphs: string | null }> = [];
  let tokenIndex = 0;
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    const nextToken = tokens[tokenIndex + 1];
    const nextIsAttachedStrumAccent =
      token.strumAccentGlyphs === null &&
      token.chordDisplayLabel !== null &&
      nextToken?.strumAccentGlyphs != null;

    if (nextIsAttachedStrumAccent) {
      mergedTokens.push({ token, attachedStrumAccentGlyphs: nextToken.strumAccentGlyphs });
      tokenIndex += 2; // the next token was consumed as this chord's accent
    } else {
      mergedTokens.push({ token, attachedStrumAccentGlyphs: null });
      tokenIndex += 1;
    }
  }
  return mergedTokens;
}

function TokenRow({
  tokens,
  onLayout,
  lyricFontSizePixels,
  chordFontSizePixels,
  colors,
  onChordPress,
  isChordSymbolRecognized,
}: {
  tokens: RenderableLyricToken[];
  onLayout?: (layoutChangeEvent: LayoutChangeEvent) => void;
  lyricFontSizePixels: number;
  chordFontSizePixels: number;
  colors: ChordSheetViewColors;
  onChordPress: (chordSymbol: string) => void;
  isChordSymbolRecognized?: (chordSymbol: string) => boolean;
}) {
  const mergedTokens = mergeAttachedStrumAccents(tokens);
  return (
    <View style={styles.lyricLine} onLayout={onLayout}>
      {mergedTokens.map(({ token, attachedStrumAccentGlyphs }, tokenIndex) => (
        <LyricLineTokenView
          key={tokenIndex}
          token={token}
          attachedStrumAccentGlyphs={attachedStrumAccentGlyphs}
          lyricFontSizePixels={lyricFontSizePixels}
          chordFontSizePixels={chordFontSizePixels}
          colors={colors}
          onChordPress={onChordPress}
          isChordSymbolRecognized={isChordSymbolRecognized}
        />
      ))}
    </View>
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
          // Each chord gets its own word chunk of the real lyric text (see
          // distributeLyricWordsAcrossChordTokens) and renders through the same
          // chord-over-word token as a normal line, instead of a chip row spread
          // across the full container width with the lyric text printed separately
          // below — that previous approach made the chords balloon out past a short
          // lyric line (e.g. a single ad-lib word under 3-4 chords).
          const wordChunkedTokens = distributeLyricWordsAcrossChordTokens(
            renderableLine.lyricText,
            renderableLine.chordTokens,
          );
          return (
            <TokenRow
              key={lineIndex}
              onLayout={makeOnLayoutHandler(lineIndex)}
              tokens={wordChunkedTokens}
              lyricFontSizePixels={lyricFontSizePixels}
              chordFontSizePixels={chordFontSizePixels}
              colors={colors}
              onChordPress={onChordPress}
              isChordSymbolRecognized={isChordSymbolRecognized}
            />
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
                <TokenRow
                  key={groupLineIndex}
                  tokens={groupLineTokens}
                  lyricFontSizePixels={lyricFontSizePixels}
                  chordFontSizePixels={chordFontSizePixels}
                  colors={colors}
                  onChordPress={onChordPress}
                  isChordSymbolRecognized={isChordSymbolRecognized}
                />
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
          <TokenRow
            key={lineIndex}
            onLayout={makeOnLayoutHandler(lineIndex)}
            tokens={renderableLine.tokens}
            lyricFontSizePixels={lyricFontSizePixels}
            chordFontSizePixels={chordFontSizePixels}
            colors={colors}
            onChordPress={onChordPress}
            isChordSymbolRecognized={isChordSymbolRecognized}
          />
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
  lyricTokenSpaced: {
    marginRight: 12,
  },
  chordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  attachedStrumAccentPill: {
    marginLeft: 3,
  },
  lyricText: {
    flexShrink: 0,
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
    marginRight: 12,
  },
  repeatedGroupBadge: {
    position: 'absolute',
    right: -14,
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
