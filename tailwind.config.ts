import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-noto-sans-jp)', 'Noto Sans JP', 'sans-serif'],
      },
      colors: {
        purple: {
          50:  '#f4f6ef',
          100: '#e5ecda',
          200: '#c9d9b4',
          300: '#a8c282',
          400: '#87aa55',
          500: '#6b8a3a',
          600: '#556B2F',
          700: '#435626',
          800: '#35441e',
          900: '#283417',
        },
      },
    },
  },
  plugins: [],
}
export default config
