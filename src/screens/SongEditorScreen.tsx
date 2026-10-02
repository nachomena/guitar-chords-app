// The Song Editor (Add/Edit) screen (SPEC.md §5.1 item 3).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polyline } from 'react-native-svg';

import { ChordPopover, useChordPopover } from '../components/ChordPopover';
import { ChordSheetView } from '../components/ChordSheetView';
import { groupParsedLinesForRendering } from '../chordpro/rendering';
import { parseChordProSongText } from '../chordpro/parser';
import { extractEditableChordSheetBodyText } from '../chordpro/editableBodyText';
import { isRecognizedChordSymbol } from '../chords/lookup';
import { useCreateSongMutation, useSongQuery, useUpdateSongMutation } from '../db/songs';
import type { SongInputFields } from '../db/songs';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore } from '../state/settingsStore';
import { useAppTheme } from '../theme/ThemeProvider';

type SongEditorDraft = {
  title: string;
  artist: string;
  key: string;
  capo: string;
  durationMinutes: string;
  durationSeconds: string;
  bpm: string;
  timeSignatureNumerator: string;
  timeSignatureDenominator: string;
  tagsText: string;
  chordSheetBodyText: string;
};

function createBlankDraft(): SongEditorDraft {
  return {
    title: '',
    artist: '',
    key: '',
    capo: '0',
    durationMinutes: '',
    durationSeconds: '',
    bpm: '',
    timeSignatureNumerator: '4',
    timeSignatureDenominator: '4',
    tagsText: '',
    chordSheetBodyText: '',
  };
}

function buildChordSheetTextFromDraft(draft: SongEditorDraft): string {
  const metadataLines: string[] = [
    `{title: ${draft.title.trim()}}`,
    `{artist: ${draft.artist.trim()}}`,
  ];
  if (draft.key.trim()) metadataLines.push(`{key: ${draft.key.trim()}}`);
  if (draft.bpm.trim()) metadataLines.push(`{bpm: ${draft.bpm.trim()}}`);
  metadataLines.push(`{time: ${draft.timeSignatureNumerator}/${draft.timeSignatureDenominator}}`);
  const capoNumber = Number(draft.capo) || 0;
  if (capoNumber > 0) metadataLines.push(`{capo: ${capoNumber}}`);

  const durationTotalSeconds = (Number(draft.durationMinutes) || 0) * 60 + (Number(draft.durationSeconds) || 0);
  if (durationTotalSeconds > 0) {
    const durationMinutesPart = Math.floor(durationTotalSeconds / 60);
    const durationSecondsPart = durationTotalSeconds % 60;
    metadataLines.push(`{duration: ${durationMinutesPart}:${String(durationSecondsPart).padStart(2, '0')}}`);
  }

  return `${metadataLines.join('\n')}\n\n${draft.chordSheetBodyText}`;
}

function BackChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function useTapTempo(onBpmEstimated: (bpm: number) => void) {
  const tapTimestampsRef = useRef<number[]>([]);

  return () => {
    const now = Date.now();
    const previousTapTimestamps = tapTimestampsRef.current;
    const lastTapTimestamp = previousTapTimestamps[previousTapTimestamps.length - 1];

    // A gap of more than 2 seconds starts a fresh tap sequence.
    const tapTimestamps =
      lastTapTimestamp !== undefined && now - lastTapTimestamp < 2000
        ? [...previousTapTimestamps, now].slice(-5)
        : [now];
    tapTimestampsRef.current = tapTimestamps;

    if (tapTimestamps.length < 2) return;
    const intervalsMilliseconds = tapTimestamps
      .slice(1)
      .map((timestamp, index) => timestamp - tapTimestamps[index]);
    const averageIntervalMilliseconds =
      intervalsMilliseconds.reduce((sum, interval) => sum + interval, 0) / intervalsMilliseconds.length;
    onBpmEstimated(Math.round(60000 / averageIntervalMilliseconds));
  };
}

