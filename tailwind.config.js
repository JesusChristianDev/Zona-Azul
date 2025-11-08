module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8', // Azul profundo Zona Azul
        accent: '#14b8a6', // Turquesa energizante
        highlight: '#f97316', // Toque cálido para llamados de atención
        neutral: '#0f172a'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
