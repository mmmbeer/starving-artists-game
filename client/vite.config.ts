import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/lobby': 'http://localhost:4000',
      '/realtime': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
});
