module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      colors: {
        primary: '#1d4ed8', // Azul profundo Zona Azul
        accent: '#14b8a6', // Turquesa energizante
        highlight: '#f97316', // Toque cálido para llamados de atención
        neutral: '#0f172a'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      }
    }
  },
  plugins: []
}
