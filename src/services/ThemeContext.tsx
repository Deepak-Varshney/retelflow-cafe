import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from './storage';

export type CafeThemePreset =
  | 'liquid_glass'
  | 'liquid_glass_light'
  | 'dark_liquid_glass'
  | 'frosted_neo_bento'
  | 'glassmorphism'
  | 'neumorphism'
  | 'retro_cafe'
  | 'classic_light_retail';

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
  primary: string; // Cafe accent gold, electric cyan, or retro orange
  primaryGlow: string;
  accent: string; // Emerald for veg / confirmed
  accentGlow: string;
  inputBg: string;
  badgeBg: string;

  // Frosted Liquid Glass + Tactile Neo-Bento Design Tokens
  glassBg: string;
  glassBorder: string;
  glassBorderActive: string;
  neonCyan: string;
  neonMint: string;
  neonAmber: string;
  cardBento: string;
  bentoBorder: string;
  pillBg: string;
}

// 1. Frosted Neo-Bento (Daylight Warm Amber & Slate)
const FROSTED_NEO_BENTO: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  elevated: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#d97706', // Warm Cafe Amber Gold
  primaryGlow: 'rgba(217, 119, 6, 0.25)',
  accent: '#059669',
  accentGlow: 'rgba(5, 150, 105, 0.25)',
  inputBg: '#f8fafc',
  badgeBg: 'rgba(217, 119, 6, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.90)',
  glassBorder: '#e2e8f0',
  glassBorderActive: 'rgba(217, 119, 6, 0.45)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#d97706',
  cardBento: '#ffffff',
  bentoBorder: '#e2e8f0',
  pillBg: 'rgba(217, 119, 6, 0.08)',
};

// 2. Liquid Glass Daylight (Crystal Frost & Sapphire Sky)
const LIQUID_GLASS: ThemeColors = {
  background: '#f1f5f9', // Crystal cool daylight background
  surface: 'rgba(255, 255, 255, 0.85)',
  card: 'rgba(255, 255, 255, 0.92)',
  cardHover: '#ffffff',
  elevated: '#ffffff',
  border: 'rgba(2, 132, 199, 0.18)',
  text: '#090e17', // High-contrast black/slate for ultra-clean readability
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7', // Liquid Sapphire Sky Cyan
  primaryGlow: 'rgba(2, 132, 199, 0.30)',
  accent: '#7c3aed', // Prismatic Violet
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
};

const LIQUID_GLASS_LIGHT = LIQUID_GLASS;

// 3. Glassmorphism Daylight (Frosted White & Magenta Blossom)
const GLASSMORPHISM: ThemeColors = {
  background: '#faf5ff',
  surface: 'rgba(255, 255, 255, 0.88)',
  card: '#ffffff',
  cardHover: '#fdf4ff',
  elevated: '#ffffff',
  border: 'rgba(219, 39, 119, 0.18)',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#db2777', // Magenta Blossom
  primaryGlow: 'rgba(219, 39, 119, 0.25)',
  accent: '#0284c7',
  accentGlow: 'rgba(2, 132, 199, 0.25)',
  inputBg: '#faf5ff',
  badgeBg: 'rgba(219, 39, 119, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.90)',
  glassBorder: 'rgba(219, 39, 119, 0.20)',
  glassBorderActive: 'rgba(219, 39, 119, 0.45)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#db2777',
  cardBento: '#ffffff',
  bentoBorder: 'rgba(219, 39, 119, 0.18)',
  pillBg: 'rgba(219, 39, 119, 0.08)',
};

// 4. Soft Neumorphism Daylight (Tactile Mint & Slate)
const NEUMORPHISM: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  elevated: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#059669', // Emerald Mint
  primaryGlow: 'rgba(5, 150, 105, 0.25)',
  accent: '#0284c7',
  accentGlow: 'rgba(2, 132, 199, 0.25)',
  inputBg: '#f1f5f9',
  badgeBg: 'rgba(5, 150, 105, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.92)',
  glassBorder: '#e2e8f0',
  glassBorderActive: 'rgba(5, 150, 105, 0.40)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#d97706',
  cardBento: '#ffffff',
  bentoBorder: '#e2e8f0',
  pillBg: 'rgba(5, 150, 105, 0.08)',
};

