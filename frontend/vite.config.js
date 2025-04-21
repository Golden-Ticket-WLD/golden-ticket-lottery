// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Intercepta las advertencias de Rollup
      onwarn(warning, defaultHandler) {
        // Ignora solo las PURE annotation warnings de ox
        if (warning.code === 'UNSUPPORTED_PURE_ANNOTATION') {
          return
        }
        // Para el resto de warnings, usa el handler por defecto
        defaultHandler(warning)
      }
    }
  }
})
