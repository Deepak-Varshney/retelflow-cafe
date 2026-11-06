import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/** The 3 shop themes (user.themePreset). Server maps legacy values onto these. */
export type CafeThemePreset = 'sapphire' | 'amber' | 'emerald';
export const DEFAULT_PRESET: CafeThemePreset = 'sapphire';
const PRESETS: CafeThemePreset[] = ['sapphire', 'amber', 'emerald'];

/** Anything unknown / missing → sapphire. */
export const normalizePreset = (value: unknown): CafeThemePreset =>
  PRESETS.includes(value as CafeThemePreset) ? (value as CafeThemePreset) : DEFAULT_PRESET;

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardHover: string;
  elevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string; // buttons, active tab, links
  primaryGlow: string;
  accent: string;
  accentGlow: string;
  inputBg: string;
  badgeBg: string;

  // Glass / bento tokens (kept for existing components)
  glassBg: string;
  glassBorder: string;
  glassBorderActive: string;
  neonCyan: string;
  neonMint: string;
  neonAmber: string;
  cardBento: string;
  bentoBorder: string;
  pillBg: string;

  // Solid surfaces + primary helpers
  panel: string; // opaque sheet / modal / popover background
  subtle: string; // quiet fill: chips, skeletons, disabled buttons
  overlay: string; // modal backdrop
  onPrimary: string; // text / icons on a primary-filled button
  primarySoft: string; // tinted fill for selected chips / info boxes
  primarySoftBorder: string;
  primaryText: string; // primary-coloured text that reads on card/background

  // Semantic (readable on this mode's cards)
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;

  // Background orbs (LiquidGlassBackground)
  orbA: string;
  orbB: string;
}

const LIGHT_SEMANTIC = {
  success: '#047857',
  successSoft: '#d1fae5',
  danger: '#be123c',
  dangerSoft: '#ffe4e6',
  warning: '#b45309',
  warningSoft: '#fef3c7',
};

const DARK_SEMANTIC = {
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  danger: '#fb7185',
  dangerSoft: 'rgba(251, 113, 133, 0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
};

// ── Sapphire: the original blue liquid-glass look ──
const SAPPHIRE_LIGHT: ThemeColors = {
  background: '#f1f5f9',
  surface: 'rgba(255, 255, 255, 0.85)',
  card: 'rgba(255, 255, 255, 0.92)',
  cardHover: '#ffffff',
  elevated: '#ffffff',
  border: 'rgba(2, 132, 199, 0.18)',
  text: '#090e17',
  textSecondary: '#475569',
  textMuted: '#64748b',
  primary: '#0284c7',
  primaryGlow: 'rgba(2, 132, 199, 0.30)',
  accent: '#7c3aed',
  accentGlow: 'rgba(124, 58, 237, 0.25)',
  inputBg: 'rgba(241, 245, 249, 0.85)',
  badgeBg: 'rgba(2, 132, 199, 0.12)',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(2, 132, 199, 0.22)',
  glassBorderActive: 'rgba(2, 132, 199, 0.55)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#0284c7',
  cardBento: 'rgba(255, 255, 255, 0.85)',
  bentoBorder: 'rgba(2, 132, 199, 0.18)',
  pillBg: 'rgba(2, 132, 199, 0.08)',
  panel: '#ffffff',
  subtle: '#e2e8f0',
  overlay: 'rgba(15, 23, 42, 0.55)',
  onPrimary: '#ffffff',
  primarySoft: '#e0f2fe',
  primarySoftBorder: '#bae6fd',
  primaryText: '#0369a1',
  ...LIGHT_SEMANTIC,
  orbA: '#0284c7',
  orbB: '#8b5cf6',
};

const SAPPHIRE_DARK: ThemeColors = {
  background: '#0b1220',
  surface: 'rgba(19, 29, 51, 0.88)',
  card: 'rgba(22, 33, 56, 0.94)',
  cardHover: '#1c2a47',
  elevated: '#1a2742',
  border: 'rgba(56, 189, 248, 0.18)',
  text: '#e8eef7',
  textSecondary: '#a9b6c8',
  textMuted: '#8392a8',
  primary: '#38bdf8',
  primaryGlow: 'rgba(56, 189, 248, 0.30)',
  accent: '#a78bfa',
  accentGlow: 'rgba(167, 139, 250, 0.25)',
  inputBg: '#0f182b',
  badgeBg: 'rgba(56, 189, 248, 0.16)',
  glassBg: 'rgba(19, 29, 51, 0.90)',
  glassBorder: 'rgba(56, 189, 248, 0.22)',
  glassBorderActive: 'rgba(56, 189, 248, 0.55)',
  neonCyan: '#38bdf8',
  neonMint: '#34d399',
  neonAmber: '#38bdf8',
  cardBento: 'rgba(22, 33, 56, 0.90)',
  bentoBorder: 'rgba(56, 189, 248, 0.16)',
  pillBg: 'rgba(56, 189, 248, 0.10)',
  panel: '#131d33',
  subtle: '#22304b',
  overlay: 'rgba(2, 6, 15, 0.72)',
  onPrimary: '#03131f',
  primarySoft: '#0f2a40',
  primarySoftBorder: '#1d4a6b',
  primaryText: '#7dd3fc',
  ...DARK_SEMANTIC,
  orbA: '#0ea5e9',
  orbB: '#7c3aed',
};

