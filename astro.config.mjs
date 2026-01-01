import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://jharris1679.github.io',
  base: '/inference-economics',
  integrations: [react(), tailwind()],
  output: 'static',
});
