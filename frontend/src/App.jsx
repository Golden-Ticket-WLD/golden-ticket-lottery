// frontend/src/App.jsx - VERSIÓN FINAL COMPLETA CON MINIKIT

import React, { useState, useEffect, useCallback } from 'react';
// Usar MiniKit para el flujo nativo dentro de World App
import { useMiniKit } from '@worldcoin/minikit-js';
// Funciones para llamar a nuestro backend API
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
// Componente de temporizador (asegúrate de que existe en src/components/CountdownTimer.jsx)
import CountdownTimer from './components/CountdownTimer';
// Estilos
import './App.css';

function App() {
  // --- Estados del Componente ---
  const [isVerified, setIsVerified] = useState(false);          // ¿Verificado con World ID?
  const [nullifierHash, setNullifierHash] = useState(null);      // Identificador único post-verificación
  const [myTickets, setMyTickets] = useState([]);              // Boletos del usuario
  const [lastDraw, setLastDraw] = useState(null);              // Resultados del último sorteo
  const [isLoading, setIsLoading] = useState(false);           // Estado de carga general
  const [paymentStatus, setPaymentStatus] = useState('idle');    // idle, pending_worldapp, confirming, success, failed
  const [error, setError] = useState('');                      // Mensajes de error

  // --- Configuración desde Variables de Entorno (.env.local) ---
  // Es crucial que estas variables estén definidas en Vercel/Netlify para producción
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID; // Se usará como action Y signal
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS; // Tu dirección para recibir WLD
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL; // URL a la que vuelve World App
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD"; // Identificador del token WLD

  // --- Hook de MiniKit: Obtener la función para iniciar la verificación nativa ---
  const { openWorldID } = useMiniKit();

  // --- Funciones para Cargar Datos del Backend ---
  const loadMyTickets = useCallback(async (hash) => {
    if (!hash) return;
    console.log("[loadMyTickets] Fetching tickets for:", hash?.substring(0, 8));
    try {
      const res = await fetchMyTickets(hash);
      setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      // No necesariamente mostramos este error si el de verificación es más importante
      // setError("Could not load your tickets.");
      setMyTickets([]);
    }
  }, []); // Sin dependencias externas que cambien

  const loadResults = useCallback(async () => {
    console.log("[loadResults] Fetching latest results...");
    // No poner setIsLoading(true) aquí para no ocultar el botón de verificar inicialmente
    // setError(''); // No limpiar error automáticamente aquí
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
      // Solo mostrar este error si no hay otro ya presente
      if (!error) {
        setError("Could not load the latest draw results.");
      }
      setLastDraw(null);
    } finally {
      // setIsLoading(false); // El loading es más para acciones del usuario
    }
  }, [error]); // Depende de 'error' para no sobreescribirlo


  // --- Manejadores de Eventos y Callbacks de World ID ---
  const handleProof = useCallback(async (proofResponse) => {
    console.log("[handleProof - MiniKit] Received proof:", proofResponse);
    setIsLoading(true); // Indicar carga durante verificación backend
    setPaymentStatus('idle'); // Resetear estado de pago
    setError(''); // Limpiar errores previos
    try {
      // Llamar al backend para verificar este proof
      const res = await verifyWorldId(proofResponse);
      console.log(">>> [handleProof] Backend verify response:", res);

      if (res?.data?.success && res?.data?.nullifierHash) {
        console.log('[handleProof] Backend verification SUCCESS:', res.data.nullifierHash);
        setNullifierHash(res.data.nullifierHash);
        setIsVerified(true); // ¡Marcar como verificado!
        loadMyTickets(res.data.nullifierHash); // Cargar boletos después de verificar
      } else {
         // Error devuelto explícitamente por nuestro backend
        const backendError = res?.data?.message || 'Verification failed on backend';
        throw new Error(backendError);
      }
    } catch (err) {
      // Error de red llamando al backend o error lanzado desde el bloque 'if'
      console.error("[handleProof] Verification Error:", err);
      let displayError = `Verification Error: ${err.message || 'Unknown error'}`;
      if (err.message?.includes('already verified')) {
        displayError = "You have already verified for this action today/recently."; // Mensaje más amigable
      }
      setError(displayError);
      setIsVerified(false); // Asegurar estado no verificado
      setNullifierHash(null);
    } finally {
      console.log(">>> [handleProof] Running finally");
      setIsLoading(false); // Quitar indicador de carga
    }
  }, [loadMyTickets]); // Dependencia correcta

  const handleError = useCallback((errorData) => {
    // Manejar errores que ocurran DENTRO del flujo de MiniKit/WorldApp
    console.error("[handleError - MiniKit] World ID process error:", errorData);
    // El código 'UserRejected' es común si el usuario cancela
    setError(`World ID process failed: ${errorData?.code || 'Unknown widget error'}`);
  }, []);

  // --- Iniciar Pago ---
  const handleInitiatePayment = () => {
    console.log("[handleInitiatePayment] Initiating payment flow...");
    // Revalidar condiciones antes de proceder
    if (!isVerified || !nullifierHash || !receiverAddress || !paymentCallbackUrlBase || !worldcoinAppId || !worldcoinActionId) {
      setError("Error: Missing required data or configuration to start payment.");
      return;
    }
    setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true);
    const amount = "1";
    // El callback DEBE incluir el nullifier para poder re-asociar al usuario al volver
    const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`;
    const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`;
    console.log("[handleInitiatePayment] Attempting navigation to:", payUrl);
    window.location.href = payUrl; // Intentar abrir el comando en World App
  };

  // --- Procesar el Callback de Pago ---
  const handlePaymentCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const receivedNullifier = urlParams.get('nullifier_hash');
    const txHash = urlParams.get('tx_hash'); // Esperamos que World App lo añada

    console.log(`[Callback] Detected: Status=${status}, TxHash=${txHash ? txHash.substring(0,8)+'...' : 'N/A'}, Nullifier=${receivedNullifier?.substring(0,8)}...`);

    // Prevenir doble procesamiento y asegurar coincidencia de nullifier
    if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') { console.warn("[Callback] Ignored, status:", paymentStatus); window.history.replaceState({}, '', window.location.pathname); return; }
    if (!receivedNullifier || receivedNullifier !== nullifierHash) { console.warn("[Callback] Ignored, nullifier mismatch/missing."); window.history.replaceState({}, '', window.location.pathname); return; }

    // Limpiar URL inmediatamente
    window.history.replaceState({}, '', window.location.pathname);

    // Procesar solo si es success y tenemos txHash
    if (status === 'success' && txHash) {
      console.log("[Callback] Success+TxHash. Confirming backend...");
      setPaymentStatus('confirming'); setIsLoading(true); setError('');
      try {
        // Llamar a NUESTRO backend para que verifique on-chain y emita el boleto
        const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash);
        if (confirmRes.data.success && confirmRes.data.ticket) {
          // ¡Éxito! Backend confirmó y devolvió el ticket
          setPaymentStatus('success'); // Marcar como completado
          setError(''); // Limpiar cualquier error previo
          console.log("[Callback] Payment confirmed, ticket:", confirmRes.data.ticket);
          loadMyTickets(receivedNullifier); // Recargar lista de boletos
        } else {
          // El backend devolvió éxito=false
          throw new Error(confirmRes.data.message || 'Backend confirmation failed.');
        }
      } catch (err) {
        // Error de red llamando a confirmPaymentOnBackend o error lanzado arriba
        console.error("[Callback] Error confirming:", err);
        setError(`Error confirming payment: ${err.response?.data?.message || err.message || 'Unknown error during confirmation'}`);
        setPaymentStatus('failed'); // Marcar como fallido
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'success' && !txHash) {
      console.error("[Callback] Success status BUT NO TX HASH received from World App.");
      setError('Payment was marked successful by World App, but the transaction identifier needed for confirmation was missing.');
      setPaymentStatus('failed');
    } else {
      console.log("[Callback] Status not 'success' or status missing:", status);
      setError('Payment was canceled or failed in World App.');
      setPaymentStatus('failed');
    }
  }, [nullifierHash, paymentStatus, loadMyTickets]); // Dependencias correctas


  // --- EFECTOS ---
  // Procesar callback de pago si los parámetros están en la URL al cargar o al verificar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('status') && params.has('nullifier_hash')) {
      console.log("[useEffect Callback Check] Callback URL detected.");
      if(nullifierHash) { // Procesar solo si tenemos el nullifier de esta sesión
          console.log("[useEffect Callback Check] Nullifier found, processing callback...");
          handlePaymentCallback();
      } else {
          // Limpiar URL para evitar procesarla erróneamente si el usuario verifica *después*
          console.warn("[useEffect Callback Check] No nullifier in state yet. Clearing URL params.");
          window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [handlePaymentCallback, nullifierHash]); // Dependencias correctas

  // Cargar resultados iniciales
  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Cargar tickets si el usuario está verificado (al cargar o después de handleProof)
  useEffect(() => {
    if (isVerified && nullifierHash) {
      loadMyTickets(nullifierHash);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified, nullifierHash]); // Quitado loadMyTickets de deps para evitar bucle si se redefine


  // --- RENDERIZADO JSX ---
  return (
    <div className="app-wrapper">
      <div className="app-container card-texture">
        {/* Header */}
        <header className="app-header">
          <h1 className="main-title"><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lottery <span role="img" aria-label="ticket">🎟️</span></h1>
          <p className="subtitle">Verify with World ID, pay 1 WLD & get your ticket for the weekly draw!</p>
        </header>

        {/* Temporizador */}
        <CountdownTimer />

        {/* Mensajes de Estado/Error */}
        <section className="status-section">
          {error && <p className="message message-error">⚠️ Error: {error}</p>}
          {isLoading && <p className="message message-loading">⏳ Loading / Processing...</p>}
          {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Waiting for confirmation in World App...</p>}
          {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirming payment on the blockchain...</p>}
          {paymentStatus === 'success' && <p className="message message-success">✅ Payment complete & ticket issued!</p>}
        </section>

        {/* Sección de Acción: Verificar o Comprar */}
        <section className="action-section card">
          {!isVerified ? (
            <div className="action-box worldid-box">
              <h2>Step 1: Verify Identity</h2>
              <p>We need to confirm you are a unique human.</p>
              {/* Botón que usa el hook useMiniKit */}
              <button
                onClick={() => {
                  // Validar configuración antes de llamar
                  if (!worldcoinAppId || !worldcoinActionId) {
                      setError("Configuration error: App ID or Action ID missing.");
                      return;
                  }
                  console.log("Verify button clicked. Calling openWorldID...");
                  // Llamar a la función del hook para abrir el flujo nativo
                  openWorldID({
                      onSuccess: handleProof, // Pasar nuestro callback para éxito
                      onError: handleError,    // Pasar nuestro callback para error
                      // Config importante: signal y action (obtenidos de .env)
                      // MiniKit debería usar los globales del provider,
                      // pero especificarlos puede ser más robusto si el provider falla
                      signal: worldcoinActionId,
                      action: worldcoinActionId,
                      app_id: worldcoinAppId // Asegurarse que el appId se pasa
                  });
                 }}
                 // Deshabilitar si está cargando o falta configuración
                disabled={isLoading || !worldcoinAppId || !worldcoinActionId}
                className="button button-primary button-verify" // Clases para estilo
              >
                Verify with World ID
              </button>
              {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error: Config missing.</p>}
            </div>
          ) : (
            <div className="action-box purchase-box">
              <h2>Step 2: Purchase Your Ticket!</h2>
              <p className="verified-text">✅ Verified ({nullifierHash?.substring(0,8)}...).</p>
              {/* Botón de compra (si no ha completado el pago) */}
              {paymentStatus !== 'success' ? (
                  <button
                      onClick={handleInitiatePayment}
                      disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'}
                      className="button button-purchase" // Clase específica para compra
                  >
                      Purchase Ticket (1 WLD) <span role="img" aria-label="money">💸</span>
                  </button>
              ) : (
                  <p className="message message-success">You have your ticket for this week!</p>
              )}
            </div>
          )}
        </section>

        {/* Mis Boletos (Solo si verificado) */}
        {isVerified && (
          <section className="tickets-section data-section">
            <h2>My Tickets (Current Week)</h2>
            {Array.isArray(myTickets) && myTickets.length > 0 ? (
              <ul className="item-list ticket-list">
                {myTickets.map(ticket => (
                  <li key={ticket?.id || Math.random()} className="list-item ticket-item">
                    <span className="item-icon">🎫</span>
                    <span className="item-data">{Array.isArray(ticket?.numbers) ? ticket.numbers.join(' - ') : 'N/A'}</span>
                  </li>
                ))}
              </ul>
            ) : ( <p className="no-items-message">No tickets purchased this week yet.</p> )}
          </section>
        )}

        {/* Resultados */}
        <section className="results-section data-section">
           <h2>Latest Draw Results ({lastDraw?.drawWeek?.replace('-W',' / Wk ')||'N/A'})</h2>
           {lastDraw && Array.isArray(lastDraw.winningNumbers) ? (
             <div className="draw-details">
               <div className="results-summary">
                 <p><strong>Winning Numbers:</strong> <span className="winning-numbers">{lastDraw.winningNumbers.join(' - ')}</span></p>
                 <p><strong>Total Pool:</strong> {lastDraw.potWld || 0} WLD</p>
               </div>
               <h3>Winners:</h3>
               {lastDraw.results ? (
                 <ul className="item-list winners-list">
                   {Array.isArray(lastDraw.results.first) && lastDraw.results.first.length > 0 ? (lastDraw.results.first.map((w, i) => ( <li key={`1-${w?.ticketId || i}`} className="list-item winner winner-first"><span className="item-icon">🥇</span> 1st: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> )) ) : (<li className="list-item no-winner">(No 1st Place Winners)</li>)}
                   {Array.isArray(lastDraw.results.second) && lastDraw.results.second.length > 0 ? (lastDraw.results.second.map((w, i) => ( <li key={`2-${w?.ticketId || i}`} className="list-item winner winner-second"><span className="item-icon">🥈</span> 2nd: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> )) ) : (<li className="list-item no-winner">(No 2nd Place Winners)</li>)}
                   {Array.isArray(lastDraw.results.third) && lastDraw.results.third.length > 0 ? (lastDraw.results.third.map((w, i) => ( <li key={`3-${w?.ticketId || i}`} className="list-item winner winner-third"><span className="item-icon">🥉</span> 3rd: Ticket #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) won {w?.prizeShare ?? '?'} WLD</li> )) ) : (<li className="list-item no-winner">(No 3rd Place Winners)</li>)}
                 </ul>
               ) : ( <p className="no-items-message">Winner details unavailable.</p> )}
             </div>
           ) : (<p className="no-items-message">{isLoading && !error ? 'Loading results...' : 'Latest draw results not available yet.'}</p>)}
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