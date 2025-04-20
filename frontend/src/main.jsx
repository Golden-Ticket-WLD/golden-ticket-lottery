import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // O './App.js'
import './index.css' // O './App.css' u otro CSS principal

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode> // <-- Eliminado para diagnóstico
    <App />
  // </React.StrictMode> // <-- Eliminado para diagnóstico
)