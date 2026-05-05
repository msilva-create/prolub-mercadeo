/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        prolub: {
          red: '#C41E3A',
          darkred: '#8B0000',
          gold: '#E8B04B',
          dark: '#1A1A2E',
          gray: '#F4F4F4',
        }
      },
      fontFamily: {
        sans: ['var(--font-main)', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
