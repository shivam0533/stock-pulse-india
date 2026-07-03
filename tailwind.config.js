/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50: '#FFF8E7',
          100: '#FFECC2',
          200: '#FFD988',
          300: '#FFC54E',
          400: '#FFB627', // Primary amber - signature accent
          500: '#E89C00',
          600: '#B87B00',
          700: '#8A5C00',
          800: '#5C3D00',
          900: '#2E1E00',
        },
        // Semantic colors for P&L
        gain: {
          DEFAULT: '#00C896',
          subtle: 'rgba(0, 200, 150, 0.12)',
          border: 'rgba(0, 200, 150, 0.3)',
        },
        loss: {
          DEFAULT: '#FF4D6D',
          subtle: 'rgba(255, 77, 109, 0.12)',
          border: 'rgba(255, 77, 109, 0.3)',
        },
        // Dark surface palette
        ink: {
          950: '#070A14', // Deepest background
          900: '#0A0E1A', // Base background
          850: '#0F1424',
          800: '#131829', // Surface
          750: '#181E33',
          700: '#1A2138', // Card
          600: '#232B47', // Border
          500: '#2D3556',
          400: '#4A547A',
          300: '#6B7599',
          200: '#8B92A8', // Muted text
          100: '#B8BED1',
          50: '#E8ECF7',  // Primary text
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-amber': '0 0 24px -4px rgba(255, 182, 39, 0.45)',
        'glow-gain': '0 0 20px -4px rgba(0, 200, 150, 0.4)',
        'glow-loss': '0 0 20px -4px rgba(255, 77, 109, 0.4)',
        'card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        'radial-fade': 'radial-gradient(ellipse at top, rgba(255,182,39,0.08), transparent 60%)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-gain': 'flash-gain 0.6s ease-out',
        'flash-loss': 'flash-loss 0.6s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'ticker': 'ticker 60s linear infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
        },
        'flash-gain': {
          '0%': { backgroundColor: 'rgba(0, 200, 150, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-loss': {
          '0%': { backgroundColor: 'rgba(255, 77, 109, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
