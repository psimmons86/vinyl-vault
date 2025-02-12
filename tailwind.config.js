/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D81B60',
          dark: '#B0003A',
          light: '#FF5C8D'
        },
        secondary: {
          DEFAULT: '#45573C',
          dark: '#2C382B',
          light: '#556B4A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      height: {
        'screen-90': '90vh',
      },
      minHeight: {
        'screen-75': '75vh',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '2rem',
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(-20px, 20px) rotate(5deg)' },
          '66%': { transform: 'translate(20px, -20px) rotate(-5deg)' }
        }
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'float': 'float 20s infinite linear',
        'float-delay-1': 'float 20s infinite linear 0.15s',
        'float-delay-2': 'float 20s infinite linear 0.3s',
        'float-delay-3': 'float 20s infinite linear 0.45s',
        'float-delay-4': 'float 20s infinite linear 0.6s',
        'float-delay-5': 'float 20s infinite linear 0.75s',
        'float-delay-6': 'float 20s infinite linear 0.9s',
        'float-delay-7': 'float 20s infinite linear 1.05s',
        'float-delay-8': 'float 20s infinite linear 1.2s',
        'float-delay-9': 'float 20s infinite linear 1.35s',
        'float-delay-10': 'float 20s infinite linear 1.5s',
        'float-delay-11': 'float 20s infinite linear 1.65s',
        'float-delay-12': 'float 20s infinite linear 1.8s'
      }
    },
  },
  plugins: [],
  darkMode: 'class',
  safelist: [
    'bg-opacity-10',
    'bg-opacity-20',
    'bg-opacity-50',
    'bg-opacity-80',
    'text-opacity-80',
    'text-opacity-90'
  ]
}