// ── Amber: warm coffee-house ──
const AMBER_LIGHT: ThemeColors = {
  background: '#faf6f0',
  surface: 'rgba(255, 255, 255, 0.88)',
  card: 'rgba(255, 255, 255, 0.95)',
  cardHover: '#fffbf5',
  elevated: '#ffffff',
  border: '#eadfce',
  text: '#1f150c',
  textSecondary: '#5b4a3a',
  textMuted: '#7a6857',
  primary: '#b45309',
  primaryGlow: 'rgba(180, 83, 9, 0.28)',
  accent: '#0f766e',
  accentGlow: 'rgba(15, 118, 110, 0.22)',
  inputBg: '#f6efe4',
  badgeBg: 'rgba(180, 83, 9, 0.12)',
  glassBg: 'rgba(255, 255, 255, 0.90)',
  glassBorder: 'rgba(180, 83, 9, 0.20)',
  glassBorderActive: 'rgba(180, 83, 9, 0.50)',
  neonCyan: '#b45309',
  neonMint: '#047857',
  neonAmber: '#b45309',
  cardBento: 'rgba(255, 255, 255, 0.92)',
  bentoBorder: '#eadfce',
  pillBg: 'rgba(180, 83, 9, 0.08)',
  panel: '#ffffff',
  subtle: '#efe5d6',
  overlay: 'rgba(28, 18, 8, 0.55)',
  onPrimary: '#ffffff',
  primarySoft: '#fdf0dc',
  primarySoftBorder: '#f3d3a3',
  primaryText: '#92400e',
  ...LIGHT_SEMANTIC,
  orbA: '#d97706',
  orbB: '#be6a3c',
};

const AMBER_DARK: ThemeColors = {
  background: '#15100b',
  surface: 'rgba(36, 27, 19, 0.88)',
  card: 'rgba(38, 29, 21, 0.95)',
  cardHover: '#30251b',
  elevated: '#2d2219',
  border: '#3d2f22',
  text: '#f6eee4',
  textSecondary: '#cdbca8',
  textMuted: '#a08d79',
  primary: '#f59e0b',
  primaryGlow: 'rgba(245, 158, 11, 0.30)',
  accent: '#2dd4bf',
  accentGlow: 'rgba(45, 212, 191, 0.22)',
  inputBg: '#1d160f',
  badgeBg: 'rgba(245, 158, 11, 0.16)',
  glassBg: 'rgba(36, 27, 19, 0.90)',
  glassBorder: 'rgba(245, 158, 11, 0.22)',
  glassBorderActive: 'rgba(245, 158, 11, 0.55)',
  neonCyan: '#f59e0b',
  neonMint: '#34d399',
  neonAmber: '#f59e0b',
  cardBento: 'rgba(38, 29, 21, 0.92)',
  bentoBorder: '#3d2f22',
  pillBg: 'rgba(245, 158, 11, 0.10)',
  panel: '#241b13',
  subtle: '#33271c',
  overlay: 'rgba(0, 0, 0, 0.72)',
  onPrimary: '#1f1300',
  primarySoft: '#3a2810',
  primarySoftBorder: '#5e3f12',
  primaryText: '#fbbf24',
  ...DARK_SEMANTIC,
  orbA: '#d97706',
  orbB: '#9a3412',
};

// ── Emerald: fresh green (RetelFlow brand family) ──
const EMERALD_LIGHT: ThemeColors = {
  background: '#f0f7f4',
  surface: 'rgba(255, 255, 255, 0.88)',
  card: 'rgba(255, 255, 255, 0.95)',
  cardHover: '#f7fcfa',
  elevated: '#ffffff',
  border: '#d3e7dd',
  text: '#0b1a14',
  textSecondary: '#3f5a4f',
  textMuted: '#5f776d',
  primary: '#047857',
  primaryGlow: 'rgba(16, 185, 129, 0.30)',
  accent: '#0284c7',
  accentGlow: 'rgba(2, 132, 199, 0.22)',
  inputBg: '#eaf4ef',
  badgeBg: 'rgba(4, 120, 87, 0.12)',
  glassBg: 'rgba(255, 255, 255, 0.90)',
  glassBorder: 'rgba(4, 120, 87, 0.20)',
  glassBorderActive: 'rgba(4, 120, 87, 0.50)',
  neonCyan: '#047857',
  neonMint: '#047857',
  neonAmber: '#047857',
  cardBento: 'rgba(255, 255, 255, 0.92)',
  bentoBorder: '#d3e7dd',
  pillBg: 'rgba(4, 120, 87, 0.08)',
  panel: '#ffffff',
  subtle: '#e1eee8',
  overlay: 'rgba(6, 20, 14, 0.55)',
  onPrimary: '#ffffff',
  primarySoft: '#dcf5ea',
  primarySoftBorder: '#a7e3c8',
  primaryText: '#065f46',
  ...LIGHT_SEMANTIC,
  orbA: '#10b981',
  orbB: '#0ea5e9',
};

