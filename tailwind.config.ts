import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#140d0a', surface: '#211612', line: '#c98a4e55',
        accent: '#d98f4e', 'accent-fg': '#1a0f0a', cream: '#f4e9dc', tan: '#c9a272', danger: '#ff8a7a',
      },
      fontFamily: { mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'] },
    },
  },
  plugins: [],
} satisfies Config
