/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          accent: '#2563eb', // Clean corporate blue
          gold: '#d97706',   // For #1 rank
          silver: '#64748b', // For #2 rank
          bronze: '#b45309', // For #3 rank
        }
      }
    },
  },
  plugins: [],
}
