/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",  // tout ce qui est dans src/
    "./*.html",              // vos HTML à la racine (si index.html s’y trouve)
    "./*.js"                 // vos JS à la racine (si script.js s’y trouve)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
