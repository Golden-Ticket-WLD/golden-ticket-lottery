// frontend/src/App.jsx - CORREGIDO para usar MiniKit correctamente

import React, { useState, useEffect, useCallback } from 'react';
// ¡Importamos la función directamente, NO un hook!
import { openWorldApp } from '@worldcoin/minikit-js';
// Quitar import { IDKitWidget } from '@worldcoin/idkit';

import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import CountdownTimer from './components/CountdownTimer';
import './App.css';

function App() {
  // --- Estados (Igual que antes) ---
  const [isVerified, setIsVerified] = useState(false);
  const [nullifierHash, setNullifierHash] = useState(null);
  // ... otros estados: myTickets, lastDraw, isLoading, paymentStatus, error

  // --- Configuración (Leída de .env.local - ya usada en el Provider de main.jsx) ---
  // Aún las necesitamos aquí para pasarlas si es necesario o para otros flujos.
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID;
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD";


  // --- Funciones de Carga y Otros Manejadores (Igual que antes) ---
   const loadMyTickets = useCallback(async (hash) => { /* ... */ }, []);
   const loadResults = useCallback(async () => { /* ... */ }, [error]);
   const handleInitiatePayment = () => { /* ... */ };
   const handlePaymentCallback = useCallback(async () => { /* ... */ }, [nullifierHash, paymentStatus, loadMyTickets]);


  // --- Manejadores para los Callbacks de MiniKit ---
  // (Se pasan directamente como parámetros a openWorldApp)
  const handleMiniKitSuccess = useCallback(async (proofResponse) => {
    console.log("[handleMiniKitSuccess] Proof recibido de MiniKit:", proofResponse);
    setIsLoading(true); setPaymentStatus('idle'); setError('');
    try {
      const res = await verifyWorldId(proofResponse); // Llama al backend
      if (res.data.success && res.data.nullifierHash) {
        setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash);
      } else { throw new Error(res?.data?.message || 'Verification failed.'); }
    } catch (err) { /* ... manejo de error ... */ } finally { setIsLoading(false); }
  }, [loadMyTickets]); // Depende de loadMyTickets

  const handleMiniKitError = useCallback((errorData) => {
    console.error("[handleMiniKitError] Error:", errorData);
    setError(`World ID Error: ${errorData?.code || 'MiniKit process error'}`);
  }, []);

  // --- Función para iniciar la verificación NATIVA con MiniKit ---
  const handleOpenWorldIdNative = useCallback(() => {
    // Validar que tenemos lo necesario ANTES de llamar
    if (!worldcoinAppId || !worldcoinActionId) {
      setError("Configuration Error: App ID or Action ID is missing.");
      console.error("Config Error:", { worldcoinAppId, worldcoinActionId });
      return;
    }
    console.log("Calling openWorldApp with:", { action: worldcoinActionId, signal: worldcoinActionId, app_id: worldcoinAppId });
    // Llamar a la función exportada por MiniKit
    openWorldApp({
        action: worldcoinActionId,
        signal: worldcoinActionId, // Importante pasar signal consistente
        app_id: worldcoinAppId, // Puede ser opcional si se configuró en Provider, pero es bueno incluirlo
        credential_types: ['orb'], // Ser explícito
        onSuccess: handleMiniKitSuccess, // Pasar callback de éxito
        onError: handleMiniKitError     // Pasar callback de error
    });
  }, [worldcoinAppId, worldcoinActionId, handleMiniKitSuccess, handleMiniKitError]); // Dependencias


  // --- Efectos (Sin cambios lógicos) ---
   useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('status') && params.has('nullifier_hash')) { if(nullifierHash) { handlePaymentCallback(); } else { window.history.replaceState({}, '', window.location.pathname); } } }, [handlePaymentCallback, nullifierHash]);
   useEffect(() => { loadResults(); }, [loadResults]);
   useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);


  // --- RENDERIZADO JSX (Botón ahora llama a handleOpenWorldIdNative) ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
         <header className="app-header">{/*...*/}</header>
         <CountdownTimer />
         <section className="status-section">{/*...*/}</section>

        <section className="action-section card">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify Identity</h2>
              <p>Confirm you're a unique human.</p>
              {/* --- Botón que llama a la función nativa --- */}
              <button
                onClick={handleOpenWorldIdNative} // Llama a la función que usa openWorldApp
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-verify"
              >
                Verify with World ID
              </button>
              {/* --- Fin Botón --- */}
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Config missing.</p>}
            </div>
          ) : (
             <div className="action-box purchase-box">{/* ... (Sección Compra) ... */}</div>
          )}
        </section>

         {isVerified && ( <section className="tickets-section data-section">{/* ... Mis boletos ... */} </section> )}
         <section className="results-section data-section">{/* ... Resultados ... */} </section>
         <footer className="app-footer">{/* ... Footer ... */}</footer>
      </div>
    </div>
  );
}

export default App;
// Rellenar JSX omitido (...) con el código de la versión elegante/final