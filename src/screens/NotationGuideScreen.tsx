// A static, always-available reference for the chord-sheet syntax (SPEC.md §5.10).
// Purely static content, no data model involved — reachable from both the Editor's
// "?" button and Settings.
import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import type { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/ThemeProvider';

const NOTATION_GUIDE_ENTRIES = [
  {
    label: 'Song metadata (top of file)',
    code: '{title: ...}\n{artist: ...}\n{key: ...}\n{bpm: ...}\n{time: 4/4}\n{capo: ...}\n{duration: mm:ss}',
    note: 'Only meaningful at the top of the sheet.',
  },
  {
    label: 'Chord inline with lyrics',
    code: '[G]Time grabs you by the [D]wrist',
    note: 'One chord per bracket, placed right before the word/syllable it applies to.',
  },
  {
    label: 'Chords above a line (no per-syllable placement)',
    code: '[D] [G] [D] [G]\nQué voy a hacer con tanto cielo para mí',
    note: 'A chord-only line immediately followed by a plain lyric line (no brackets) spreads the chords evenly across the line instead of tying each one to a syllable — easier to type when you just want "these chords, this line" rather than exact placement.',
  },
  {
    label: 'Instrumental line',
    code: '[Em] [G] [D] [A]',
    note: 'A line with just chords, no lyrics.',
  },
  {
    label: 'Repeated chord (held extra bars)',
    code: '[G][G]',
    note: 'Back-to-back identical chords with nothing between them display as "Gx2" (or "Gx4", etc.) instead of repeating the label.',
  },
  {
    label: 'Per-chord strum accent',
    code: '[A] [↓ ↓ ↓ ↓]',
    note: 'A bracket containing only ↓ (down) / ↑ (up) / x (mute) / – (rest) glyphs renders as a small pill next to the chord instead of a chord label — for marking exactly how a chord in an instrumental line is strummed.',
  },
  {
    label: 'Repeated group of lines',
    code: '([A] [Em] [Bm]\n[F#m] [D] [A]) x2\n[A] [G]',
    note: 'Wrap one or more chord-only lines in a leading "(" and a trailing ") xN" to mark exactly which lines repeat, distinct from whatever comes after — here only the bracketed two lines repeat twice; "[A] [G]" plays once, right after.',
  },
  {
    label: 'Section label',
    code: '{comment: Verse 1}',
    note: 'Free text, rendered as a bold uppercase label.',
  },
  {
    label: 'Strum pattern',
    code: '{strum: D-DU-UDU-}',
    note: 'D=down, U=up, X=mute, -=rest, | separates bars. Non-D/U/X/-/| text (e.g. {strum: Finger picking}) renders as a plain label instead.',
  },
  {
    label: 'Tab block',
    code: '{start_of_tab}\ne|-------0-----0-|\nB|-----1-----1---|\n...\n{end_of_tab}',
    note: 'Aliases {sot}/{eot} also work. Rendered verbatim in a bordered monospace box.',
  },
] as const;

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function NotationGuideScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'NotationGuide'>) {
  const insets = useSafeAreaInsets();
  const { colorPalette, cornerRadius, fontFamily } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorPalette.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <BackChevronIcon color={colorPalette.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colorPalette.text, fontFamily: fontFamily.headingMedium },
          ]}
        >
          Notation Guide
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.entriesContainer}>
        {NOTATION_GUIDE_ENTRIES.map((entry) => (
          <View key={entry.label} style={styles.entry}>
            <Text style={{ color: colorPalette.textMuted, fontSize: 12, marginBottom: 4 }}>
              {entry.label}
            </Text>
            <View
              style={[
                styles.codeBlock,
                { backgroundColor: colorPalette.neutral[800], borderRadius: cornerRadius.medium },
              ]}
            >
              <Text
                style={{
                  color: colorPalette.accentRamp[300],
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              >
                {entry.code}
              </Text>
            </View>
            <Text style={{ color: colorPalette.textMuted, fontSize: 12, marginTop: 4 }}>
              {entry.note}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerIconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
  },
  entriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 16,
  },
  entry: {
    gap: 0,
  },
  codeBlock: {
    padding: 12,
  },
});
