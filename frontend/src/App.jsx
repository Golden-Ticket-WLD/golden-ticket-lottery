// frontend/src/App.jsx - VERSIÓN FINAL CON IDKitWidget

import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit'; // Importar IDKitWidget
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import CountdownTimer from './components/CountdownTimer'; // Asumiendo que existe
import './App.css'; // Usando los estilos elegantes v3

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

  // --- Funciones de Carga ---
  const loadMyTickets = useCallback(async (hash) => { if (!hash) return; try { const res = await fetchMyTickets(hash); setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []); } catch (err) { console.error("Error fetching tickets:", err); if (!error) setError("Could not load your tickets."); setMyTickets([]); } }, [error]); // Añadido 'error' a dependencias
  const loadResults = useCallback(async () => { if (isLoading) return; setIsLoading(true); try { const res = await fetchLatestResults(); if (res?.data?.success && res?.data?.results) { setLastDraw(res.data.results); setError(''); } else { setLastDraw(null); } } catch (err) { console.error("Error fetching results:", err); if (!error) setError("Could not load results."); setLastDraw(null); } finally { setIsLoading(false); } }, [isLoading, error]); // Añadido isLoading, error

  // --- Manejadores ---
  const handleProof = useCallback(async (proofResponse) => { setIsLoading(true); setPaymentStatus('idle'); setError(''); try { const res = await verifyWorldId(proofResponse); if (res.data.success && res.data.nullifierHash) { setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash); } else { const backendError = res?.data?.message || 'Verification failed.'; throw new Error(backendError); } } catch (err) { console.error("Verification Error:", err); let displayError = `Verification Error: ${err.message||'?'}`; if (err.message?.includes('already verified')) { displayError = "Already verified for this action."; } setError(displayError); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); } }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { console.error("IDKit Error:", errorData); setError(`World ID Error: ${errorData?.code || '?'}`); }, []);
  const handleInitiatePayment = () => { if (!isVerified || !nullifierHash || !receiverAddress || !paymentCallbackUrlBase || !worldcoinAppId || !worldcoinActionId) { setError("Error: Missing data/config."); return; } setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true); const amount = "1"; const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`; const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`; console.log("Navigating to pay URL:", payUrl); window.location.href = payUrl; };
  const handlePaymentCallback = useCallback(async () => { const urlParams = new URLSearchParams(window.location.search); const status = urlParams.get('status'); const receivedNullifier = urlParams.get('nullifier_hash'); const txHash = urlParams.get('tx_hash'); console.log(`[Callback] S=${status}, T=${txHash?.substring(0,8)}..., N=${receivedNullifier?.substring(0,8)}...`); if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') return; if (!receivedNullifier || receivedNullifier !== nullifierHash) { window.history.replaceState({}, '', window.location.pathname); return; } window.history.replaceState({}, '', window.location.pathname); if (status === 'success' && txHash) { setPaymentStatus('confirming'); setIsLoading(true); setError(''); try { const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash); if (confirmRes.data.success && confirmRes.data.ticket) { setPaymentStatus('success'); setError(''); loadMyTickets(receivedNullifier); } else { throw new Error(confirmRes.data.message || 'Backend confirm failed.'); } } catch (err) { console.error("Callback Error:", err); setError(`Error confirming: ${err.response?.data?.message || err.message || '?'}`); setPaymentStatus('failed'); } finally { setIsLoading(false); } } else if (status === 'success' && !txHash) { setError('Callback OK but no tx_hash.'); setPaymentStatus('failed'); } else { setError('Payment canceled/failed.'); setPaymentStatus('failed'); } }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos ---
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('status') && params.has('nullifier_hash')) { if(nullifierHash) handlePaymentCallback(); else window.history.replaceState({}, '', window.location.pathname); } }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]); // Llamar loadResults en montaje
  useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);


  // --- RENDERIZADO JSX ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        <header className="app-header">
          <h1><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lottery <span role="img" aria-label="ticket">🎟️</span></h1>
          <p className="subtitle">Verify with World ID, pay 1 WLD & get your ticket for the weekly draw!</p>
        </header>
        <CountdownTimer />
        <section className="status-section">
          {error && <p className="message message-error">⚠️ Error: {error}</p>}
          {isLoading && <p className="message message-loading">⏳ Loading / Processing...</p>}
          {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Waiting for confirmation in World App...</p>}
          {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirming payment on the blockchain...</p>}
          {paymentStatus === 'success' && <p className="message message-success">✅ Payment complete & ticket issued!</p>}
        </section>
        <section className="action-section card">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify Identity</h2>
              <p>We need to confirm you are a unique human.</p>
              {/* USAR IDKitWidget de @worldcoin/idkit */}
              <IDKitWidget
                  app_id={worldcoinAppId || 'app_INVALID_ID'}
                  action={worldcoinActionId || 'invalid_action'}
                  signal={worldcoinActionId} // Signal consistente
                  handleVerify={handleProof}
                  onError={handleError}
                  credential_types={['orb']} // Enfocarse en Orb puede ser más estable
              >
                {({ open }) => <button onClick={open} disabled={isLoading || !worldcoinAppId || !worldcoinActionId} className="button button-primary button-verify">Verify with World ID</button>}
              </IDKitWidget>
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Config missing.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
               <h2>Step 2: Purchase Your Ticket!</h2>
               <p className="verified-text">✅ Verified ({nullifierHash?.substring(0,8)}...).</p>
               {paymentStatus !== 'success' ? (<button onClick={handleInitiatePayment} disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'} className="button button-purchase">Purchase Ticket (1 WLD) <span role="img" aria-label="money">💸</span></button>) : (<p className="message message-success">You have your ticket!</p>)}
             </div>
          )}
        </section>
         {isVerified && ( <section className="tickets-section data-section"><h2>My Tickets (Current Week)</h2>{Array.isArray(myTickets) && myTickets.length > 0 ? ( <ul className="item-list ticket-list">{ myTickets.map(ticket => (<li key={ticket?.id || Math.random()} className="list-item ticket-item"><span className="item-icon">🎫</span><span className="item-data">{Array.isArray(ticket?.numbers) ? ticket.numbers.join(' - ') : 'N/A'}</span></li>))}</ul> ) : (<p className="no-items-message">No tickets yet.</p>)} </section> )}
         <section className="results-section data-section"> <h2>Latest Draw Results ({lastDraw?.drawWeek?.replace('-W',' / Wk ')||'N/A'})</h2> {lastDraw && Array.isArray(lastDraw.winningNumbers) ? ( <div className="draw-details"> <div className="results-summary"><p><strong>Winning #:</strong> <span className="winning-numbers">{lastDraw.winningNumbers.join(' - ')}</span></p><p><strong>Pool:</strong> {lastDraw.potWld || 0} WLD</p></div> <h3>Winners:</h3> {lastDraw.results ? ( <ul className="item-list winners-list">{Array.isArray(lastDraw.results.first) && lastDraw.results.first.length > 0 ? (lastDraw.results.first.map((w, i) => ( <li key={`1-${w?.ticketId || i}`} className="list-item winner winner-first"><span className="item-icon">🥇</span> 1st: #{w?.ticketId || '?'} ...</li> )) ) : (<li className="list-item no-winner">(No 1st)</li>)}{Array.isArray(lastDraw.results.second) && lastDraw.results.second.length > 0 ? (lastDraw.results.second.map((w, i) => ( <li key={`2-${w?.ticketId || i}`} className="list-item winner winner-second"><span className="item-icon">🥈</span> 2nd: #{w?.ticketId || '?'} ...</li> )) ) : (<li className="list-item no-winner">(No 2nd)</li>)}{Array.isArray(lastDraw.results.third) && lastDraw.results.third.length > 0 ? (lastDraw.results.third.map((w, i) => ( <li key={`3-${w?.ticketId || i}`} className="list-item winner winner-third"><span className="item-icon">🥉</span> 3rd: #{w?.ticketId || '?'} ...</li> )) ) : (<li className="list-item no-winner">(No 3rd)</li>)}</ul> ) : ( <p className="no-items-message">Winner info unavailable.</p> )} </div> ) : (<p className="no-items-message">{isLoading && !error ? 'Loading...' : 'Results not available.'}</p> )} </section>
        <footer className="app-footer"> <p>© {new Date().getFullYear()} Golden Ticket Lottery. Good Luck!</p> </footer>
      </div>
    </div>
  );
} // Fin App

export default App;