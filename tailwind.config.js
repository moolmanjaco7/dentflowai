/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          600: "#1e40af", // primary
          700: "#1d4ed8",
          800: "#1e3a8a",
        }
      }
    },
  },
  plugins: [],
}
