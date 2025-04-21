import React from 'react';
import ReactDOM from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js'; // Importar
import App from './App.jsx';
import './index.css';

const minikitConfig = {
    origin: typeof window !== 'undefined' ? window.location.origin : '',
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <MiniKitProvider config={minikitConfig}>
    <App />
  </MiniKitProvider>
);