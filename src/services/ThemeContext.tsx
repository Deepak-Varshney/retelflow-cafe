import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from './storage';

export type CafeThemePreset =
  | 'frosted_neo_bento'
  | 'liquid_glass'
  | 'dark_liquid_glass'
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

// 1. Frosted Liquid Glass + Tactile Neo-Bento (Default Recommended)
const FROSTED_NEO_BENTO: ThemeColors = {
  background: '#070b14', // Deep midnight frosted base
  surface: '#0d1527',
  card: '#0f172a',
  cardHover: '#16233d',
  elevated: '#131e36',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#f59e0b', // Warm cafe gold / amber
  primaryGlow: 'rgba(245, 158, 11, 0.35)',
  accent: '#10b981',
  accentGlow: 'rgba(16, 185, 129, 0.35)',
  inputBg: '#090e1c',
  badgeBg: 'rgba(245, 158, 11, 0.15)',

  glassBg: 'rgba(13, 21, 39, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassBorderActive: 'rgba(0, 210, 255, 0.40)',
  neonCyan: '#00d2ff',
  neonMint: '#0df2a4',
  neonAmber: '#f59e0b',
  cardBento: '#0c1322',
  bentoBorder: 'rgba(255, 255, 255, 0.08)',
  pillBg: 'rgba(255, 255, 255, 0.05)',
};

// 2. Liquid Glass (Cyber Sapphire & Electric Neon)
const LIQUID_GLASS: ThemeColors = {
  background: '#030712', // Obsidian sapphire
  surface: '#080f24',
  card: '#0c1633',
  cardHover: '#11204a',
  elevated: '#0e1b3d',
  border: 'rgba(0, 210, 255, 0.14)',
  text: '#f8fafc',
  textSecondary: '#93c5fd',
  textMuted: '#475569',
  primary: '#00d2ff', // Electric Cyber Cyan
  primaryGlow: 'rgba(0, 210, 255, 0.45)',
  accent: '#a855f7', // Electric Violet
  accentGlow: 'rgba(168, 85, 247, 0.40)',
  inputBg: '#050c1e',
  badgeBg: 'rgba(0, 210, 255, 0.15)',

  glassBg: 'rgba(8, 16, 38, 0.92)',
  glassBorder: 'rgba(0, 210, 255, 0.22)',
  glassBorderActive: 'rgba(168, 85, 247, 0.45)',
  neonCyan: '#00d2ff',
  neonMint: '#38bdf8',
  neonAmber: '#f59e0b',
  cardBento: '#070e24',
  bentoBorder: 'rgba(0, 210, 255, 0.18)',
  pillBg: 'rgba(0, 210, 255, 0.08)',
};

// 3. Glassmorphism (Prismatic Frost & Translucent Glass)
const GLASSMORPHISM: ThemeColors = {
  background: '#0a0f1d',
  surface: 'rgba(255, 255, 255, 0.08)',
  card: 'rgba(255, 255, 255, 0.06)',
  cardHover: 'rgba(255, 255, 255, 0.12)',
  elevated: 'rgba(255, 255, 255, 0.10)',
  border: 'rgba(255, 255, 255, 0.14)',
  text: '#ffffff',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  primary: '#ec4899', // Prismatic Neon Magenta
  primaryGlow: 'rgba(236, 72, 153, 0.40)',
  accent: '#38bdf8', // Ice Cyan
  accentGlow: 'rgba(56, 189, 248, 0.35)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  badgeBg: 'rgba(236, 72, 153, 0.15)',

  glassBg: 'rgba(16, 24, 48, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.20)',
  glassBorderActive: 'rgba(236, 72, 153, 0.50)',
  neonCyan: '#38bdf8',
  neonMint: '#4ade80',
  neonAmber: '#fbbf24',
  cardBento: 'rgba(255, 255, 255, 0.05)',
  bentoBorder: 'rgba(255, 255, 255, 0.16)',
  pillBg: 'rgba(255, 255, 255, 0.08)',
};

// 4. Soft Neumorphism (Tactile Clay & Embossed Shadows)
const NEUMORPHISM: ThemeColors = {
  background: '#1a202c', // Soft Clay Slate
  surface: '#202736',
  card: '#1e2534',
  cardHover: '#252e42',
  elevated: '#242c3d',
  border: 'rgba(255, 255, 255, 0.06)',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#10b981', // Tactile Mint Clay
  primaryGlow: 'rgba(16, 185, 129, 0.30)',
  accent: '#38bdf8',
  accentGlow: 'rgba(56, 189, 248, 0.30)',
  inputBg: '#161c28',
  badgeBg: 'rgba(16, 185, 129, 0.15)',

  glassBg: '#21293a',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderActive: 'rgba(16, 185, 129, 0.40)',
  neonCyan: '#2dd4bf',
  neonMint: '#10b981',
  neonAmber: '#f59e0b',
  cardBento: '#1b2230',
  bentoBorder: 'rgba(0, 0, 0, 0.25)',
  pillBg: 'rgba(0, 0, 0, 0.15)',
};

