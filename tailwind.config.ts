/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {}
  },
  plugins: [typography]
};
