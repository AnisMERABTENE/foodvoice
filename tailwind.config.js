/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Configuration mobile-first avec breakpoints optimisés
      screens: {
        'xs': '375px',   // iPhone SE et plus petits
        'sm': '640px',   // Téléphones en mode paysage
        'md': '768px',   // Tablettes
        'lg': '1024px',  // Desktop petit
        'xl': '1280px',  // Desktop large
        '2xl': '1536px', // Très large écran
      },
      
      // Couleurs personnalisées pour FOODVOICE
      colors: {
        primary: {
          50: '#fef7ed',
          100: '#feebd0',
          200: '#fdd5a1',
          300: '#fbb871',
          400: '#f89541',
          500: '#f97316', // Orange principal
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Bleu principal
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Vert principal
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        }
      },

      // Animations personnalisées pour l'interface vocale
      animation: {
        'bounce-gentle': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'voice-wave': 'voice-wave 1.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-in',
      },

      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'voice-wave': {
          '0%, 100%': { 
            transform: 'scaleY(1)',
            opacity: '0.5' 
          },
          '50%': { 
            transform: 'scaleY(1.5)',
            opacity: '1' 
          },
        },
        'slide-up': {
          '0%': { 
            transform: 'translateY(100%)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1' 
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },

      // Espacements optimisés pour mobile
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Tailles de polices optimisées pour la lisibilité mobile
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },

      // Ombres personnalisées pour les cartes
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'voice-button': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'voice-active': '0 25px 50px -12px rgba(59, 130, 246, 0.25)',
      },

      // Bordures arrondies personnalisées
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      // Configuration de grille responsive
      gridTemplateColumns: {
        'auto-fit-cards': 'repeat(auto-fit, minmax(280px, 1fr))',
        'auto-fill-cards': 'repeat(auto-fill, minmax(300px, 1fr))',
      },

      // Z-index pour les couches
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [
    // Plugin pour les interactions tactiles
    function({ addUtilities }) {
      addUtilities({
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-none': {
          'touch-action': 'none',
        },
        // Classes utilitaires pour le mobile
        '.mobile-tap': {
          '-webkit-tap-highlight-color': 'transparent',
          'touch-action': 'manipulation',
        },
        '.safe-area-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-area-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        // Scrolling smooth pour mobile
        '.scroll-smooth-mobile': {
          '-webkit-overflow-scrolling': 'touch',
          'scroll-behavior': 'smooth',
        }
      })
    }
  ],
}