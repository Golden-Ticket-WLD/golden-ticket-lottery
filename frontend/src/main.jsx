// frontend/src/main.jsx - SIMPLE, SIN MiniKitProvider
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // O App.css

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* O sin él si dio problemas antes */}
    <App />
  </React.StrictMode>
);