// Design tokens ported from the imported Nocturne design system's
// `_ds/nocturne-14cbf0c4-cc71-4480-b544-1a1ffa035b2d/styles.css` (a quiet, compact
// dark interface: near-neutral blue-grey ground, Inter at medium weight, soft 8px
// radii, and a blurple accent used sparingly as a line/glow rather than a flood).
//
// Nocturne only ever defines a dark ground — there is no light-theme token set in
// the source stylesheet. SPEC.md §5.1 (Settings) and §5.6 (Performance view) both
// need a working light mode, so the light palette below is derived using the same
// ramp-based formula the design prototype already used for the Performance view's
// own light/dark toggle: light steps of the neutral ramp become the background/
// surface, dark steps become the text, and the accent moves one ramp step darker
// (600) to keep sufficient contrast against a light ground.

export const neutralColorRamp = {
  100: '#f3f5fe',
  200: '#e4e7f5',
  300: '#cfd3e5',
  400: '#b2b6ca',
  500: '#9397ab',
  600: '#75798c',
  700: '#595d6c',
  800: '#3f424d',
  900: '#292b31',
} as const;

export const accentColorRamp = {
  100: '#f5f4ff',
  200: '#e7e5fe',
  300: '#d2cefd',
  400: '#b5abfc',
  500: '#968ae0',
  600: '#796cbf',
  700: '#5d5294',
  800: '#423a6a',
  900: '#2b2741',
} as const;

export const baseAccentColor = '#9184d9';
export const baseDestructiveColor = '#f87171';

export type ColorRamp = Record<100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export type ColorPalette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  divider: string;
  accent: string;
  accentMuted: string;
  /** Destructive actions (e.g. "Delete" in a menu) — fixed across both themes, like `accent`. */
  destructive: string;
  neutral: ColorRamp;
  accentRamp: ColorRamp;
  /**
   * A handful of surfaces (the chord-diagram popover sheet, the song editor's live
   * preview box, dropdown menus) are deliberately styled as a fixed dark "elevated"
   * card regardless of the app's light/dark theme — matching the Nocturne design
   * source, which only ever defined a dark ground. Their own foreground colors must
   * come from here, never from `text`/`textMuted`/`divider` above: those flip to dark
   * content in light mode, which would go near-invisible against a surface that
   * never stops being dark.
   */
  elevatedSurface: string;
  elevatedSurfaceBorder: string;
  elevatedSurfaceText: string;
  elevatedSurfaceTextMuted: string;
  elevatedSurfaceDivider: string;
};

// Same in both palettes on purpose — see the ColorPalette.elevatedSurface* doc above.
const elevatedSurfaceColors = {
  elevatedSurface: neutralColorRamp[800],
  elevatedSurfaceBorder: neutralColorRamp[700],
  elevatedSurfaceText: '#e9e9ed',
  elevatedSurfaceTextMuted: neutralColorRamp[400],
  elevatedSurfaceDivider: 'rgba(233, 233, 237, 0.16)',
};

export const darkColorPalette: ColorPalette = {
  background: '#161826',
  surface: neutralColorRamp[800],
  text: '#e9e9ed',
  textMuted: neutralColorRamp[400],
  divider: 'rgba(233, 233, 237, 0.16)',
  accent: baseAccentColor,
  accentMuted: accentColorRamp[300],
  destructive: baseDestructiveColor,
  neutral: neutralColorRamp,
  accentRamp: accentColorRamp,
  ...elevatedSurfaceColors,
};

export const lightColorPalette: ColorPalette = {
  background: neutralColorRamp[100],
  surface: neutralColorRamp[200],
  text: neutralColorRamp[900],
  textMuted: neutralColorRamp[600],
  divider: 'rgba(41, 43, 49, 0.14)',
  accent: accentColorRamp[600],
  accentMuted: accentColorRamp[700],
  destructive: baseDestructiveColor,
  neutral: neutralColorRamp,
  accentRamp: accentColorRamp,
  ...elevatedSurfaceColors,
};

export const spacingScale = {
  extraSmall: 3,
  small: 6,
  medium: 8,
  mediumLarge: 11,
  large: 17,
  extraLarge: 22,
} as const;

export const cornerRadiusScale = {
  small: 4,
  medium: 8,
  large: 14,
} as const;

export const fontFamilyByWeight = {
  headingMedium: 'Inter_500Medium',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

export const elevationShadowStyleByLevel = {
  small: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  large: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
} as const;
