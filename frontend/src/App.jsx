// frontend/src/App.jsx - Usando MiniKit para Flujo Nativo

import React, { useState, useEffect, useCallback } from 'react';
// import { IDKitWidget } from '@worldcoin/idkit'; // <-- ELIMINADO/COMENTADO
import { useMiniKit } from '@worldcoin/minikit-js'; // <-- AÑADIDO
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import CountdownTimer from './components/CountdownTimer';
import './App.css';

function App() {
  // --- Estados (Sin cambios) ---
  const [isVerified, setIsVerified] = useState(false);
  const [nullifierHash, setNullifierHash] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [lastDraw, setLastDraw] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [error, setError] = useState('');

  // --- Configuración (appId y actionId siguen siendo relevantes) ---
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID; // Se usa como signal y action
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD";

  // --- Hook de MiniKit ---
  // Obtener la función para abrir el diálogo nativo de World ID
  const { openWorldID } = useMiniKit();

  // --- Funciones de Carga (Sin cambios) ---
  const loadMyTickets = useCallback(async (hash) => { /* ...código igual... */ }, []);
  const loadResults = useCallback(async () => { /* ...código igual... */ }, []);

  // --- Manejadores de Eventos ---
  // handleProof y handleError AHORA se pasarán como callbacks a openWorldID
  const handleProof = useCallback(async (proofResponse) => {
    console.log("[handleProof - MiniKit] Proof recibido:", proofResponse); // Cambiado log para claridad
    setIsLoading(true); setPaymentStatus('idle'); setError('');
    try {
      const res = await verifyWorldId(proofResponse);
      if (res.data.success && res.data.nullifierHash) {
          setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash);
      } else { throw new Error(res?.data?.message || 'Verification failed.'); }
    } catch (err) { console.error("[handleProof] Error:", err); setError(`Verification Error: ${err.message||'?'}`); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); }
  }, [loadMyTickets]);

  const handleError = useCallback((errorData) => {
    console.error("[handleError - MiniKit] Error:", errorData); // Cambiado log para claridad
    setError(`World ID Error: ${errorData?.code || '?'}`);
  }, []);

  const handleInitiatePayment = () => { /* ...código sin cambios... */ };
  const handlePaymentCallback = useCallback(async () => { /* ...código sin cambios... */ }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos (Sin cambios) ---
  useEffect(() => { /* ...callback effect... */ }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { if (isVerified && nullifierHash) { loadMyTickets(nullifierHash); } }, [isVerified, nullifierHash, loadMyTickets]);

  // --- RENDERIZADO JSX (Reemplazando IDKitWidget) ---
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
              <p>We need to confirm you are a unique human.</p>

              {/* --- REEMPLAZO DE IDKitWidget --- */}
              <button
                // Llama a openWorldID pasando los callbacks
                onClick={() => openWorldID({
                    onSuccess: handleProof, // Tu función para éxito
                    onError: handleError,    // Tu función para error
                    // MiniKit debería usar app_id, action, signal de la config global
                    // o podrías necesitarlos aquí si el Provider no es suficiente, revisa docs de MiniKit
                })}
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-worldid"
              >
                Verify with World ID
              </button>
              {/* --- FIN REEMPLAZO --- */}

              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Missing Config.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
                 {/* ... (sección compra sin cambios) ... */}
            </div>
          )}
        </section>

        {/* ... (secciones tickets, resultados, footer sin cambios) ... */}
      </div>
    </div>
  );
}

export default App;