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
        // [design-v3 / Eclipse] Palette dark cinematic — sfumature
        // notturne profonde con tinta verde-blu sottile, MAI nero puro
        // (un blu-verde scuro è più caldo e meno OLED-burn).
        night: {
          950: '#070a09',
          900: '#0a0f0d',
          800: '#0d1411',
          700: '#121a17',
          600: '#18221e',
          500: '#1f2c27',
          400: '#2a3a33',
        },
        // [design-v3] Neon verde elettrico — il cuore di "Eclipse".
        // Saturazione alta, luminosità alta. Usato sparingly per accents,
        // glow, e numero giorni.
        neon: {
          300: '#a7f3d0',  // verde pallido (testi secondari su dark)
          400: '#5eead4',  // teal elettrico (accents)
          500: '#22ff88',  // verde acido (highlight/glow)
          600: '#10b981',  // verde profondo (bordi neon)
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
        // [design-v3 Eclipse] Glow neon per dark cinematic
        'neon': '0 0 24px rgba(34, 255, 136, 0.4), 0 0 48px rgba(34, 255, 136, 0.15)',
        'neon-sm': '0 0 12px rgba(34, 255, 136, 0.3)',
        'neon-strong': '0 0 32px rgba(34, 255, 136, 0.55), 0 0 64px rgba(34, 255, 136, 0.25)',
        'glass-dark': 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.4)',
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
        // [design-v3 Eclipse] Mesh gradient animato lento (60s loop)
        'mesh-drift': 'meshDrift 60s ease-in-out infinite',
        // [design-v3] Pulse neon per accenti (3s gentle)
        'neon-pulse': 'neonPulse 3s ease-in-out infinite',
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
        // [design-v3 Eclipse] Sposta lentamente i mesh-blob per dare
        // l'idea di un fondo "vivo". 60s = abbastanza lento da non
        // distrarre. transform-origin diversi per ogni blob.
        meshDrift: {
          '0%, 100%':  { transform: 'translate(0%, 0%) scale(1)' },
          '25%':       { transform: 'translate(8%, -6%) scale(1.08)' },
          '50%':       { transform: 'translate(-4%, 8%) scale(0.95)' },
          '75%':       { transform: 'translate(-7%, -4%) scale(1.04)' },
        },
        // Pulse glow per il numero principale e accenti CTA
        neonPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(34,255,136,0.5))' },
          '50%':      { filter: 'drop-shadow(0 0 18px rgba(34,255,136,0.85))' },
        },
      },
    },
  },
  plugins: [],
};
