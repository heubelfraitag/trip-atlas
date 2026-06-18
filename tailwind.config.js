/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          soft: 'var(--paper-soft)',
          deep: 'var(--paper-deep)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        vermillion: {
          DEFAULT: 'var(--vermillion)',
          soft: 'var(--vermillion-soft)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          soft: 'var(--gold-soft)',
        },
        city: {
          tokyo: 'var(--city-tokyo)',
          fuji: 'var(--city-fuji)',
          kyoto: 'var(--city-kyoto)',
          osaka: 'var(--city-osaka)',
        },
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        accent: ['"Shippori Mincho"', 'Fraunces', 'serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
}
