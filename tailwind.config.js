/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'kh-title': ['"Koulen"', '"Khmer OS Koulen"', '"Rajdhani"', 'sans-serif'],
        'kh-body': ['"Battambang"', '"Khmer OS Battambang"', '"Rajdhani"', 'sans-serif'],
        'kh-content': ['"Battambang"', '"Khmer OS Battambang"', '"Rajdhani"', 'sans-serif'],
        'sans': ['"Rajdhani"', '"Battambang"', 'sans-serif'],
        'rajdhani': ['"Rajdhani"', 'sans-serif'],
        'en': ['"Rajdhani"', 'sans-serif'],
      },
      boxShadow: {
        'fav': '0 0 5px 0 rgba(0, 0, 0, 0.16)',
        'xs': '0 0 2px 0 rgba(0, 0, 0, 0.15)',
        'sm': '0 0 4px 1px rgba(0, 0, 0, 0.1)',
        'md': '0 0 6px 1px rgba(0, 0, 0, 0.12)',
        'lg': '0 0 10px 1px rgba(0, 0, 0, 0.14)',
        'xl': '0 0 14px 1px rgba(0, 0, 0, 0.16)',
        '2xl': '0 0 20px 1px rgba(0, 0, 0, 0.18)',
        'tight-sm': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 4px 0 rgba(0, 0, 0, 0.1)',
        'tight-md': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 8px 0 rgba(0, 0, 0, 0.12)',
        'tight-lg': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 12px 0 rgba(0, 0, 0, 0.14)',
        'inner-dark': 'inset 0 0 6px 0 rgba(0, 0, 0, 0.12)',
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
};
