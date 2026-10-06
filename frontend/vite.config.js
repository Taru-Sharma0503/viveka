import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep YOUR existing proxy/port if you already have one.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000', // ← change to your backend port
    },
  },
});