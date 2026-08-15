import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  vite: {
    server: {
      // Accept proxied preview hosts (e.g. *.e2b.app) in dev
      allowedHosts: ['.e2b.app', 'localhost'],
      proxy: {
        // Browser-facing code never calls the API origin directly —
        // relative /api/* requests are proxied to the Express engine.
        '/api': {
          target: process.env.API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  },
});
