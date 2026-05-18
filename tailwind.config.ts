import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0A0A0A',
          surface: '#111111',
          border: '#1E1E1E',
          muted: '#2A2A2A',
        },
        accent: {
          gold: '#FFC107',
          'gold-light': '#FFD54F',
          'gold-dark': '#E6A800',
          cyan: '#00AEEF',
          'cyan-light': '#29BCFF',
          'cyan-dark': '#0090C8',
        },
        text: {
          primary: '#F2F2F2',
          secondary: '#A0A0A0',
          muted: '#6A6A6A',
        },
      },
      fontFamily: {
        display: ['var(--font-michroma)', 'system-ui', 'sans-serif'],
        body: ['var(--font-michroma)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Michroma ~10-15% más ancha que Inter → clamp reducidos para no romper layouts
        'display-xl': ['clamp(2.1rem, 5.2vw, 4.25rem)', { lineHeight: '1.08', letterSpacing: '0.015em' }],
        'display-lg': ['clamp(1.7rem, 3.8vw, 3.1rem)',  { lineHeight: '1.1',  letterSpacing: '0.015em' }],
        'display-md': ['clamp(1.25rem, 2.6vw, 2.1rem)', { lineHeight: '1.15', letterSpacing: '0.01em'  }],
        'body-lg':   ['0.975rem', { lineHeight: '1.8' }],
        'body-base': ['0.875rem', { lineHeight: '1.75' }],
        'body-sm':   ['0.775rem', { lineHeight: '1.7' }],
      },
      spacing: {
        section: 'clamp(4rem, 8vw, 8rem)',
        'section-sm': 'clamp(2rem, 4vw, 4rem)',
      },
      maxWidth: {
        content: '1200px',
        prose: '68ch',
        narrow: '52ch',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        glow: '0 0 50px rgba(255, 193, 7, 0.18)',
        'glow-sm': '0 0 24px rgba(255, 193, 7, 0.12)',
        'glow-cyan': '0 0 50px rgba(0, 174, 239, 0.18)',
        'glow-cyan-sm': '0 0 24px rgba(0, 174, 239, 0.12)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quad': 'cubic-bezier(0.45, 0, 0.55, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '500': '500ms',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
}

export default config