const EMERALD_DARK: ThemeColors = {
  background: '#07120e',
  surface: 'rgba(16, 32, 26, 0.88)',
  card: 'rgba(17, 34, 27, 0.95)',
  cardHover: '#183028',
  elevated: '#172b23',
  border: '#1f3a2f',
  text: '#e3f4ec',
  textSecondary: '#a6c4b6',
  textMuted: '#7c9a8e',
  primary: '#34d399',
  primaryGlow: 'rgba(20, 245, 160, 0.28)',
  accent: '#38bdf8',
  accentGlow: 'rgba(56, 189, 248, 0.22)',
  inputBg: '#0b1a14',
  badgeBg: 'rgba(52, 211, 153, 0.16)',
  glassBg: 'rgba(16, 32, 26, 0.90)',
  glassBorder: 'rgba(52, 211, 153, 0.22)',
  glassBorderActive: 'rgba(52, 211, 153, 0.55)',
  neonCyan: '#34d399',
  neonMint: '#14f5a0',
  neonAmber: '#34d399',
  cardBento: 'rgba(17, 34, 27, 0.92)',
  bentoBorder: '#1f3a2f',
  pillBg: 'rgba(52, 211, 153, 0.10)',
  panel: '#0f1f19',
  subtle: '#1a3028',
  overlay: 'rgba(0, 0, 0, 0.72)',
  onPrimary: '#03140d',
  primarySoft: '#0f3326',
  primarySoftBorder: '#1c5a42',
  primaryText: '#6ee7b7',
  ...DARK_SEMANTIC,
  orbA: '#10b981',
  orbB: '#0e7490',
};

export const THEME_PRESETS: Record<CafeThemePreset, { name: string; light: ThemeColors; dark: ThemeColors }> = {
  sapphire: { name: 'Sapphire', light: SAPPHIRE_LIGHT, dark: SAPPHIRE_DARK },
  amber: { name: 'Amber Cafe', light: AMBER_LIGHT, dark: AMBER_DARK },
  emerald: { name: 'Emerald', light: EMERALD_LIGHT, dark: EMERALD_DARK },
};

/** Paper / receipt colours: always white, whatever the theme. */
export const PAPER = { bg: '#ffffff', ink: '#111827', muted: '#4b5563' };

interface ThemeContextType {
  preset: CafeThemePreset;
  colors: ThemeColors;
  isDark: boolean;
  setPreset: (preset: CafeThemePreset | string | null | undefined) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preset: DEFAULT_PRESET,
  colors: SAPPHIRE_LIGHT,
  isDark: false,
  setPreset: () => {},
});

// Last preset is kept in its own small file (not the logout-wiped cache), so
// the next cold start paints the right theme from the first frame.
const PRESET_FILE = `${FileSystem.documentDirectory}theme_preset.json`;

const readSavedPreset = async (): Promise<CafeThemePreset> => {
  try {
    const info = await FileSystem.getInfoAsync(PRESET_FILE);
    if (!info.exists) return DEFAULT_PRESET;
    return normalizePreset(JSON.parse(await FileSystem.readAsStringAsync(PRESET_FILE))?.preset);
  } catch {
    return DEFAULT_PRESET;
  }
};

const savePreset = (preset: CafeThemePreset) =>
  FileSystem.writeAsStringAsync(PRESET_FILE, JSON.stringify({ preset })).catch(() => {});

/** Light / dark follows the phone (app.json userInterfaceStyle: automatic). */
const usePhoneScheme = (): ColorSchemeName | null => {
  const hookScheme = useColorScheme();
  const [scheme, setScheme] = useState<ColorSchemeName | null>(hookScheme ?? Appearance.getColorScheme());
  useEffect(() => {
    if (hookScheme) setScheme(hookScheme);
  }, [hookScheme]);
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme));
    return () => sub.remove();
  }, []);
  return scheme;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = usePhoneScheme();
  const [preset, setPresetState] = useState<CafeThemePreset | null>(null);

  // Restore the last preset before the first screen renders (native splash
  // stays up meanwhile, so nothing flashes in the wrong colours)
  useEffect(() => {
    let alive = true;
    const fallback = setTimeout(() => alive && setPresetState((p) => p ?? DEFAULT_PRESET), 800);
    readSavedPreset().then((p) => alive && setPresetState((cur) => cur ?? p));
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const active = preset ?? DEFAULT_PRESET;
    const isDark = scheme === 'dark';
    return {
      preset: active,
      isDark,
      colors: isDark ? THEME_PRESETS[active].dark : THEME_PRESETS[active].light,
      setPreset: (next) => {
        const p = normalizePreset(next);
        setPresetState((cur) => {
          if (cur !== p) savePreset(p);
          return p;
        });
      },
    };
  }, [preset, scheme]);

  if (!preset) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
