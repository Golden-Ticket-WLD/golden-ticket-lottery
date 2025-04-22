// frontend/src/App.jsx - FINAL VERSION USING MINIKIT (openWorldApp)

import React, { useState, useEffect, useCallback } from 'react';
import { openWorldApp } from '@worldcoin/minikit-js';
import {
  verifyWorldId,
  confirmPaymentOnBackend,
  fetchMyTickets,
  fetchLatestResults
} from './services/api';
import CountdownTimer from './components/CountdownTimer';
import './App.css';

function App() {
  const [isVerified, setIsVerified] = useState(false);
  const [nullifierHash, setNullifierHash] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [lastDraw, setLastDraw] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [error, setError] = useState('');

  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID;
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD";

  const loadMyTickets = useCallback(async (hash) => {
    if (!hash) return;
    try {
      const res = await fetchMyTickets(hash);
      setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      if (!error) setError("Could not load your tickets.");
      setMyTickets([]);
    }
  }, [error]);

  const loadResults = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetchLatestResults();
      if (res?.data?.success && res?.data?.results) {
        setLastDraw(res.data.results);
      } else {
        setLastDraw(null);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError("Could not load the latest draw results.");
      setLastDraw(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, error]);

  const handleMiniKitSuccess = useCallback(async (proofResponse) => {
    setIsLoading(true);
    setPaymentStatus('idle');
    setError('');
    try {
      const res = await verifyWorldId(proofResponse);
      if (res?.data?.success && res?.data?.nullifierHash) {
        setNullifierHash(res.data.nullifierHash);
        setIsVerified(true);
        loadMyTickets(res.data.nullifierHash);
      } else {
        throw new Error(res?.data?.message || 'Verification failed on backend.');
      }
    } catch (err) {
      console.error("[handleMiniKitSuccess] Error:", err);
      setError(`Verification Error: ${err.message}`);
      setIsVerified(false);
      setNullifierHash(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadMyTickets]);

  const handleMiniKitError = useCallback((errorData) => {
    console.error("[handleMiniKitError] Failed:", errorData);
    setError(`World ID process failed: ${errorData?.code || 'Unknown error'}`);
  }, []);

  const triggerNativeVerification = useCallback(() => {
    if (!worldcoinAppId || !worldcoinActionId) {
      setError("Configuration Error: Worldcoin App ID or Action ID is missing.");
      return;
    }
    setError('');
    openWorldApp({
      app_id: worldcoinAppId,
      action: worldcoinActionId,
      signal: worldcoinActionId,
      credential_types: ['orb'],
      onSuccess: handleMiniKitSuccess,
      onError: handleMiniKitError
    });
  }, [worldcoinAppId, worldcoinActionId, handleMiniKitSuccess, handleMiniKitError]);

  const handleInitiatePayment = () => {
    // Placeholder or real payment handler here
  };

  const handlePaymentCallback = useCallback(async () => {
    // Placeholder or real logic here
  }, [nullifierHash, paymentStatus, loadMyTickets]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('status') && params.has('nullifier_hash')) {
      if (nullifierHash) {
        handlePaymentCallback();
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [handlePaymentCallback, nullifierHash]);

  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { if (isVerified && nullifierHash) loadMyTickets(nullifierHash); }, [isVerified, nullifierHash, loadMyTickets]);

  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        <header className="app-header">
          <h1 className="main-title">🎟️ Golden Ticket Lottery 🎟️</h1>
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
              <button
                onClick={triggerNativeVerification}
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-verify"
              >
                Verify with World ID (Native)
              </button>
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Config missing.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
              <h2>Step 2: Purchase Your Ticket!</h2>
              <p className="verified-text">✅ Verified ({nullifierHash?.substring(0, 8)}...)</p>
              {paymentStatus !== 'success' ? (
                <button
                  onClick={handleInitiatePayment}
                  disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'}
                  className="button button-purchase"
                >
                  Purchase Ticket (1 WLD) 💸
                </button>
              ) : (
                <p className="message message-success">You have your ticket for this week!</p>
              )}
            </div>
          )}
        </section>

        {isVerified && (
          <section className="tickets-section data-section">
            <h2>My Tickets (Current Week)</h2>
            {Array.isArray(myTickets) && myTickets.length > 0 ? (
              <ul className="item-list ticket-list">
                {myTickets.map(ticket => (
                  <li key={ticket?.id || Math.random()} className="list-item ticket-item">
                    <span className="item-icon">🎫</span>
                    <span className="item-data">
                      {Array.isArray(ticket?.numbers) ? ticket.numbers.join(' - ') : 'N/A'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-items-message">No tickets purchased this week yet.</p>
            )}
          </section>
        )}

        <section className="results-section data-section">
          <h2>Latest Draw Results ({lastDraw?.drawWeek?.replace('-W',' / Wk ') || 'N/A'})</h2>
          {lastDraw && Array.isArray(lastDraw.winningNumbers) ? (
            <div className="draw-details">
              <div className="results-summary">
                <p><strong>Winning #:</strong> <span className="winning-numbers">{lastDraw.winningNumbers.join(' - ')}</span></p>
                <p><strong>Pool:</strong> {lastDraw.potWld || 0} WLD</p>
              </div>
              <h3>Winners:</h3>
              <ul className="item-list winners-list">
                {Array.isArray(lastDraw.results?.first) && lastDraw.results.first.length > 0
                  ? lastDraw.results.first.map((w, i) => (
                    <li key={`1-${w?.ticketId || i}`} className="list-item winner winner-first">
                      🥇 1st: Ticket #{w?.ticketId} ({w?.nullifierHash?.substring(0, 8)}...) won {w?.prizeShare} WLD
                    </li>
                  )) : <li className="list-item no-winner">(No 1st Place Winners)</li>}

                {Array.isArray(lastDraw.results?.second) && lastDraw.results.second.length > 0
                  ? lastDraw.results.second.map((w, i) => (
                    <li key={`2-${w?.ticketId || i}`} className="list-item winner winner-second">
                      🥈 2nd: Ticket #{w?.ticketId} ({w?.nullifierHash?.substring(0, 8)}...) won {w?.prizeShare} WLD
                    </li>
                  )) : <li className="list-item no-winner">(No 2nd Place Winners)</li>}

                {Array.isArray(lastDraw.results?.third) && lastDraw.results.third.length > 0
                  ? lastDraw.results.third.map((w, i) => (
                    <li key={`3-${w?.ticketId || i}`} className="list-item winner winner-third">
                      🥉 3rd: Ticket #{w?.ticketId} ({w?.nullifierHash?.substring(0, 8)}...) won {w?.prizeShare} WLD
                    </li>
                  )) : <li className="list-item no-winner">(No 3rd Place Winners)</li>}
              </ul>
            </div>
          ) : (
            <p className="no-items-message">
              {isLoading && !error ? 'Loading results...' : 'Latest draw results are not available yet.'}
            </p>
          )}
        </section>

        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Golden Ticket Lottery. Good Luck!</p>
        </footer>
      </div> {/* End app-container */}
    </div> {/* End app-wrapper */}
  );
}

export default App;
