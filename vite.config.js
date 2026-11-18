import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      'api': 'http://localhost:8081',
      '/thumbnail': 'http://localhost:8081',

      // "/process" and "/results" go here
    },
  },
});
