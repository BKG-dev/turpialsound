import type { Config } from 'tailwindcss'

const config: Config = {
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
          muted: '#5A5A5A',
        },
      },
      fontFamily: {
        display: ['var(--font-michroma)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.05', letterSpacing: '0.02em' }],
        'display-lg': ['clamp(2rem, 4.5vw, 3.75rem)', { lineHeight: '1.08', letterSpacing: '0.02em' }],
        'display-md': ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '0.015em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body-base': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
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
