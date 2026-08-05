import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../state/settingsStore';
import {
  cornerRadiusScale,
  darkColorPalette,
  elevationShadowStyleByLevel,
  fontFamilyByWeight,
  lightColorPalette,
  spacingScale,
  type ColorPalette,
} from './tokens';

type AppTheme = {
  isDarkTheme: boolean;
  colorPalette: ColorPalette;
  spacing: typeof spacingScale;
  cornerRadius: typeof cornerRadiusScale;
  fontFamily: typeof fontFamilyByWeight;
  elevationShadow: typeof elevationShadowStyleByLevel;
};

const AppThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const themePreference = useSettingsStore((state) => state.themePreference);
  const systemColorScheme = useColorScheme();

  const appTheme = useMemo<AppTheme>(() => {
    const isDarkTheme =
      themePreference === 'system' ? systemColorScheme !== 'light' : themePreference === 'dark';
    return {
      isDarkTheme,
      colorPalette: isDarkTheme ? darkColorPalette : lightColorPalette,
      spacing: spacingScale,
      cornerRadius: cornerRadiusScale,
      fontFamily: fontFamilyByWeight,
      elevationShadow: elevationShadowStyleByLevel,
    };
  }, [themePreference, systemColorScheme]);

  return <AppThemeContext.Provider value={appTheme}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const appTheme = useContext(AppThemeContext);
  if (!appTheme) {
    throw new Error('useAppTheme must be called from within an AppThemeProvider');
  }
  return appTheme;
}
