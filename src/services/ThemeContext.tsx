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

// 2. Liquid Glass (Cyber Sapphire & Electric Neon - Default Theme)
const LIQUID_GLASS: ThemeColors = {
  background: '#030712', // Crystalline obsidian sapphire base
  surface: 'rgba(7, 15, 36, 0.68)',
  card: 'rgba(10, 20, 48, 0.62)',
  cardHover: 'rgba(16, 30, 68, 0.78)',
  elevated: 'rgba(12, 24, 56, 0.72)',
  border: 'rgba(0, 210, 255, 0.22)',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#00d2ff', // Electric Cyber Cyan
  primaryGlow: 'rgba(0, 210, 255, 0.45)',
  accent: '#a855f7', // Prismatic Violet
  accentGlow: 'rgba(168, 85, 247, 0.40)',
  inputBg: 'rgba(5, 12, 30, 0.65)',
  badgeBg: 'rgba(0, 210, 255, 0.16)',

  glassBg: 'rgba(7, 15, 36, 0.60)',
  glassBorder: 'rgba(0, 210, 255, 0.25)',
  glassBorderActive: 'rgba(0, 210, 255, 0.60)',
  neonCyan: '#00d2ff',
  neonMint: '#0df2a4',
  neonAmber: '#38bdf8', // Luminous Ice Cyan for highlighted pricing and badges
  cardBento: 'rgba(8, 16, 40, 0.64)',
  bentoBorder: 'rgba(0, 210, 255, 0.22)',
  pillBg: 'rgba(0, 210, 255, 0.10)',
};

// 2b. Liquid Glass Light Mode (Crystal Frost & Prismatic Sapphire Daylight)
const LIQUID_GLASS_LIGHT: ThemeColors = {
  background: '#f1f5f9', // Crystal cool daylight background
  surface: 'rgba(255, 255, 255, 0.72)',
  card: 'rgba(255, 255, 255, 0.78)',
  cardHover: 'rgba(255, 255, 255, 0.90)',
  elevated: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(2, 132, 199, 0.18)',
  text: '#090e17', // High-contrast black/slate for ultra-clean readability
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7', // Liquid Sapphire Sky Cyan
  primaryGlow: 'rgba(2, 132, 199, 0.35)',
  accent: '#7c3aed', // Prismatic Violet
  accentGlow: 'rgba(124, 58, 237, 0.30)',
  inputBg: 'rgba(241, 245, 249, 0.75)',
  badgeBg: 'rgba(2, 132, 199, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.70)',
  glassBorder: 'rgba(2, 132, 199, 0.22)',
  glassBorderActive: 'rgba(2, 132, 199, 0.55)',
  neonCyan: '#0284c7',
  neonMint: '#059669',
  neonAmber: '#0284c7', // Sapphire Cyan for prices in light mode
  cardBento: 'rgba(255, 255, 255, 0.76)',
  bentoBorder: 'rgba(2, 132, 199, 0.18)',
  pillBg: 'rgba(2, 132, 199, 0.08)',
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
  liquid_glass: {
    name: 'Liquid Glass (Dark Sapphire)',
    colors: LIQUID_GLASS,
    isDark: true,
  },
  liquid_glass_light: {
    name: 'Liquid Glass (Light Crystal)',
    colors: LIQUID_GLASS_LIGHT,
    isDark: false,
  },
  dark_liquid_glass: {
    name: 'Liquid Glass (Dark Sapphire)',
    colors: LIQUID_GLASS,
    isDark: true,
  },
  frosted_neo_bento: {
    name: 'Frosted Neo-Bento',
    colors: FROSTED_NEO_BENTO,
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
    colors: LIQUID_GLASS_LIGHT,
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
  preset: 'liquid_glass',
  colors: LIQUID_GLASS,
  isDark: true,
  setPreset: () => {},
  toggleTheme: () => {},
  setMode: () => {},
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

  const toggleTheme = () => {
    const next = currentTheme.isDark ? 'liquid_glass_light' : 'liquid_glass';
    setPreset(next);
  };

  const setMode = (mode: 'dark' | 'light') => {
    setPreset(mode === 'light' ? 'liquid_glass_light' : 'liquid_glass');
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
