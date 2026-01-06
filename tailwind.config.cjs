/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './frontend/index.html',
    './frontend/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '440px',
      },
    },
  },
  plugins: [],
};
