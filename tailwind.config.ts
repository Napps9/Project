import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#E40046',
          50: '#FFF0F3',
          600: '#E40046',
          700: '#C4003C',
        },
        positive: {
          DEFAULT: '#008B5A',
          400: '#00B371',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        instrument: '0.06em',
      },
    },
  },
  plugins: [],
};

export default config;
