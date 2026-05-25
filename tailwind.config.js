/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f5ede0',
          soft: '#ede2cf',
          deep: '#e0d2b7',
        },
        ink: {
          DEFAULT: '#1a2238',
          soft: '#3a425a',
          faint: '#6b6e7e',
        },
        vermillion: {
          DEFAULT: '#b5391f',
          soft: '#d4654f',
        },
        gold: {
          DEFAULT: '#a07a3a',
          soft: '#c4a370',
        },
        city: {
          tokyo: '#2a4d6e',
          fuji: '#3d6b3d',
          kyoto: '#5d3a6e',
          osaka: '#c46a3d',
        },
        line: 'rgba(26, 34, 56, 0.12)',
        'line-strong': 'rgba(26, 34, 56, 0.25)',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        accent: ['"Shippori Mincho"', 'Fraunces', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,34,56,0.04), 0 8px 24px rgba(26,34,56,0.06)',
      },
    },
  },
  plugins: [],
}
