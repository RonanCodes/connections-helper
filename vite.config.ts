import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { 
    host: true, 
    port: 5181,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
})
