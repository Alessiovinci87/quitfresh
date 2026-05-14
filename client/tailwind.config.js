/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primario — verde salvia più raffinato (slightly desaturato, più caldo)
        sage: {
          50:  '#f6f8f5',
          100: '#e9efe7',
          200: '#d2dccf',
          300: '#aec1aa',
          400: '#85a081',
          500: '#688361',
          600: '#516a4c',
          700: '#41553e',
          800: '#364434',
          900: '#2c372c',
        },
        // Accent caldo per badge/highlight/hover
        terracotta: {
          50:  '#fbf5f1',
          100: '#f5e6dc',
          200: '#e8c8b3',
          300: '#d7a585',
          400: '#c08160',
          500: '#a8654a',
          600: '#8a4f3a',
          700: '#6e3f30',
        },
        // Background warm off-white (sostituisce gray-50 dove appropriato)
        cream: {
          50:  '#fdfcf9',
          100: '#faf8f2',
          200: '#f3eee2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
      borderRadius: {
        'soft': '14px',
        'xl-soft': '20px',
        '2xl-soft': '28px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
        'card': '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)',
        'lift': '0 4px 8px rgba(15, 23, 42, 0.04), 0 16px 40px rgba(15, 23, 42, 0.08)',
        'sage': '0 8px 24px rgba(104, 131, 97, 0.25)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