// 5. Retro 90s Cafe (Vintage Espresso & Tangerine Diner)
const RETRO_CAFE: ThemeColors = {
  background: '#151210', // 90s Vintage Charcoal
  surface: '#201b17',
  card: '#28221d',
  cardHover: '#332b25',
  elevated: '#2d2621',
  border: '#45352b',
  text: '#fef3c7', // Warm Vintage Cream
  textSecondary: '#d6c4b2',
  textMuted: '#8c7b6e',
  primary: '#f97316', // Warm Tangerine
  primaryGlow: 'rgba(249, 115, 22, 0.35)',
  accent: '#eab308', // Retro Mustard Gold
  accentGlow: 'rgba(234, 179, 8, 0.35)',
  inputBg: '#1a1613',
  badgeBg: 'rgba(249, 115, 22, 0.18)',

  glassBg: 'rgba(32, 27, 23, 0.94)',
  glassBorder: 'rgba(249, 115, 22, 0.30)',
  glassBorderActive: 'rgba(234, 179, 8, 0.50)',
  neonCyan: '#38bdf8',
  neonMint: '#84cc16',
  neonAmber: '#f97316',
  cardBento: '#241e19',
  bentoBorder: '#f97316',
  pillBg: 'rgba(249, 115, 22, 0.12)',
};

// 6. Classic Light Retail (Daylight Crisp White & Amber)
const CLASSIC_LIGHT_RETAIL: ThemeColors = {
  background: '#f8fafc', // Ultra crisp daylight
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  elevated: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#d97706', // Rich coffee amber
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
  frosted_neo_bento: {
    name: 'Frosted Neo-Bento',
    colors: FROSTED_NEO_BENTO,
    isDark: true,
  },
  liquid_glass: {
    name: 'Liquid Glass (Cyber Sapphire)',
    colors: LIQUID_GLASS,
    isDark: true,
  },
  dark_liquid_glass: {
    name: 'Liquid Glass (Cyber Sapphire)',
    colors: LIQUID_GLASS,
    isDark: true,
  },
  glassmorphism: {
    name: 'Glassmorphism (Frosted Prism)',
    colors: GLASSMORPHISM,
    isDark: true,
  },
  neumorphism: {
    name: 'Soft Neumorphism (Tactile Clay)',
    colors: NEUMORPHISM,
    isDark: true,
  },
  retro_cafe: {
    name: 'Retro 90s Cafe (Vintage Tangerine)',
    colors: RETRO_CAFE,
    isDark: true,
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
  // Deprecated compatibility methods:
  toggleTheme: () => void;
  setMode: (mode: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preset: 'frosted_neo_bento',
  colors: FROSTED_NEO_BENTO,
  isDark: true,
  setPreset: () => {},
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preset, setPresetState] = useState<CafeThemePreset>('frosted_neo_bento');

  useEffect(() => {
    safeStorage.getItem('retelflow_cafe_theme_preset').then((saved: string | null) => {
      if (saved && THEME_PRESETS[saved as CafeThemePreset]) {
        setPresetState(saved as CafeThemePreset);
      } else {
        setPresetState('frosted_neo_bento');
      }
    });
  }, []);

  const setPreset = (nextPreset: CafeThemePreset) => {
    if (THEME_PRESETS[nextPreset]) {
      setPresetState(nextPreset);
      safeStorage.setItem('retelflow_cafe_theme_preset', nextPreset);
    }
  };

  const currentTheme = THEME_PRESETS[preset] || THEME_PRESETS.frosted_neo_bento;

  const toggleTheme = () => {
    const next = currentTheme.isDark ? 'classic_light_retail' : 'frosted_neo_bento';
    setPreset(next);
  };

  const setMode = (mode: 'dark' | 'light') => {
    setPreset(mode === 'light' ? 'classic_light_retail' : 'frosted_neo_bento');
  };

  return (
    <ThemeContext.Provider
      value={{
        preset,
        colors: currentTheme.colors,
        isDark: currentTheme.isDark,
        setPreset,
        toggleTheme,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
