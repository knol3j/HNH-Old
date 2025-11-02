/**
 * Tailwind configuration for HashNHedge static pages.
 * Limits content scanning to project HTML/JS to produce a trimmed build.
 */
module.exports = {
  content: [
    './index.html',
    './docs/**/*.html',
    './pages/**/*.html',
    './downloads/**/*.html',
    './HNH-pool/**/*.html',
    './armageddon/**/*.html',
    './mobile-proof-pool/**/*.html',
    './hnh-vendor-portal/**/*.html',
    './assets/js/**/*.js'
  ],
  safelist: [
    'bg-green-500',
    'bg-red-500'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
