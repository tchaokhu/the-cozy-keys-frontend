import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#C4622D',
          light: '#E8845A',
          dark: '#8B3E18',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          dark: '#EDE6D6',
        },
        sage: {
          DEFAULT: '#87A878',
          light: '#B0C9A4',
        },
        brown: {
          DEFAULT: '#6B4423',
          light: '#8B5E3C',
          dark: '#2C1810',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        fadeUp: 'fadeUp 0.7s ease forwards',
        pulse_slow: 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
