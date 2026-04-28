import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
        },
        zinc: {
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        emerald: {
          500: '#10b981',
        },
        rose: {
          500: '#f43f5e',
        },
        background: '#020617', // slate-950
        surface: '#18181b',    // zinc-900
        border: '#27272a',     // zinc-800
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'md': '0.375rem',
      },
    },
  },
  plugins: [],
}

export default config
