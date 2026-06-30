/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          body: '#19161D',
          navbar: '#211D27',
          text: '#FAFAFA',
        },
        light: {
          body: '#F4F3F6',
          navbar: '#dfdee6ff',
          text: '#0F0F0F',
        },
      },
    },
  },
  plugins: [],
}