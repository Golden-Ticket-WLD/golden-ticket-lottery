// frontend/src/App.jsx - Usando MiniKit (Sintaxis Revisada)

import React, { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@worldcoin/minikit-js'; // Importar hook
// Quitar o comentar import { IDKitWidget } from '@worldcoin/idkit'; si aún estaba
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

  // --- Hook de MiniKit ---
  const { openWorldID } = useMiniKit(); // Obtener función del hook

  // --- Funciones de Carga ---
  const loadMyTickets = useCallback(async (hash) => { if (!hash) return; try { const res = await fetchMyTickets(hash); setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []); } catch (err) { console.error("Error obteniendo tickets:", err); setError("Could not load your tickets."); setMyTickets([]); } }, []);
  const loadResults = useCallback(async () => { setIsLoading(true); setError(''); try { const res = await fetchLatestResults(); if (res?.data?.success && res?.data?.results) { setLastDraw(res.data.results); setError(''); } else { setLastDraw(null); } } catch (err) { console.error("Error obteniendo resultados:", err); setError("Could not load results."); setLastDraw(null); } finally { setIsLoading(false); } }, []);

  // --- Manejadores ---
  // (Se usan ahora como callbacks para openWorldID)
  const handleProof = useCallback(async (proofResponse) => { console.log("[handleProof - MiniKit] Proof:", proofResponse); setIsLoading(true); setPaymentStatus('idle'); setError(''); try { const res = await verifyWorldId(proofResponse); if (res.data.success && res.data.nullifierHash) { setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash); } else { throw new Error(res?.data?.message || 'Verification failed.'); } } catch (err) { console.error("[handleProof] Error:", err); setError(`Verification Error: ${err.message||'?'}`); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); } }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { console.error("[handleError - MiniKit] Error:", errorData); setError(`World ID Error: ${errorData?.code || '?'}`); }, []);
  // (handleInitiatePayment y handlePaymentCallback sin cambios lógicos)
  const handleInitiatePayment = () => { /* ... */ };
  const handlePaymentCallback = useCallback(async () => { /* ... */ }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos (Sin cambios lógicos) ---
  useEffect(() => { /* ... callback effect ... */ }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);


  // --- RENDERIZADO JSX ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        {/* ... (Header, CountdownTimer, Status Section sin cambios) ... */}
        <header className="app-header">...</header>
        <CountdownTimer />
        <section className="status-section">...</section>

        <section className="action-section card">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify Identity</h2>
              <p>We need to confirm you are a unique human.</p>

              {/* --- Botón que llama a openWorldID --- */}
              <button
                onClick={() => { // Asegúrate que la sintaxis es correcta
                  console.log("Botón Verificar presionado. Llamando a openWorldID...");
                  openWorldID({ // Objeto con callbacks
                      onSuccess: handleProof,
                      onError: handleError,
                      // MiniKit debería obtener app_id/action/signal de la config del Provider o contexto
                  });
                 }}
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-worldid" // Revisa nombres de clases vs CSS
              >
                Verify with World ID
              </button>
              {/* --- Fin Botón --- */}

              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Missing Config.</p>}
            </div>
          ) : (
             <div className="action-box purchase-box">{/* ... (Sección Compra) ... */}</div>
          )}
        </section>

        {/* ... (Secciones Tickets y Resultados) ... */}
         {isVerified && ( <section className="tickets-section data-section">...</section> )}
         <section className="results-section data-section">...</section>

        {/* ... (Footer) ... */}
         <footer className="app-footer">...</footer>
      </div>
    </div>
  );
}

export default App;
// Asegúrate de reemplazar las secciones omitidas '...' con el contenido JSX completo de la versión anterior.