// 5. Retro 90s Cafe Daylight (Warm Tangerine & Cream)
const RETRO_CAFE: ThemeColors = {
  background: '#fffbeb', // Warm daylight cream
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#fef3c7',
  elevated: '#ffffff',
  border: '#fed7aa',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#ea580c', // Tangerine
  primaryGlow: 'rgba(234, 88, 12, 0.25)',
  accent: '#d97706',
  accentGlow: 'rgba(217, 119, 6, 0.25)',
  inputBg: '#fff7ed',
  badgeBg: 'rgba(234, 88, 12, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.92)',
  glassBorder: '#fed7aa',
  glassBorderActive: 'rgba(234, 88, 12, 0.45)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#ea580c',
  cardBento: '#ffffff',
  bentoBorder: '#fed7aa',
  pillBg: 'rgba(234, 88, 12, 0.08)',
};

// 6. Classic Light Retail (Daylight Crisp White & Amber)
const CLASSIC_LIGHT_RETAIL: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  elevated: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#d97706',
  primaryGlow: 'rgba(217, 119, 6, 0.25)',
  accent: '#059669',
  accentGlow: 'rgba(5, 150, 105, 0.25)',
  inputBg: '#f1f5f9',
  badgeBg: 'rgba(217, 119, 6, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.94)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassBorderActive: 'rgba(217, 119, 6, 0.35)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#d97706',
  cardBento: '#ffffff',
  bentoBorder: '#e2e8f0',
  pillBg: 'rgba(0, 0, 0, 0.04)',
};

export const THEME_PRESETS: Record<CafeThemePreset, { name: string; colors: ThemeColors; isDark: boolean }> = {
  liquid_glass: {
    name: 'Liquid Glass (Daylight Sapphire)',
    colors: LIQUID_GLASS,
    isDark: false,
  },
  liquid_glass_light: {
    name: 'Liquid Glass (Daylight Sapphire)',
    colors: LIQUID_GLASS,
    isDark: false,
  },
  dark_liquid_glass: {
    name: 'Liquid Glass (Daylight Sapphire)',
    colors: LIQUID_GLASS,
    isDark: false,
  },
  frosted_neo_bento: {
    name: 'Frosted Neo-Bento (Warm Amber)',
    colors: FROSTED_NEO_BENTO,
    isDark: false,
  },
  glassmorphism: {
    name: 'Glassmorphism (Prismatic Rose)',
    colors: GLASSMORPHISM,
    isDark: false,
  },
  neumorphism: {
    name: 'Soft Neumorphism (Emerald Mint)',
    colors: NEUMORPHISM,
    isDark: false,
  },
  retro_cafe: {
    name: 'Retro 90s Cafe (Tangerine)',
    colors: RETRO_CAFE,
    isDark: false,
  },
  classic_light_retail: {
    name: 'Classic Light Retail (Daylight Mode)',
    colors: CLASSIC_LIGHT_RETAIL,
    isDark: false,
  },
};

interface ThemeContextType {
  preset: CafeThemePreset;
  colors: ThemeColors;
  isDark: boolean;
  setPreset: (preset: CafeThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preset: 'liquid_glass',
  colors: LIQUID_GLASS,
  isDark: false,
  setPreset: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preset, setPresetState] = useState<CafeThemePreset>('liquid_glass');

  useEffect(() => {
    safeStorage.getItem('retelflow_cafe_theme_preset').then((saved: string | null) => {
      if (saved && THEME_PRESETS[saved as CafeThemePreset]) {
        setPresetState(saved as CafeThemePreset);
      } else {
        setPresetState('liquid_glass');
      }
    });
  }, []);

  const setPreset = (nextPreset: CafeThemePreset) => {
    if (THEME_PRESETS[nextPreset]) {
      setPresetState(nextPreset);
      safeStorage.setItem('retelflow_cafe_theme_preset', nextPreset);
    }
  };

  const currentTheme = THEME_PRESETS[preset] || THEME_PRESETS.liquid_glass;

  return (
    <ThemeContext.Provider
      value={{
        preset,
        colors: currentTheme.colors,
        isDark: false, // Pure light mode across the board
        setPreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
