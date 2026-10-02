// The chromatic Tuner screen (SPEC.md §5.6): live pitch detection from the
// microphone, plus the manual string picker SPEC.md calls for as a fallback.
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
const PULSE_RING_DURATION_MILLISECONDS = 1200;

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
  const noteColor = isInTune ? colorPalette.accent : colorPalette.textMuted;
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

  // A violet ring that expands outward and fades while the string is in tune —
  // loops for as long as isInTune stays true, resets the instant it goes false.
  const pulseAnimatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isInTune) {
      pulseAnimatedValue.stopAnimation();
      pulseAnimatedValue.setValue(0);
      return undefined;
    }
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnimatedValue, {
        toValue: 1,
        duration: PULSE_RING_DURATION_MILLISECONDS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [isInTune, pulseAnimatedValue]);

  const pulseRingScale = pulseAnimatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const pulseRingOpacity = pulseAnimatedValue.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.55, 0.18, 0],
  });

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
        <Text style={{ color: colorPalette.textMuted, fontSize: 13 }}>
          Target {Math.round(tuner.activeString.targetFrequencyHz)} Hz
        </Text>

        <View style={styles.noteCircleContainer}>
          {isInTune ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  borderColor: colorPalette.accent,
                  opacity: pulseRingOpacity,
                  transform: [{ scale: pulseRingScale }],
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.noteCircle,
              {
                borderColor: noteColor,
                backgroundColor: isInTune ? colorPalette.accentMuted : 'transparent',
              },
            ]}
          >
            <Text style={[styles.noteName, { color: noteColor, fontFamily: fontFamily.headingMedium }]}>
              {tuner.activeString.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.playingHz, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}>
          {tuner.detectedFrequencyHz !== null ? `${Math.round(tuner.detectedFrequencyHz)} Hz` : '— Hz'}
        </Text>
        <Text style={{ color: noteColor, fontSize: 14, fontWeight: '600' }}>
          {tuner.detectedFrequencyHz !== null
            ? `${tuner.centsOffset >= 0 ? '+' : ''}${Math.round(tuner.centsOffset)} cents`
            : 'Play a string to tune'}
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
            <Text style={{ color: colorPalette.textMuted, fontSize: 10 }}>flat</Text>
            <Text style={{ color: colorPalette.textMuted, fontSize: 10 }}>in tune</Text>
            <Text style={{ color: colorPalette.textMuted, fontSize: 10 }}>sharp</Text>
          </View>
        </View>

        <View style={styles.stringPickerRow}>
          {tuner.strings.map((stringDefinition, stringIndex) => {
            const isActiveString = stringIndex === tuner.activeStringIndex;
            const stringColor = isActiveString ? colorPalette.accent : colorPalette.textMuted;
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
    gap: 18,
    padding: 20,
  },
  noteCircleContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 999,
    borderWidth: 2,
  },
  noteCircle: {
    width: 176,
    height: 176,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteName: {
    fontSize: 76,
    lineHeight: 88,
  },
  playingHz: {
    fontSize: 40,
    lineHeight: 46,
  },
  gaugeContainer: {
    width: 260,
    marginTop: 8,
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
    gap: 8,
    marginTop: 4,
  },
  stringButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
