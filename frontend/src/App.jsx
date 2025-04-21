// frontend/src/App.jsx - Usando MiniKit (Sintaxis Revisada)

import React, { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@worldcoin/minikit-js';
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import CountdownTimer from './components/CountdownTimer'; // Asumiendo que CountdownTimer existe
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
  const { openWorldID } = useMiniKit();

  // --- Funciones de Carga ---
  const loadMyTickets = useCallback(async (hash) => { if (!hash) return; try { const res = await fetchMyTickets(hash); setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []); } catch (err) { console.error("Error fetching tickets:", err); setError("Could not load your tickets."); setMyTickets([]); } }, []);
  const loadResults = useCallback(async () => { setIsLoading(true); setError(''); try { const res = await fetchLatestResults(); if (res?.data?.success && res?.data?.results) { setLastDraw(res.data.results); setError(''); } else { setLastDraw(null); } } catch (err) { console.error("Error fetching results:", err); setError("Could not load results."); setLastDraw(null); } finally { setIsLoading(false); } }, []);

  // --- Manejadores ---
  const handleProof = useCallback(async (proofResponse) => { setIsLoading(true); setPaymentStatus('idle'); setError(''); try { const res = await verifyWorldId(proofResponse); if (res.data.success && res.data.nullifierHash) { setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash); } else { const backendError = res?.data?.message || 'Verification failed.'; throw new Error(backendError); } } catch (err) { console.error("Verification Error:", err); let displayError = `Verification Error: ${err.message||'?'}`; if (err.message?.includes('already verified')) { displayError = "Already verified."; } setError(displayError); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); } }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { console.error("IDKit Error:", errorData); setError(`World ID Error: ${errorData?.code || '?'}`); }, []);
  const handleInitiatePayment = () => { if (!isVerified || !nullifierHash || !receiverAddress || !paymentCallbackUrlBase || !worldcoinAppId || !worldcoinActionId) { setError("Error: Missing data/config."); return; } setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true); const amount = "1"; const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`; const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`; console.log("Navigating to pay URL:", payUrl); window.location.href = payUrl; };
  const handlePaymentCallback = useCallback(async () => { const urlParams = new URLSearchParams(window.location.search); const status = urlParams.get('status'); const receivedNullifier = urlParams.get('nullifier_hash'); const txHash = urlParams.get('tx_hash'); console.log(`[Callback] S=${status}, T=${txHash?.substring(0,8)}..., N=${receivedNullifier?.substring(0,8)}...`); if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') { window.history.replaceState({}, '', window.location.pathname); return; } if (!receivedNullifier || receivedNullifier !== nullifierHash) { window.history.replaceState({}, '', window.location.pathname); return; } window.history.replaceState({}, '', window.location.pathname); if (status === 'success' && txHash) { setPaymentStatus('confirming'); setIsLoading(true); setError(''); try { const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash); if (confirmRes.data.success && confirmRes.data.ticket) { setPaymentStatus('success'); setError(''); loadMyTickets(receivedNullifier); } else { throw new Error(confirmRes.data.message || 'Confirm backend failed.'); } } catch (err) { console.error("Callback Error:", err); setError(`Confirm error: ${err.response?.data?.message || err.message || '?'}`); setPaymentStatus('failed'); } finally { setIsLoading(false); } } else if (status === 'success' && !txHash) { setError('Callback OK but no tx_hash.'); setPaymentStatus('failed'); } else { setError('Payment cancel/fail.'); setPaymentStatus('failed'); } }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos ---
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('status') && params.has('nullifier_hash')) { if(nullifierHash) handlePaymentCallback(); else window.history.replaceState({}, '', window.location.pathname); } }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);

  // --- Renderizado ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        <header className="app-header"><h1><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lottery <span role="img" aria-label="ticket">🎟️</span></h1><p className="subtitle">Verify with World ID, pay 1 WLD & get your ticket for the weekly draw!</p></header>
        <CountdownTimer /> {/* Asumiendo que existe y funciona */}
        <section className="status-section">{error && <p className="message message-error">⚠️ Error: {error}</p>} {isLoading && <p className="message message-loading">⏳ Loading...</p>} {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Waiting in World App...</p>} {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirming Payment...</p>} {paymentStatus === 'success' && <p className="message message-success">✅ Payment Done!</p>}</section>
        <section className="action-section card">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify</h2>
              <p>Confirm you're a unique human.</p>
              {/* Botón usando useMiniKit */}
              <button
                onClick={() => {
                  console.log("Verify button clicked. Calling openWorldID...");
                  openWorldID({
                    onSuccess: handleProof, // Correct callback
                    onError: handleError    // Correct callback
                  });
                 }}
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-verify"
              >
                Verify with World ID
              </button>
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Config missing.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
              <h2>Step 2: Purchase</h2>
              <p className="verified-text">✅ Verified ({nullifierHash?.substring(0,8)}...).</p>
              {paymentStatus!=='success'?(<button onClick={handleInitiatePayment} disabled={isLoading||paymentStatus==='pending_worldapp'||paymentStatus==='confirming'} className="button button-purchase">Purchase Ticket (1 WLD) <span role="img" aria-label="money">💸</span></button>):(<p className="message message-success">Ticket Purchased!</p>)}
            </div>
          )}
        </section>
        {isVerified && ( <section className="tickets-section data-section"> {/* ... Mis boletos ... */} </section> )}
        <section className="results-section data-section"> {/* ... Resultados ... */} </section>
        <footer className="app-footer"> {/* ... Footer ... */} </footer>
      </div>
    </div>
  );
}

export default App;
// NOTA: El JSX detallado de las secciones tickets/results/footer se omitió por brevedad,
// asegúrate de tener la versión completa que te di antes.