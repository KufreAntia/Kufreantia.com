import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.kufreusenantia.com',
  trailingSlash: 'ignore',
  adapter: vercel(),
});
