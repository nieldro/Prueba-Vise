import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, /api se reenvia al backend para no depender de CORS.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
