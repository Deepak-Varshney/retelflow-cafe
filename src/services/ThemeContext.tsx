import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from './storage';

export type CafeThemePreset = 'frosted_neo_bento' | 'dark_liquid_glass' | 'classic_light_retail';

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
  primary: string; // Cafe accent gold or electric cyan
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

// 2. Dark Liquid Glass (Cyber Sapphire & Electric Neon)
const DARK_LIQUID_GLASS: ThemeColors = {
  background: '#030712', // Obsidian sapphire
  surface: '#080f24',
  card: '#0c1633',
  cardHover: '#11204a',
  elevated: '#0e1b3d',
  border: 'rgba(0, 210, 255, 0.12)',
  text: '#f8fafc',
  textSecondary: '#93c5fd',
  textMuted: '#475569',
  primary: '#00d2ff', // Electric Cyber Cyan
  primaryGlow: 'rgba(0, 210, 255, 0.40)',
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
  cardBento: '#081026',
  bentoBorder: 'rgba(0, 210, 255, 0.14)',
  pillBg: 'rgba(0, 210, 255, 0.08)',
};

// 3. Classic Light Retail (Daylight Crisp White & Amber)
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
  dark_liquid_glass: {
    name: 'Dark Liquid Glass',
    colors: DARK_LIQUID_GLASS,
    isDark: true,
  },
  classic_light_retail: {
    name: 'Classic Light Retail',
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
      if (saved && (saved === 'frosted_neo_bento' || saved === 'dark_liquid_glass' || saved === 'classic_light_retail')) {
        setPresetState(saved as CafeThemePreset);
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

  // Compatibility toggle: switches between frosted_neo_bento and classic_light_retail
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
