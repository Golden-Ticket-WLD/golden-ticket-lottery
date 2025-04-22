import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { // <-- AÑADIR O MODIFICAR ESTA SECCIÓN
    include: [
      '@worldcoin/idkit', // Asegura que Vite pre-bundle o procese IDKit
      // Puedes añadir otros paquetes aquí si dan problemas similares
    ],
    // Opcional: a veces forzar esbuild ayuda con CJS
    // esbuildOptions: {
    //   target: 'esnext'
    // }
  },
  // Puede ser necesario si IDKit usa process.env o variables globales
  // que Vite elimina en producción. Añadir según sea necesario.
  // define: {
  //    'process.env': process.env // Esto puede exponer variables del build, ¡cuidado!
  // }
  build: {
    rollupOptions: {
      // NO AÑADAS idkit a external aquí, queremos incluirlo
    }
  }
})