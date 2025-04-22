// frontend/src/main.jsx - CORRECTO (sin MiniKitProvider)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // O App.css

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* Mantener StrictMode activado */}
    <App />
  </React.StrictMode>
);