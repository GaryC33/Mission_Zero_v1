// tailwind.config.js
module.exports = {
  content: [
    "./*.html",              // Pour index.html
    "./modules/**/*.html",   // Pour les fichiers HTML dans les modules
    "./modules/**/*.js"     // Pour les fichiers JS des modules (si des classes sont ajoutées dynamiquement)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};