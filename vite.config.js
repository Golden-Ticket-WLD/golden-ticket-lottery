// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'   // o el plugin que uses

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Intercepta las advertencias de Rollup
      onwarn(warning, defaultHandler) {
        // Ignora solo las PURE annotation warnings
        if (warning.code === 'UNSUPPORTED_PURE_ANNOTATION') {
          return
        }
        // Para todo lo demás, usa el handler por defecto
        defaultHandler(warning)
      }
    }
  }
})
