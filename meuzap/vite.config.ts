import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3003,
    host: true,
    proxy: {
      '/api': {
        target: 'https://api.democracias.org/whatsapp',
        changeOrigin: true,
        secure: false,
      },
      '/candidatos': {
        target: 'https://democracias.org',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3003,
    host: true,
  },
});
