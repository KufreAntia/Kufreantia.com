import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.kufreantia.com',
  trailingSlash: 'always',
  adapter: vercel(),
});
