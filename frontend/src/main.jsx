// frontend/src/main.jsx - CON MiniKitProvider (CORREGIDO)
import React from 'react';
import ReactDOM from 'react-dom/client';
// Corregir la importación si la estructura interna del paquete cambió:
// Intenta importar el Provider directamente. Si no funciona, puede que
// el nombre o la ruta hayan cambiado en la librería minikit-js.
import { MiniKitProvider } from '@worldcoin/minikit-js';
import App from './App.jsx';
import './index.css';

const minikitConfig = {
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    // Configuración necesaria para MiniKit, según su documentación:
    app_id: import.meta.env.VITE_WORLDCOIN_APP_ID, // App ID es necesaria aquí
    action: import.meta.env.VITE_WORLDCOIN_ACTION_ID // Action ID también es necesaria
    // credential_types: ['orb', 'phone'], // Opcional: puedes definirlas aquí o al llamar al comando
};

// Verificar que los valores de configuración existen
if (!minikitConfig.app_id || !minikitConfig.action) {
    console.error("ERROR CRÍTICO: VITE_WORLDCOIN_APP_ID o VITE_WORLDCOIN_ACTION_ID no están definidos en .env.local! MiniKit no funcionará.");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* Volver a activar StrictMode es buena idea */}
      {/* Pasar la configuración al Provider */}
      <MiniKitProvider config={minikitConfig}>
          <App />
      </MiniKitProvider>
  </React.StrictMode>
);