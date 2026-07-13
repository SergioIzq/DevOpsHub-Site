import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://devops.sergioizq.com',
  integrations: [tailwind(), sitemap()],
  server: {
    port: 4321
  }
});
