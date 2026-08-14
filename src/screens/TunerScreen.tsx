// The chromatic Tuner screen (SPEC.md §5.6). Real-time pitch detection isn't wired
// up in this build (see src/audio/stubPitchDetector.ts and the implementation
// plan) — the manual string picker SPEC.md already calls for as an edge-case
// fallback is the primary interaction here until a native audio module is built and
// tested on a physical device.
import React, { useEffect, useRef } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { useTuner } from '../audio/useTuner';
import type { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/ThemeProvider';

const IN_TUNE_TOLERANCE_CENTS = 5;
// Matches roughly how often smoothed readings arrive — short enough that the needle
// keeps gliding continuously (GuitarTuna-style) instead of visibly pausing between
// updates, long enough to actually smooth out the motion rather than snapping.
const NEEDLE_ANIMATION_DURATION_MILLISECONDS = 150;

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function TunerScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Tuner'>) {
  const insets = useSafeAreaInsets();
  const { colorPalette, fontFamily } = useAppTheme();
  const tuner = useTuner();

  const isInTune = Math.abs(tuner.centsOffset) <= IN_TUNE_TOLERANCE_CENTS && tuner.detectedFrequencyHz !== null;
  const noteColor = isInTune ? colorPalette.accent : colorPalette.neutral[400];
  const needlePercentage = Math.max(0, Math.min(100, tuner.centsOffset + 50));

  const animatedNeedlePercentage = useRef(new Animated.Value(needlePercentage)).current;
  useEffect(() => {
    Animated.timing(animatedNeedlePercentage, {
      toValue: needlePercentage,
      duration: NEEDLE_ANIMATION_DURATION_MILLISECONDS,
      easing: Easing.out(Easing.ease),
      // Animating a percentage-based `left` is a layout property, which the native
      // driver can't handle — this stays JS-driven.
      useNativeDriver: false,
    }).start();
  }, [animatedNeedlePercentage, needlePercentage]);

  return (
    <View style={[styles.container, { backgroundColor: colorPalette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <BackChevronIcon color={colorPalette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}>
          Tuner
        </Text>
      </View>

      <View style={styles.body}>
        {!tuner.isDetectionImplemented ? (
          <View style={[styles.notImplementedBanner, { backgroundColor: colorPalette.surface }]}>
            <Text style={{ color: colorPalette.textMuted, fontSize: 12, textAlign: 'center' }}>
              Live pitch detection isn't wired up on this build yet — pick your string below.
            </Text>
          </View>
        ) : null}

        <Text style={[styles.noteName, { color: noteColor, fontFamily: fontFamily.headingMedium }]}>
          {tuner.activeString.label}
        </Text>
        <Text style={{ color: colorPalette.textMuted, fontSize: 13 }}>
          Target {tuner.activeString.targetFrequencyHz.toFixed(2)} Hz
        </Text>
        <Text style={{ color: colorPalette.textMuted, fontSize: 13 }}>
          {tuner.detectedFrequencyHz !== null
            ? `Playing ${tuner.detectedFrequencyHz.toFixed(2)} Hz · ${tuner.centsOffset >= 0 ? '+' : ''}${Math.round(tuner.centsOffset)} cents`
            : 'Playing — Hz'}
        </Text>

        <View style={styles.gaugeContainer}>
          <View style={[styles.gaugeTrack, { backgroundColor: colorPalette.neutral[800] }]}>
            <View style={[styles.gaugeCenterTick, { backgroundColor: colorPalette.neutral[600] }]} />
            <Animated.View
              style={[
                styles.gaugeNeedle,
                {
                  backgroundColor: noteColor,
                  left: animatedNeedlePercentage.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.gaugeLabelsRow}>
            <Text style={{ color: colorPalette.neutral[500], fontSize: 10 }}>flat</Text>
            <Text style={{ color: colorPalette.neutral[500], fontSize: 10 }}>in tune</Text>
            <Text style={{ color: colorPalette.neutral[500], fontSize: 10 }}>sharp</Text>
          </View>
        </View>

        <View style={styles.stringPickerRow}>
          {tuner.strings.map((stringDefinition, stringIndex) => {
            const isActiveString = stringIndex === tuner.activeStringIndex;
            const stringColor = isActiveString ? colorPalette.accent : colorPalette.neutral[400];
            return (
              <Pressable
                key={`${stringDefinition.noteName}-${stringIndex}`}
                onPress={() => tuner.selectString(stringIndex)}
                style={[
                  styles.stringButton,
                  { borderColor: isActiveString ? colorPalette.accent : colorPalette.neutral[700] },
                ]}
              >
                <Text style={{ color: stringColor }}>{stringDefinition.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 20,
  },
  notImplementedBanner: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 10,
  },
  noteName: {
    fontSize: 72,
  },
  gaugeContainer: {
    width: 240,
  },
  gaugeTrack: {
    position: 'relative',
    height: 6,
    borderRadius: 999,
  },
  gaugeCenterTick: {
    position: 'absolute',
    left: '50%',
    top: -6,
    width: 2,
    height: 18,
    marginLeft: -1,
  },
  gaugeNeedle: {
    position: 'absolute',
    top: -9,
    width: 22,
    height: 22,
    borderRadius: 999,
    marginLeft: -11,
  },
  gaugeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stringPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stringButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
