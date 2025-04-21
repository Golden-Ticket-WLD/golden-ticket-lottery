import React from 'react';
import ReactDOM from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js'; // <-- 1. Importar
import App from './App.jsx';
import './index.css'; // O App.css

// 2. Configurar MiniKit (puede ser simple inicialmente)
const minikitConfig = {
    origin: typeof window !== 'undefined' ? window.location.origin : '', // Usar origen actual de forma segura
    // Puedes añadir más opciones de config aquí si son necesarias según MiniKit docs
};

ReactDOM.createRoot(document.getElementById('root')).render(
  // 3. Envolver App con el Provider
  <MiniKitProvider config={minikitConfig}>
    <App />
  </MiniKitProvider>
  // Quitado React.StrictMode anteriormente para depuración
);