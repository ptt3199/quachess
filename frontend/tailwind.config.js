import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark "chess club" surfaces
        night: {
          950: '#070C16',
          900: '#0B1120', // page background
          850: '#0E1526', // sunken wells
          800: '#121B2E', // cards
          700: '#1A2439', // raised
          600: '#22304C', // hover/active
          500: '#2C3D5F', // strongest raised
        },
        line: {
          DEFAULT: '#1E2A44',
          strong: '#2C3D5F',
        },
        // Brass/gold accent
        brass: {
          200: '#F8DDA8',
          300: '#F5C877',
          400: '#EFB758',
          500: '#E3A94F',
          600: '#C98F35',
          700: '#9E7028',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'backdrop-in': 'backdrop-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) both',
        pop: 'pop 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) both',
      },
      boxShadow: {
        fab: '0 8px 28px rgba(227, 169, 79, 0.4)',
        sheet: '0 -8px 40px rgba(0, 0, 0, 0.55)',
      },
    },
  },
  plugins: [forms],
}
