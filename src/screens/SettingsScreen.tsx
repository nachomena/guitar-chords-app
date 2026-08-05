// The Settings screen (SPEC.md §5.1 item 4).
import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Svg, { Polyline } from 'react-native-svg';

import { exportSongLibraryToJsonFile, pickJsonFileAndImportLibrary } from '../db/backup';
import { SONGS_QUERY_KEY } from '../db/songs';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore, type AppThemePreference, type FollowModeDetectionSetting } from '../state/settingsStore';
import { useAppTheme } from '../theme/ThemeProvider';

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ fontSize: 12, color, marginBottom: 8 }}>{children}</Text>;
}

function SegmentedControl<TValue extends string>({
  options,
  selectedValue,
  onSelect,
  colorPalette,
}: {
  options: { value: TValue; label: string }[];
  selectedValue: TValue;
  onSelect: (value: TValue) => void;
  colorPalette: ReturnType<typeof useAppTheme>['colorPalette'];
}) {
  return (
    <View style={[styles.segmentedControl, { borderColor: colorPalette.divider }]}>
      {options.map((option, optionIndex) => (
        <Pressable
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[
            styles.segmentOption,
            optionIndex > 0 && { borderLeftWidth: 1, borderLeftColor: colorPalette.divider },
            selectedValue === option.value && { backgroundColor: `${colorPalette.accent}22` },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              color: selectedValue === option.value ? colorPalette.accent : colorPalette.textMuted,
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function FontScaleStepper({
  percentage,
  onDecrease,
  onIncrease,
  colorPalette,
}: {
  percentage: number;
  onDecrease: () => void;
  onIncrease: () => void;
  colorPalette: ReturnType<typeof useAppTheme>['colorPalette'];
}) {
  return (
    <View style={styles.fontScaleStepperRow}>
      <Pressable onPress={onDecrease} style={[styles.fontScaleStepperButton, { borderColor: colorPalette.neutral[700] }]}>
        <Text style={{ color: colorPalette.text, fontSize: 12 }}>Aa-</Text>
      </Pressable>
      <Text style={{ color: colorPalette.text, fontSize: 13, minWidth: 36, textAlign: 'center' }}>{percentage}%</Text>
      <Pressable onPress={onIncrease} style={[styles.fontScaleStepperButton, { borderColor: colorPalette.neutral[700] }]}>
        <Text style={{ color: colorPalette.text, fontSize: 12 }}>Aa+</Text>
      </Pressable>
    </View>
  );
}

export function SettingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const insets = useSafeAreaInsets();
  const { colorPalette, fontFamily } = useAppTheme();
  const queryClient = useQueryClient();

  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const defaultLyricFontScale = useSettingsStore((state) => state.defaultLyricFontScale);
  const defaultChordFontScale = useSettingsStore((state) => state.defaultChordFontScale);
  const increaseDefaultLyricFontScale = useSettingsStore((state) => state.increaseDefaultLyricFontScale);
  const decreaseDefaultLyricFontScale = useSettingsStore((state) => state.decreaseDefaultLyricFontScale);
  const increaseDefaultChordFontScale = useSettingsStore((state) => state.increaseDefaultChordFontScale);
  const decreaseDefaultChordFontScale = useSettingsStore((state) => state.decreaseDefaultChordFontScale);
  const followModeDetectionSetting = useSettingsStore((state) => state.followModeDetectionSetting);
  const setFollowModeDetectionSetting = useSettingsStore((state) => state.setFollowModeDetectionSetting);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportLibrary = async () => {
    setIsExporting(true);
    try {
      await exportSongLibraryToJsonFile();
    } catch (exportError) {
      Alert.alert('Export failed', exportError instanceof Error ? exportError.message : 'Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    setIsImporting(true);
    try {
      const importResult = await pickJsonFileAndImportLibrary(mode);
      if (importResult.status === 'success') {
        await queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
        Alert.alert(
          'Import complete',
          mode === 'replace'
            ? `Library replaced with ${importResult.importedSongCount} song${importResult.importedSongCount === 1 ? '' : 's'}.`
            : `Added ${importResult.importedSongCount} new song${importResult.importedSongCount === 1 ? '' : 's'}.`,
        );
      } else if (importResult.status === 'invalidFile') {
        Alert.alert('Import failed', 'That file doesn’t look like a Chord App backup.');
      }
    } catch (importError) {
      Alert.alert('Import failed', importError instanceof Error ? importError.message : 'Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportLibrary = () => {
    Alert.alert('Import library', 'Merge with your current library, or replace it entirely?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Merge', onPress: () => void runImport('merge') },
      { text: 'Replace', style: 'destructive', onPress: () => void runImport('replace') },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colorPalette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <BackChevronIcon color={colorPalette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}>
          Settings
        </Text>
      </View>

      <View style={styles.sectionsContainer}>
        <View>
          <SectionLabel color={colorPalette.textMuted}>Theme</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'light' as AppThemePreference, label: 'Light' },
              { value: 'dark' as AppThemePreference, label: 'Dark' },
              { value: 'system' as AppThemePreference, label: 'System' },
            ]}
            selectedValue={themePreference}
            onSelect={setThemePreference}
            colorPalette={colorPalette}
          />
        </View>

        <View>
          <SectionLabel color={colorPalette.textMuted}>Default lyric font size</SectionLabel>
          <FontScaleStepper
            percentage={Math.round(defaultLyricFontScale * 100)}
            onDecrease={decreaseDefaultLyricFontScale}
            onIncrease={increaseDefaultLyricFontScale}
            colorPalette={colorPalette}
          />
        </View>

        <View>
          <SectionLabel color={colorPalette.textMuted}>Default chord font size</SectionLabel>
          <FontScaleStepper
            percentage={Math.round(defaultChordFontScale * 100)}
            onDecrease={decreaseDefaultChordFontScale}
            onIncrease={increaseDefaultChordFontScale}
            colorPalette={colorPalette}
          />
        </View>

        <View>
          <SectionLabel color={colorPalette.textMuted}>Follow Mode detection</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'precise' as FollowModeDetectionSetting, label: 'Precise' },
              { value: 'simple' as FollowModeDetectionSetting, label: 'Simple' },
            ]}
            selectedValue={followModeDetectionSetting}
            onSelect={setFollowModeDetectionSetting}
            colorPalette={colorPalette}
          />
        </View>

        <View>
          <SectionLabel color={colorPalette.textMuted}>Reference</SectionLabel>
          <Pressable
            onPress={() => navigation.navigate('NotationGuide')}
            style={[styles.secondaryButton, { borderColor: colorPalette.divider }]}
          >
            <Text style={{ color: colorPalette.text }}>Notation Guide</Text>
          </Pressable>
        </View>

        <View>
          <SectionLabel color={colorPalette.textMuted}>Backup</SectionLabel>
          <View style={{ gap: 8 }}>
            <Pressable
              disabled={isExporting}
              onPress={() => void handleExportLibrary()}
              style={[styles.secondaryButton, { borderColor: colorPalette.divider, opacity: isExporting ? 0.6 : 1 }]}
            >
              <Text style={{ color: colorPalette.text, textAlign: 'center' }}>
                {isExporting ? 'Exporting…' : 'Export library (JSON)'}
              </Text>
            </Pressable>
            <Pressable
              disabled={isImporting}
              onPress={handleImportLibrary}
              style={[styles.secondaryButton, { borderColor: colorPalette.divider, opacity: isImporting ? 0.6 : 1 }]}
            >
              <Text style={{ color: colorPalette.text, textAlign: 'center' }}>
                {isImporting ? 'Importing…' : 'Import library (JSON)'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.aboutSection, { borderTopColor: colorPalette.neutral[800] }]}>
          <Text style={{ color: colorPalette.textMuted, fontSize: 11 }}>Chord App — v1.0.0 (local-only)</Text>
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
  sectionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 20,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segmentOption: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  fontScaleStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fontScaleStepperButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aboutSection: {
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
