// A fretboard grid with dots for finger positions and X/O above muted/open strings,
// drawn with code (SVG), not image assets (SPEC.md §5.7/§8.9).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Circle, Text as SvgText } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeProvider';
import type { ChordDiagramPosition } from '../chords/lookup';

const NUMBER_OF_STRINGS = 6;
const NUMBER_OF_FRET_ROWS = 4;
const STRING_SPACING = 18;
const FRET_ROW_HEIGHT = 24;
const TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS = 22;
const NUT_THICKNESS = 4;
const GRID_LEFT_MARGIN = 10;

const DIAGRAM_WIDTH = GRID_LEFT_MARGIN * 2 + STRING_SPACING * (NUMBER_OF_STRINGS - 1);
const DIAGRAM_HEIGHT = TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS + FRET_ROW_HEIGHT * NUMBER_OF_FRET_ROWS + 8;

type BarreSpan = { fretRow: number; fromStringIndex: number; toStringIndex: number };

function computeBarreSpans(position: ChordDiagramPosition): BarreSpan[] {
  return position.barres.map((barreFretRow) => {
    const stringIndicesAtThisFretRow = position.frets
      .map((fretValue, stringIndex) => ({ fretValue, stringIndex }))
      .filter(({ fretValue }) => fretValue === barreFretRow)
      .map(({ stringIndex }) => stringIndex);
    return {
      fretRow: barreFretRow,
      fromStringIndex: Math.min(...stringIndicesAtThisFretRow),
      toStringIndex: Math.max(...stringIndicesAtThisFretRow),
    };
  });
}

function isStringCoveredByABarre(
  stringIndex: number,
  fretRow: number,
  barreSpans: BarreSpan[],
): boolean {
  return barreSpans.some(
    (barreSpan) =>
      barreSpan.fretRow === fretRow &&
      stringIndex >= barreSpan.fromStringIndex &&
      stringIndex <= barreSpan.toStringIndex,
  );
}

export function ChordDiagram({ position }: { position: ChordDiagramPosition }) {
  const { colorPalette, fontFamily } = useAppTheme();

  const barreSpans = computeBarreSpans(position);
  const stringXPosition = (stringIndex: number) => GRID_LEFT_MARGIN + stringIndex * STRING_SPACING;
  const fretRowYPosition = (fretRow: number) =>
    TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS + (fretRow - 1) * FRET_ROW_HEIGHT;

  return (
    <View style={styles.container}>
      {position.baseFret > 1 ? (
        <Text
          style={[
            styles.baseFretLabel,
            { color: colorPalette.elevatedSurfaceTextMuted, fontFamily: fontFamily.bodyMedium },
          ]}
        >
          {position.baseFret}fr
        </Text>
      ) : null}
      <Svg width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT}>
        {position.frets.map((fretValue, stringIndex) => {
          if (fretValue !== -1 && fretValue !== 0) return null;
          return (
            <SvgText
              key={`open-or-muted-${stringIndex}`}
              x={stringXPosition(stringIndex)}
              y={TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS - 10}
              fontSize={11}
              fill={colorPalette.elevatedSurfaceTextMuted}
              textAnchor="middle"
            >
              {fretValue === -1 ? 'X' : 'O'}
            </SvgText>
          );
        })}

        {Array.from({ length: NUMBER_OF_STRINGS }, (_unused, stringIndex) => (
          <Line
            key={`string-${stringIndex}`}
            x1={stringXPosition(stringIndex)}
            y1={TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS}
            x2={stringXPosition(stringIndex)}
            y2={TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS + FRET_ROW_HEIGHT * NUMBER_OF_FRET_ROWS}
            stroke={colorPalette.neutral[500]}
            strokeWidth={1.25}
          />
        ))}

        {Array.from({ length: NUMBER_OF_FRET_ROWS + 1 }, (_unused, fretLineIndex) => {
          const isNut = fretLineIndex === 0 && position.baseFret === 1;
          const y = TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS + fretLineIndex * FRET_ROW_HEIGHT;
          return (
            <Line
              key={`fret-line-${fretLineIndex}`}
              x1={stringXPosition(0)}
              y1={y}
              x2={stringXPosition(NUMBER_OF_STRINGS - 1)}
              y2={y}
              stroke={isNut ? colorPalette.elevatedSurfaceText : colorPalette.neutral[600]}
              strokeWidth={isNut ? NUT_THICKNESS : 1}
            />
          );
        })}

        {barreSpans.map((barreSpan, barreIndex) => (
          <Rect
            key={`barre-${barreIndex}`}
            x={stringXPosition(barreSpan.fromStringIndex) - 6}
            y={fretRowYPosition(barreSpan.fretRow) - FRET_ROW_HEIGHT / 2 + 4}
            width={
              stringXPosition(barreSpan.toStringIndex) -
              stringXPosition(barreSpan.fromStringIndex) +
              12
            }
            height={FRET_ROW_HEIGHT - 8}
            rx={(FRET_ROW_HEIGHT - 8) / 2}
            fill={colorPalette.accent}
          />
        ))}

        {position.frets.map((fretValue, stringIndex) => {
          if (fretValue <= 0) return null;
          if (isStringCoveredByABarre(stringIndex, fretValue, barreSpans)) return null;
          const fingerNumber = position.fingers[stringIndex];
          return (
            <React.Fragment key={`finger-dot-${stringIndex}`}>
              <Circle
                cx={stringXPosition(stringIndex)}
                cy={fretRowYPosition(fretValue)}
                r={8}
                fill={colorPalette.accent}
              />
              {fingerNumber > 0 ? (
                <SvgText
                  x={stringXPosition(stringIndex)}
                  y={fretRowYPosition(fretValue) + 4}
                  fontSize={10}
                  fill={colorPalette.background}
                  textAnchor="middle"
                >
                  {fingerNumber}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  baseFretLabel: {
    position: 'absolute',
    left: -26,
    top: TOP_MARGIN_FOR_OPEN_MUTED_GLYPHS - 6,
    fontSize: 11,
  },
});
