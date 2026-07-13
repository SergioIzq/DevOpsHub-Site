/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-links': theme('colors.cyan.600'),
            '--tw-prose-invert-links': theme('colors.cyan.400'),
            maxWidth: 'none',
            a: { fontWeight: '500', textUnderlineOffset: '2px' },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.15rem 0.4rem',
              borderRadius: '0.35rem',
              fontWeight: '500'
            }
          }
        },
        invert: {
          css: {
            code: { backgroundColor: theme('colors.gray.800') }
          }
        }
      })
    }
  },
  plugins: [typography]
};
