import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/lobby': 'http://localhost:4000'
    }
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
});
