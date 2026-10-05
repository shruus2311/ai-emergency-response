/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F2F6F3',
          100: '#E2ECE4',
          200: '#C5D8C9',
          300: '#9DBEAA',
          400: '#6E9F83',
          500: '#478160',
          600: '#33684B',
          700: '#28563F', // forest-medium
          800: '#1F4733',
          900: '#173C2C', // forest master
          950: '#0F2A20', // forest-dark
        },
        sage: {
          50: '#F5F7F4',
          100: '#DDE6D8', // sage-light
          200: '#CAD8C3',
          300: '#B0C4A7',
          400: '#94AC8A',
          500: '#829681', // sage master
          600: '#6F927C',
          700: '#557260',
          800: '#3E5446',
          900: '#2A3A30',
          950: '#17231C', // text dark
        },
        ivory: {
          50: '#FAF8F1', // surface cream
          100: '#F3F0E6', // background warm ivory
          200: '#E8E4D5',
          300: '#D8D8C9', // border subtle
          400: '#C5C3B0',
          500: '#ABA892',
          600: '#8F8C74',
          700: '#716E57',
          800: '#53503D',
          900: '#373426',
          950: '#1D1A11',
        },
        moss: {
          50: '#F2F6F3',
          100: '#DDE6D8',
          200: '#CAD8C3',
          300: '#9DBEAA',
          400: '#6E9F83',
          500: '#478160',
          600: '#28563F',
          700: '#173C2C',
          800: '#0F2A20',
          900: '#0B1E17',
          950: '#07140F',
        },
        reference: {
          sidebar: '#0F2A20',
          sidebarHover: '#173C2C',
          canvas: '#F3F0E6',
          canvasWarm: '#FAF8F1',
          card: '#FBFAF5',
          cardSubtle: '#FAF8F1',
          cardElevated: '#FFFFFF',
          border: '#D8D8C9',
          borderSubtle: '#E8E4D5',
          textMain: '#17231C',
          textMuted: '#667269',
          pillGreen: '#173C2C',
          pillGreenHover: '#0F2A20',
          pillGreenLight: '#DDE6D8',
          pillGreenText: '#173C2C',
          
          // Dark Mode Tokens (Deep Botanical Forest & Warm Ivory)
          darkCanvas: '#0E2119',
          darkCard: '#142C22',
          darkCardElevated: '#1B382B',
          darkBorder: '#31503F',
          darkBorderSubtle: '#223E30',
          darkTextMain: '#F3F0E6',
          darkTextMuted: '#A8B5AC',
        },
        severity: {
          critical: '#DC2626',
          high: '#EA580C',
          medium: '#D97706',
          low: '#5F8D4E',
          info: '#2563EB',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Playfair Display', 'Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'ref-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'ref': '0 4px 20px -2px rgba(24, 28, 25, 0.05)',
        'ref-md': '0 10px 25px -4px rgba(24, 28, 25, 0.06), 0 4px 8px -2px rgba(24, 28, 25, 0.03)',
        'ref-lg': '0 20px 30px -6px rgba(24, 28, 25, 0.08), 0 8px 12px -4px rgba(24, 28, 25, 0.04)',
      }
    },
  },
  plugins: [],
}
