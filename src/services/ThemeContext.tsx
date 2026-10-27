import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { safeStorage } from './storage';

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardHover: string;
  elevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string; // Warm Amber / Cafe Gold: #f59e0b
  primaryGlow: string;
  accent: string; // Emerald for veg / confirmed: #10b981
  accentGlow: string;
  inputBg: string;
  badgeBg: string;
}

const darkColors: ThemeColors = {
  background: '#070b12',
  surface: '#0d131f',
  card: '#111827',
  cardHover: '#1f2937',
  elevated: '#172033',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  primary: '#f59e0b',
  primaryGlow: 'rgba(245, 158, 11, 0.35)',
  accent: '#10b981',
  accentGlow: 'rgba(16, 185, 129, 0.35)',
  inputBg: '#0b101b',
  badgeBg: 'rgba(245, 158, 11, 0.15)',
};

const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  elevated: '#f8fafc',
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
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    safeStorage.getItem('retelflow_cafe_theme').then((saved: string | null) => {
      if (saved) {
        setIsDark(saved === 'dark');
      } else {
        setIsDark(systemScheme !== 'light');
      }
    });
  }, [systemScheme]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      safeStorage.setItem('retelflow_cafe_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const setMode = (mode: ThemeMode) => {
    setIsDark(mode === 'dark');
    safeStorage.setItem('retelflow_cafe_theme', mode);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
