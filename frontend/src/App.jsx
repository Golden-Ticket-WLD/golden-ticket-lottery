// frontend/src/App.jsx - FINAL con Manejo de No Resultados y Preparado para Timer

import CountdownTimer from './components/CountdownTimer';
import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
// import CountdownTimer from './components/CountdownTimer'; // <-- Añadiremos este import en el siguiente paso
import './App.css';

function App() {
  // --- Estados ---
  const [isVerified, setIsVerified] = useState(false);
  const [nullifierHash, setNullifierHash] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [lastDraw, setLastDraw] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [error, setError] = useState('');

  // --- Configuración ---
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID;
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD";

  // --- FUNCIONES DE CARGA DE DATOS ---
  const loadMyTickets = useCallback(async (hash) => { /* ... (código sin cambios) ... */ }, []);

  // *** CORRECCIÓN AQUÍ: Manejo de 'No Hay Resultados' ***
  const loadResults = useCallback(async () => {
    console.log("[loadResults] Iniciando carga de resultados...");
    setIsLoading(true);
    // NO limpiamos error aquí intencionalmente, podría haber otro error pendiente
    try {
      const res = await fetchLatestResults();
      if (res?.data?.success && res?.data?.results) {
        console.log("[loadResults] Resultados recibidos:", res.data.results);
        setLastDraw(res.data.results);
        setError(''); // Limpiar error SOLO si la carga es exitosa
      } else {
        // Esto NO es un error, simplemente no hay resultados previos
        console.log("[loadResults] No se encontraron resultados válidos:", res?.data?.message);
        setLastDraw(null);
        // NO establecemos setError('') aquí tampoco, mantenemos el error anterior si lo hubiera
      }
    } catch (err) {
       // ESTO sí es un error (red, backend caído, etc.)
      console.error("Error obteniendo resultados:", err);
      setError("Could not load the latest draw results."); // Establecer error real
      setLastDraw(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // Sin dependencias externas

  // --- MANEJADORES DE EVENTOS Y CALLBACKS (Sin cambios) ---
  const handleProof = useCallback(async (proofResponse) => { /* ... (código sin cambios) ... */ }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { /* ... (código sin cambios) ... */ }, []);
  const handleInitiatePayment = () => { /* ... (código sin cambios) ... */ };
  const handlePaymentCallback = useCallback(async () => { /* ... (código sin cambios) ... */ }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- EFECTOS (Sin cambios) ---
  useEffect(() => { /* ... (efecto callback sin cambios) ... */ }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]); // Efecto para cargar resultados al inicio
  useEffect(() => { if (isVerified && nullifierHash) { loadMyTickets(nullifierHash); } }, [isVerified, nullifierHash, loadMyTickets]); // Cargar tickets si está verificado


  // --- RENDERIZADO JSX ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
         <header className="app-header">{/* ... */}</header>

         <CountdownTimer />

         <section className="status-section">{/* ... */}</section>
         <section className="action-section"> {/* ... JSX sin cambios */} </section>
         {isVerified && (<section className="tickets-section data-section">{/* ... */}</section>)}
         <section className="results-section data-section"> {/* ... JSX sin cambios, mostrará mensaje correcto ahora */} </section>
         <footer className="app-footer">{/* ... */}</footer>
      </div>
    </div>
  );
}

// -- Asegúrate de reemplazar el JSX omitido (...) con el código elegante anterior --
// -- para mantener la estructura visual completa --

export default App;