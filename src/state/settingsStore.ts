// App-wide preferences (SPEC.md §5.1 item 4 — Settings). These aren't part of the
// song library (§8.2 only models songs), so they're kept in a small persisted zustand
// store — a reasonable local key-value store for a handful of app preferences.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppThemePreference = 'light' | 'dark' | 'system';

const MINIMUM_FONT_SCALE = 0.8;
const MAXIMUM_LYRIC_FONT_SCALE = 1.6;
const MAXIMUM_CHORD_FONT_SCALE = 1.8;
const FONT_SCALE_STEP = 0.1;

function clampFontScale(value: number, minimum: number, maximum: number): number {
  return Math.round(Math.min(maximum, Math.max(minimum, value)) * 100) / 100;
}

type SettingsState = {
  themePreference: AppThemePreference;
  defaultLyricFontScale: number;
  defaultChordFontScale: number;
  setThemePreference: (themePreference: AppThemePreference) => void;
  increaseDefaultLyricFontScale: () => void;
  decreaseDefaultLyricFontScale: () => void;
  increaseDefaultChordFontScale: () => void;
  decreaseDefaultChordFontScale: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      defaultLyricFontScale: 1,
      defaultChordFontScale: 1,

      setThemePreference: (themePreference) => set({ themePreference }),

      increaseDefaultLyricFontScale: () =>
        set((state) => ({
          defaultLyricFontScale: clampFontScale(
            state.defaultLyricFontScale + FONT_SCALE_STEP,
            MINIMUM_FONT_SCALE,
            MAXIMUM_LYRIC_FONT_SCALE,
          ),
        })),
      decreaseDefaultLyricFontScale: () =>
        set((state) => ({
          defaultLyricFontScale: clampFontScale(
            state.defaultLyricFontScale - FONT_SCALE_STEP,
            MINIMUM_FONT_SCALE,
            MAXIMUM_LYRIC_FONT_SCALE,
          ),
        })),
      increaseDefaultChordFontScale: () =>
        set((state) => ({
          defaultChordFontScale: clampFontScale(
            state.defaultChordFontScale + FONT_SCALE_STEP,
            MINIMUM_FONT_SCALE,
            MAXIMUM_CHORD_FONT_SCALE,
          ),
        })),
      decreaseDefaultChordFontScale: () =>
        set((state) => ({
          defaultChordFontScale: clampFontScale(
            state.defaultChordFontScale - FONT_SCALE_STEP,
            MINIMUM_FONT_SCALE,
            MAXIMUM_CHORD_FONT_SCALE,
          ),
        })),
    }),
    {
      name: 'chord-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
