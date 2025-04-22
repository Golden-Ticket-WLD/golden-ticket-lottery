// frontend/vite.config.js - Apuntando optimizeDeps a minikit-js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@worldcoin/minikit-js' // <-- CAMBIADO a minikit-js
    ],
  },
  build: {
    rollupOptions: {}
  }
})