// Tailwind CSS v4 uses a single PostCSS plugin; token/theme config is CSS-first
// (see src/styles/tokens.css `@theme`). See FS1_REPORT.md note on Tailwind v4.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
