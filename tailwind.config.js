/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1b365d',
        secondary: '#00a9ce',
        accent: '#0ea5e9',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        mistNavy: '#1b365d',
        mistTeal: '#00a9ce'
      }
    }
  },
  plugins: [],
}
