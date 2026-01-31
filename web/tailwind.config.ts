import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#d4a574', // Light mode: warm amber
          dark: '#00d4ff',    // Dark mode: cyan neon
        },
        'accent-secondary': {
          DEFAULT: '#8b7355', // Light mode: warm brown
          dark: '#0080ff',    // Dark mode: blue
        },
        tron: {
          // Dark mode - Classic Tron
          bg: '#0a0a0f',
          'bg-elevated': '#0d1117',
          cyan: '#00d4ff',
          blue: '#0080ff',
          'cyan-glow': 'rgba(0, 212, 255, 0.5)',
          'blue-glow': 'rgba(0, 128, 255, 0.5)',
          // Light mode - ISO Realm
          'iso-bg': '#faf7f2',
          'iso-bg-elevated': '#f5f0e8',
          amber: '#d4a574',
          brown: '#8b7355',
          'amber-glow': 'rgba(212, 165, 116, 0.4)',
          'brown-glow': 'rgba(139, 115, 85, 0.4)',
        },
        gradient: {
          start: '#00d4ff', // cyan for dark mode
          mid: '#0080ff',   // blue
          end: '#00d4ff',   // back to cyan
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)',
        'glow-cyan-sm': '0 0 10px rgba(0, 212, 255, 0.4), 0 0 20px rgba(0, 212, 255, 0.2)',
        'glow-cyan-lg': '0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.4)',
        'glow-blue': '0 0 20px rgba(0, 128, 255, 0.5), 0 0 40px rgba(0, 128, 255, 0.3)',
        'glow-amber': '0 0 20px rgba(212, 165, 116, 0.4), 0 0 40px rgba(212, 165, 116, 0.2)',
        'glow-amber-sm': '0 0 10px rgba(212, 165, 116, 0.3), 0 0 20px rgba(212, 165, 116, 0.15)',
      },
      animation: {
        'skill-fill': 'skill-fill 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'blink': 'blink 1s step-end infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in-up-delay-1': 'fade-in-up 0.6s ease-out 0.1s forwards',
        'fade-in-up-delay-2': 'fade-in-up 0.6s ease-out 0.2s forwards',
        'fade-in-up-delay-3': 'fade-in-up 0.6s ease-out 0.3s forwards',
        'fade-in-up-delay-4': 'fade-in-up 0.6s ease-out 0.4s forwards',
        'fade-in-up-delay-5': 'fade-in-up 0.6s ease-out 0.5s forwards',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'skill-fill': {
          from: { width: '0%' },
          to: { width: 'var(--skill-level)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(5px) rotate(-1deg)' },
        },
      },
      transitionDelay: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
