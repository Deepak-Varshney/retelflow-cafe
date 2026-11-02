/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.{js,ts,tsx}', './src/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        void: '#030712',
        surface: '#081026',
        card: '#0c1633',
        cardHover: '#11204a',
        elevated: '#0e1b3d',
        input: '#050c1e',
        primary: {
          DEFAULT: '#00d2ff',
          glow: 'rgba(0, 210, 255, 0.4)',
          dark: '#0284c7',
        },
        cyan: {
          DEFAULT: '#00d2ff',
          glow: 'rgba(0, 210, 255, 0.35)',
          dark: '#0284c7',
        },
        amber: {
          DEFAULT: '#00d2ff', // Liquid glass remapped default for seamless theme transition
          glow: 'rgba(0, 210, 255, 0.3)',
          dark: '#0284c7',
        },
        orange: {
          DEFAULT: '#f97316',
          glow: 'rgba(249, 115, 22, 0.3)',
        },
        emerald: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.3)',
        },
        rose: '#f43f5e',
        textPrimary: '#ffffff',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        glassBorder: 'rgba(0, 210, 255, 0.18)',
        glassBorderActive: 'rgba(0, 210, 255, 0.55)',
        liquidGlass: 'rgba(8, 16, 38, 0.92)',
      },
    },
  },
  plugins: [],
};
