// frontend/src/App.jsx - Final Version (English)

import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import './App.css'; // Link to the elegant CSS

function App() {
  // --- State Variables ---
  const [isVerified, setIsVerified] = useState(false);      // User verification status
  const [nullifierHash, setNullifierHash] = useState(null);  // User's unique anonymous identifier
  const [myTickets, setMyTickets] = useState([]);          // Array for user's tickets
  const [lastDraw, setLastDraw] = useState(null);          // Object for the last draw results
  const [isLoading, setIsLoading] = useState(false);       // General loading indicator
  const [paymentStatus, setPaymentStatus] = useState('idle'); // Payment process state
  const [error, setError] = useState('');                  // Error messages

  // --- Config from Environment Variables ---
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID; // Also used as signal
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD";

  // --- Data Loading Functions ---
  const loadMyTickets = useCallback(async (hash) => {
    if (!hash) return;
    console.log("[loadMyTickets] Fetching tickets for:", hash.substring(0, 8));
    try {
      const res = await fetchMyTickets(hash);
      setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Could not load your tickets.");
      setMyTickets([]);
    }
  }, []);

  const loadResults = useCallback(async () => {
    console.log("[loadResults] Fetching latest results...");
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchLatestResults();
      if (res?.data?.success && res?.data?.results) {
        console.log("[loadResults] Results received:", res.data.results);
        setLastDraw(res.data.results);
      } else {
        console.log("[loadResults] No valid results found:", res?.data?.message);
        setLastDraw(null);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError("Could not load the latest draw results.");
      setLastDraw(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Event Handlers & Callbacks ---
  const handleProof = useCallback(async (proofResponse) => {
    console.log("[handleProof] Received proof from IDKit:", proofResponse);
    setIsLoading(true);
    setPaymentStatus('idle');
    setError('');
    try {
      const res = await verifyWorldId(proofResponse);
      console.log(">>> [handleProof] Backend response:", res);
      if (res.data.success && res.data.nullifierHash) {
        console.log('[handleProof] Backend verification SUCCESS:', res.data.nullifierHash);
        setNullifierHash(res.data.nullifierHash);
        setIsVerified(true);
        loadMyTickets(res.data.nullifierHash);
      } else {
        const backendError = res?.data?.message || 'Verification failed on backend';
        throw new Error(backendError);
      }
    } catch (err) {
      console.error("[handleProof] Verification Error:", err);
      let displayError = `Verification Error: ${err.message || 'Unknown error'}`;
      if (err.message && err.message.includes('This person has already verified')) {
          displayError = "You have already verified for this action with this World ID.";
      }
      setError(displayError);
      setIsVerified(false);
      setNullifierHash(null);
    } finally {
       console.log(">>> [handleProof] Running finally, setIsLoading(false)");
       setIsLoading(false);
    }
  }, [loadMyTickets]);

  const handleError = useCallback((errorData) => {
    console.error("[handleError] IDKit Error:", errorData);
    setError(`World ID Error: ${errorData?.code || 'Widget error'}`);
  }, []);

  const handleInitiatePayment = () => {
    console.log("[handleInitiatePayment] Initiating payment flow...");
    if (!isVerified || !nullifierHash || !receiverAddress || !paymentCallbackUrlBase || !worldcoinAppId || !worldcoinActionId) {
      setError("Error: Missing data or configuration for payment."); return;
    }
    setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true);
    const amount = "1";
    const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`;
    const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`;
    console.log("[handleInitiatePayment] Navigating to:", payUrl);
    window.location.href = payUrl;
  };

  const handlePaymentCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const receivedNullifier = urlParams.get('nullifier_hash');
    const txHash = urlParams.get('tx_hash');
    console.log(`[Callback] Detected: Status=${status}, TxHash=${txHash ? txHash.substring(0,8)+'...' : 'N/A'}, Nullifier=${receivedNullifier?.substring(0,8)}...`);

    if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') { console.warn("[Callback] Ignored, payment status:", paymentStatus); window.history.replaceState({}, '', window.location.pathname); return; }
    if (!receivedNullifier || receivedNullifier !== nullifierHash) { console.warn("[Callback] Ignored, nullifier mismatch/missing."); window.history.replaceState({}, '', window.location.pathname); return; }

    window.history.replaceState({}, '', window.location.pathname); // Clean URL now

    if (status === 'success' && txHash) {
      console.log("[Callback] Success and TxHash present. Confirming backend...");
      setPaymentStatus('confirming'); setIsLoading(true); setError('');
      try {
        const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash);
        if (confirmRes.data.success && confirmRes.data.ticket) {
          setPaymentStatus('success'); setError('');
          console.log("[Callback] Payment confirmed, ticket:", confirmRes.data.ticket);
          loadMyTickets(receivedNullifier);
        } else {
          throw new Error(confirmRes.data.message || 'Backend confirmation failed.');
        }
      } catch (err) {
        console.error("[Callback] Error confirming:", err);
        setError(`Error confirming payment: ${err.response?.data?.message || err.message || '?'}`);
        setPaymentStatus('failed');
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'success' && !txHash) {
      console.error("[Callback] Callback successful but World App did not provide tx_hash.");
      setError('Callback OK but World App did not provide the transaction hash needed for confirmation.');
      setPaymentStatus('failed');
    } else {
      console.log("[Callback] Callback not successful or status unknown:", status);
      setError('Payment was canceled or failed within World App.');
      setPaymentStatus('failed');
    }
  }, [nullifierHash, paymentStatus, loadMyTickets]);


  // --- Effects ---
  // Effect to handle the payment callback redirection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('status') && params.has('nullifier_hash')) {
      console.log("[useEffect Callback Check] Callback URL detected.");
      // Only process if we have the matching nullifierHash (meaning user verified in this session)
      if(nullifierHash) {
          console.log("[useEffect Callback Check] NullifierHash present, processing callback...");
          handlePaymentCallback();
      } else {
          console.warn("[useEffect Callback Check] Callback detected but no nullifierHash in current state. Ignoring.");
          // Clear URL to prevent issues if user verifies later
          window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [handlePaymentCallback, nullifierHash]); // Rerun if callback handler or nullifier changes

  // Effect to load initial results when the component mounts
  useEffect(() => {
    console.log("[useEffect loadResults] Loading initial results...");
    loadResults();
  }, [loadResults]); // Depend on loadResults (memoized)


  // --- Render ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        {/* Header */}
        <header className="app-header">
          <h1 className="main-title"><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lottery <span role="img" aria-label="ticket">🎟️</span></h1>
          <p className="subtitle">Verify with World ID, pay 1 WLD & get your ticket for the weekly draw!</p>
        </header>

        {/* Status / Error Display */}
        <section className="status-section">
          {error && <p className="message message-error">⚠️ Error: {error}</p>}
          {isLoading && <p className="message message-loading">⏳ Loading / Processing...</p>}
          {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Waiting for confirmation in World App...</p>}
          {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirming payment on the blockchain...</p>}
          {paymentStatus === 'success' && <p className="message message-success">✅ Payment complete & ticket issued!</p>}
        </section>

        {/* Action Section (Verify or Purchase) */}
        <section className="action-section">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify Identity</h2>
              <p>We need to confirm you are a unique human.</p>
              <IDKitWidget
                  app_id={worldcoinAppId || 'app_INVALID_ID'} // Provide fallback
                  action={worldcoinActionId || 'invalid_action'} // Provide fallback
                  signal={worldcoinActionId} // Use Action ID as signal
                  handleVerify={handleProof}
                  onError={handleError}
                  credential_types={['orb', 'phone']} // Accept Orb or Phone verification
              >
                {({ open }) => <button onClick={open} disabled={isLoading || !worldcoinAppId || !worldcoinActionId} className="button button-verify">Verify with World ID</button>}
              </IDKitWidget>
              {/* Show config error only if IDs are missing */}
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Missing Worldcoin App/Action ID configuration.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
              <h2>Step 2: Purchase Your Ticket!</h2>
              <p className="verified-text">✅ Verified ({nullifierHash?.substring(0,8)}...).</p>
              {paymentStatus !== 'success' ? (
                  <button
                      onClick={handleInitiatePayment}
                      disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'}
                      className="button button-purchase"
                  >
                      Purchase Ticket (1 WLD) <span role="img" aria-label="money">💸</span>
                  </button>
              ) : (
                  <p className="message message-success">You already have your ticket for this week!</p>
              )}
            </div>
          )}
        </section>

        {/* My Tickets Section (Only shown if verified) */}
        {isVerified && (
          <section className="tickets-section data-section">
            <h2>My Tickets (Current Week)</h2>
            {Array.isArray(myTickets) && myTickets.length > 0 ? (
              <ul className="item-list ticket-list">
                {myTickets.map(ticket => (
                  <li key={ticket?.id || Math.random()} className="list-item ticket-item">
                    <span className="item-icon">🎫</span>
                    <span className="item-data">{Array.isArray(ticket?.numbers) ? ticket.numbers.join(' - ') : 'Invalid numbers'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-items-message">You haven't purchased any tickets this week yet.</p>
            )}
          </section>
        )}

        {/* Latest Results Section */}
        <section className="results-section data-section">
           <h2>Latest Draw Results ({lastDraw?.drawWeek?.replace('-W',' / Week ')||'N/A'})</h2>
           {lastDraw && Array.isArray(lastDraw.winningNumbers) ? (
             <div className="draw-details">
               <div className="results-summary">
                 <p><strong>Winning Numbers:</strong> <span className="winning-numbers">{lastDraw.winningNumbers.join(' - ')}</span></p>
                 <p><strong>Total Pool:</strong> {lastDraw.potWld || 0} WLD</p>
               </div>
               <h3>Winners:</h3>
               {lastDraw.results ? (
                 <ul className="item-list winners-list">
                   {Array.isArray(lastDraw.results.first) && lastDraw.results.first.length > 0 ? (
                     lastDraw.results.first.map((w, i) => ( <li key={`1-${w?.ticketId || i}`} className="list-item winner winner-first"><span className="item-icon">🥇</span> 1st: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> ))
                   ) : (<li className="list-item no-winner">(No 1st Place Winners)</li>)}
                   {Array.isArray(lastDraw.results.second) && lastDraw.results.second.length > 0 ? (
                     lastDraw.results.second.map((w, i) => ( <li key={`2-${w?.ticketId || i}`} className="list-item winner winner-second"><span className="item-icon">🥈</span> 2nd: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> ))
                   ) : (<li className="list-item no-winner">(No 2nd Place Winners)</li>)}
                   {Array.isArray(lastDraw.results.third) && lastDraw.results.third.length > 0 ? (
                      lastDraw.results.third.map((w, i) => ( <li key={`3-${w?.ticketId || i}`} className="list-item winner winner-third"><span className="item-icon">🥉</span> 3rd: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> ))
                   ) : (<li className="list-item no-winner">(No 3rd Place Winners)</li>)}
                 </ul>
               ) : ( <p className="no-items-message">Detailed winner information unavailable.</p> )}
             </div>
           ) : (
             <p className="no-items-message">{isLoading && !error ? 'Loading results...' : 'Latest draw results are not available yet.'}</p>
           )}
         </section>

        {/* Footer */}
        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Golden Ticket Lottery. Good Luck!</p>
        </footer>
      </div>
    </div>
  );
}

export default App;