import React from 'react';
import ReactDOM from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js';
import App from './App.jsx';
import './index.css'; // O App.css si renombraste

const minikitConfig = {
    // Proveer origin para inicializar MiniKit
    // Usamos 'typeof window' para evitar errores en SSR/build si la variable no existe
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    // Puedes añadir otras opciones de config aquí si lo necesitas
};

ReactDOM.createRoot(document.getElementById('root')).render(
  // Provider de MiniKit envolviendo App
  <MiniKitProvider config={minikitConfig}>
    <App />
  </MiniKitProvider>
  // Sin React.StrictMode por ahora
);