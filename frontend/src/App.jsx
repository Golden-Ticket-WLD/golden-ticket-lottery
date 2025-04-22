// frontend/src/App.jsx - FINAL CON MINIKIT (openWorldApp)

import React, { useState, useEffect, useCallback } from 'react';
// Importar la función correcta de minikit-js
import { openWorldApp } from '@worldcoin/minikit-js'; // Importar la función correcta
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import CountdownTimer from './components/CountdownTimer';
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

  // --- Funciones de Carga (Sin cambios) ---
  const loadMyTickets = useCallback(async (hash) => { /* ... */ }, []);
  const loadResults = useCallback(async () => { /* ... */ }, [error]);

  // --- Callbacks para MiniKit ---
  const handleMiniKitSuccess = useCallback(async (proofResponse) => {
    console.log("[handleMiniKitSuccess] Proof:", proofResponse); setIsLoading(true); setPaymentStatus('idle'); setError(''); try { const res = await verifyWorldId(proofResponse); if (res.data.success && res.data.nullifierHash) { setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash); } else { throw new Error(res?.data?.message || 'Verify failed.'); } } catch (err) { console.error("Verify Error:", err); setError(`Verify Error: ${err.message||'?'}`); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); }
  }, [loadMyTickets]);
  const handleMiniKitError = useCallback((errorData) => { console.error("[MiniKit Error]:", errorData); setError(`World ID Error: ${errorData?.code || '?'}`); }, []);

  // --- Función para Iniciar Verificación Nativa ---
  const triggerNativeVerification = useCallback(() => {
    if (!worldcoinAppId || !worldcoinActionId) { setError("Config Error"); return; }
    console.log("Calling openWorldApp with:", { action: worldcoinActionId, signal: worldcoinActionId });
    openWorldApp({ // Llamar a la función importada
        action: worldcoinActionId,
        signal: worldcoinActionId,
        app_id: worldcoinAppId, // Asegurarse de pasar app_id si lo requiere
        credential_types: ['orb'],
        onSuccess: handleMiniKitSuccess, // Callback éxito
        onError: handleMiniKitError     // Callback error
    });
  }, [worldcoinAppId, worldcoinActionId, handleMiniKitSuccess, handleMiniKitError]); // Dependencias

  // --- Otros Handlers (Sin cambios) ---
  const handleInitiatePayment = () => { /* ... */ };
  const handlePaymentCallback = useCallback(async () => { /* ... */ }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos (Sin cambios) ---
  useEffect(() => { /* ... */ }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);

  // --- RENDERIZADO JSX (Botón llama a triggerNativeVerification) ---
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
               {/* Botón llama a la función que usa openWorldApp */}
              <button
                onClick={triggerNativeVerification} // <--- LLAMAR A NUESTRA FUNCIÓN
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-verify"
              >
                Verify with World ID (Native)
              </button>
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
} // Fin App

export default App;
// Rellenar JSX omitido con código elegante anterior