export function SongEditorScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'SongEditor'>) {
  const insets = useSafeAreaInsets();
  const { colorPalette, spacing, cornerRadius, fontFamily } = useAppTheme();
  const songId = route.params?.songId;
  const isNewSong = songId === undefined;

  const existingSongQuery = useSongQuery(songId);
  const createSongMutation = useCreateSongMutation();
  const updateSongMutation = useUpdateSongMutation();
  const defaultLyricFontScale = useSettingsStore((state) => state.defaultLyricFontScale);
  const defaultChordFontScale = useSettingsStore((state) => state.defaultChordFontScale);

  const draftStorageKey = `chord-app-song-editor-draft:${songId ?? 'new'}`;
  const [draft, setDraft] = useState<SongEditorDraft>(createBlankDraft());
  const [isShowingPreview, setIsShowingPreview] = useState(false);
  const [hasLoadedInitialDraft, setHasLoadedInitialDraft] = useState(isNewSong);
  const { selectedChordSymbol, openChordPopover, closeChordPopover } = useChordPopover();

  const handleTapTempo = useTapTempo((estimatedBpm) =>
    setDraft((currentDraft) => ({ ...currentDraft, bpm: String(estimatedBpm) })),
  );

  // Load either a restored autosaved draft or the existing song's fields (whichever
  // applies), once, the first time this screen has what it needs (§5.1: "autosave
  // draft locally to avoid losing edits").
  useEffect(() => {
    if (hasLoadedInitialDraft) return;
    if (!isNewSong && !existingSongQuery.data) return;

    void (async () => {
      const restoredDraftJson = await AsyncStorage.getItem(draftStorageKey);
      if (restoredDraftJson) {
        try {
          setDraft(JSON.parse(restoredDraftJson) as SongEditorDraft);
          setHasLoadedInitialDraft(true);
          return;
        } catch {
          // fall through to loading from the song / a blank draft
        }
      }

      const existingSong = existingSongQuery.data;
      if (existingSong) {
        setDraft({
          title: existingSong.title,
          artist: existingSong.artist,
          key: existingSong.originalKey ?? '',
          capo: String(existingSong.capo ?? 0),
          durationMinutes: existingSong.durationSeconds
            ? String(Math.floor(existingSong.durationSeconds / 60))
            : '',
          durationSeconds: existingSong.durationSeconds
            ? String(existingSong.durationSeconds % 60)
            : '',
          bpm: existingSong.bpm ? String(existingSong.bpm) : '',
          timeSignatureNumerator: String(existingSong.timeSignatureNumerator ?? 4),
          timeSignatureDenominator: String(existingSong.timeSignatureDenominator ?? 4),
          tagsText: (JSON.parse(existingSong.tags ?? '[]') as string[]).join(', '),
          chordSheetBodyText: extractEditableChordSheetBodyText(existingSong.chordSheet),
        });
      }
      setHasLoadedInitialDraft(true);
    })();
  }, [hasLoadedInitialDraft, isNewSong, existingSongQuery.data, draftStorageKey]);

  // Debounced autosave of the in-progress draft.
  useEffect(() => {
    if (!hasLoadedInitialDraft) return;
    const debounceTimer = setTimeout(() => {
      void AsyncStorage.setItem(draftStorageKey, JSON.stringify(draft));
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [draft, hasLoadedInitialDraft, draftStorageKey]);

  const previewRenderableLines = useMemo(
    () => groupParsedLinesForRendering(parseChordProSongText(draft.chordSheetBodyText).lines),
    [draft.chordSheetBodyText],
  );

  const setDraftField = <FieldName extends keyof SongEditorDraft>(
    fieldName: FieldName,
    value: SongEditorDraft[FieldName],
  ) => setDraft((currentDraft) => ({ ...currentDraft, [fieldName]: value }));

  const handleCancel = () => {
    void AsyncStorage.removeItem(draftStorageKey);
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!draft.title.trim()) return;

    const songInputFields: SongInputFields = {
      title: draft.title.trim(),
      artist: draft.artist.trim(),
      originalKey: draft.key.trim() || null,
      bpm: draft.bpm.trim() ? Number(draft.bpm) : null,
      timeSignatureNumerator: Number(draft.timeSignatureNumerator) || 4,
      timeSignatureDenominator: Number(draft.timeSignatureDenominator) || 4,
      capo: Number(draft.capo) || 0,
      durationSeconds:
        (Number(draft.durationMinutes) || 0) * 60 + (Number(draft.durationSeconds) || 0) || null,
      chordSheet: buildChordSheetTextFromDraft(draft),
      tags: draft.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    if (isNewSong) {
      await createSongMutation.mutateAsync(songInputFields);
    } else if (songId) {
      await updateSongMutation.mutateAsync({ songId, songInputFields });
    }
    await AsyncStorage.removeItem(draftStorageKey);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colorPalette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={handleCancel} style={styles.headerIconButton}>
          <BackChevronIcon color={colorPalette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}>
          {isNewSong ? 'New Song' : 'Edit Song'}
        </Text>
        <Pressable
          disabled={!draft.title.trim()}
          onPress={() => void handleSave()}
          style={[
            styles.saveButton,
            { borderColor: colorPalette.accent, opacity: draft.title.trim() ? 1 : 0.45 },
          ]}
        >
          <Text style={{ color: colorPalette.accent, fontFamily: fontFamily.bodyMedium }}>Save</Text>
        </Pressable>
      </View>

      <ScrollableFormBody colorPalette={colorPalette} spacing={spacing}>
        <FormField label="Title" colorPalette={colorPalette}>
          <TextInput
            value={draft.title}
            onChangeText={(text) => setDraftField('title', text)}
            placeholder="Song title"
            placeholderTextColor={colorPalette.textMuted}
            style={[styles.textInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
          />
        </FormField>

        <FormField label="Artist" colorPalette={colorPalette}>
          <TextInput
            value={draft.artist}
            onChangeText={(text) => setDraftField('artist', text)}
            placeholder="Artist"
            placeholderTextColor={colorPalette.textMuted}
            style={[styles.textInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
          />
        </FormField>

        <View style={styles.fieldRow}>
          <FormField label="Key" colorPalette={colorPalette} style={{ flex: 1 }}>
            <TextInput
              value={draft.key}
              onChangeText={(text) => setDraftField('key', text)}
              placeholder="e.g. G"
              placeholderTextColor={colorPalette.textMuted}
              style={[styles.textInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
            />
          </FormField>
          <FormField label="Capo" colorPalette={colorPalette} style={{ flex: 1 }}>
            <TextInput
              value={draft.capo}
              onChangeText={(text) => setDraftField('capo', text)}
              keyboardType="number-pad"
              style={[styles.textInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
            />
          </FormField>
        </View>

        <FormField label="Duration (primary — scroll speed source)" colorPalette={colorPalette}>
          <View style={styles.durationRow}>
            <TextInput
              value={draft.durationMinutes}
              onChangeText={(text) => setDraftField('durationMinutes', text)}
              keyboardType="number-pad"
              style={[styles.durationInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
            />
            <Text style={{ color: colorPalette.textMuted }}>min</Text>
            <TextInput
              value={draft.durationSeconds}
              onChangeText={(text) => setDraftField('durationSeconds', text)}
              keyboardType="number-pad"
              style={[styles.durationInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
            />
            <Text style={{ color: colorPalette.textMuted }}>sec</Text>
          </View>
        </FormField>

        <View style={styles.fieldRow}>
          <FormField label="BPM (fallback if no duration)" colorPalette={colorPalette} style={{ flex: 1 }}>
            <View style={styles.bpmRow}>
              <TextInput
                value={draft.bpm}
                onChangeText={(text) => setDraftField('bpm', text)}
                keyboardType="number-pad"
                style={[styles.textInput, { flex: 1, backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
              />
              <Pressable
                onPress={handleTapTempo}
                style={[styles.tapTempoButton, { borderColor: colorPalette.divider }]}
              >
                <Text style={{ color: colorPalette.text, fontSize: 11 }}>TAP</Text>
              </Pressable>
            </View>
          </FormField>
          <FormField label="Time signature" colorPalette={colorPalette} style={{ flex: 1 }}>
            <View style={styles.timeSignatureRow}>
              <TextInput
                value={draft.timeSignatureNumerator}
                onChangeText={(text) => setDraftField('timeSignatureNumerator', text)}
                keyboardType="number-pad"
                style={[styles.timeSignatureInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
              />
              <Text style={{ color: colorPalette.textMuted }}>/</Text>
              <TextInput
                value={draft.timeSignatureDenominator}
                onChangeText={(text) => setDraftField('timeSignatureDenominator', text)}
                keyboardType="number-pad"
                style={[styles.timeSignatureInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
              />
            </View>
          </FormField>
        </View>

        <FormField label="Tags" colorPalette={colorPalette}>
          <TextInput
            value={draft.tagsText}
            onChangeText={(text) => setDraftField('tagsText', text)}
            placeholder="acoustic, band X"
            placeholderTextColor={colorPalette.textMuted}
            style={[styles.textInput, { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider }]}
          />
        </FormField>

        <View>
          <View style={styles.chordSheetHeaderRow}>
            <Text style={{ color: colorPalette.textMuted, fontSize: 12 }}>Chord sheet</Text>
            <View style={styles.chordSheetHeaderButtons}>
              <Pressable
                onPress={() => navigation.navigate('NotationGuide')}
                style={[styles.notationGuideButton, { borderColor: colorPalette.divider }]}
              >
                <Text style={{ color: colorPalette.accent, fontSize: 12 }}>?</Text>
              </Pressable>
              <Pressable onPress={() => setIsShowingPreview((showing) => !showing)}>
                <Text style={{ color: colorPalette.accent, fontSize: 12 }}>
                  {isShowingPreview ? 'Edit' : 'Preview'}
                </Text>
              </Pressable>
            </View>
          </View>

          {isShowingPreview ? (
            <View
              style={[
                styles.previewBox,
                { backgroundColor: colorPalette.elevatedSurface, borderRadius: cornerRadius.medium },
              ]}
            >
              <ChordSheetView
                renderableLines={previewRenderableLines}
                lyricFontSizePixels={16 * defaultLyricFontScale}
                chordFontSizePixels={12 * defaultChordFontScale}
                colors={{
                  lyricText: colorPalette.elevatedSurfaceText,
                  chordText: colorPalette.accentRamp[300],
                  mutedText: colorPalette.elevatedSurfaceTextMuted,
                  surface: colorPalette.neutral[900],
                  divider: colorPalette.elevatedSurfaceDivider,
                }}
                onChordPress={openChordPopover}
                isChordSymbolRecognized={isRecognizedChordSymbol}
              />
            </View>
          ) : (
            <TextInput
              value={draft.chordSheetBodyText}
              onChangeText={(text) => setDraftField('chordSheetBodyText', text)}
              placeholder={'[C]Type lyrics with chords [G]like this'}
              placeholderTextColor={colorPalette.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.chordSheetTextInput,
                { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider },
              ]}
            />
          )}
        </View>
      </ScrollableFormBody>

      <ChordPopover chordSymbol={selectedChordSymbol} onRequestClose={closeChordPopover} />
    </View>
  );
}

function ScrollableFormBody({
  children,
  colorPalette,
  spacing,
}: {
  children: React.ReactNode;
  colorPalette: ReturnType<typeof useAppTheme>['colorPalette'];
  spacing: ReturnType<typeof useAppTheme>['spacing'];
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.large, paddingTop: 6, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  colorPalette,
  style,
  children,
}: {
  label: string;
  colorPalette: ReturnType<typeof useAppTheme>['colorPalette'];
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ gap: 5 }, style]}>
      <Text style={{ fontSize: 12, color: colorPalette.textMuted }}>{label}</Text>
      {children}
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
  saveButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationInput: {
    width: 70,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  bpmRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tapTempoButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeSignatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSignatureInput: {
    width: 60,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  chordSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chordSheetHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notationGuideButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    padding: 14,
    minHeight: 180,
  },
  chordSheetTextInput: {
    minHeight: 200,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 22,
  },
});
