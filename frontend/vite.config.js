import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 3005,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Output to root-level public/ so FastAPI can serve the built SPA
    outDir: '../public',
    emptyOutDir: true
  }
});
