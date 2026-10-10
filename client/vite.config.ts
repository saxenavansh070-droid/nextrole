import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Project root (one level above /client) so `nextrole.json` can be imported directly.
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Load the shared .env from the project root.
  envDir: projectRoot,
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
