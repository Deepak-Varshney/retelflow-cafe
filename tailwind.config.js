/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.{js,ts,tsx}', './src/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        void: '#05080e',
        surface: '#0a0f19',
        card: '#0d1420',
        cardHover: '#121c2c',
        elevated: '#111a2b',
        input: '#070c14',
        amber: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.3)',
          dark: '#b45309',
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
        glassBorder: 'rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
