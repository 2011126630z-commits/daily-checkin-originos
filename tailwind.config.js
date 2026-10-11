/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'origin-bg': '#E9EDF4',
        'origin-bg-dark': '#DDE3EE',
        'origin-bg-light': '#E7EBF3',
        'origin-blue': '#315EFB',
        'origin-blue-light': 'rgba(49, 94, 251, 0.1)',
        'origin-gray': '#8B919A',
        'origin-gray-dark': '#5A6470',
        'origin-text': '#2D3748',
        'origin-text-light': '#718096',
      },
      boxShadow: {
        'glass': '0 10px 30px rgba(120, 140, 170, 0.15)',
        'glass-hover': '0 15px 40px rgba(120, 140, 170, 0.2)',
      },
      backdropBlur: {
        'glass': '18px',
        'nav': '20px',
      },
    },
  },
  plugins: [],
}
