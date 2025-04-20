// frontend/src/App.jsx - Versión Final Funcional con Clases para Estilos

import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import './App.css'; // Importa los estilos elegantes

function App() {
  // --- Estados ---
  const [isVerified, setIsVerified] = useState(false);      // Estado normal
  const [nullifierHash, setNullifierHash] = useState(null);  // Estado normal
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
  const loadMyTickets = useCallback(async (hash) => { if (!hash) return; try { const res = await fetchMyTickets(hash); setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []); } catch (err) { console.error("Error obteniendo tickets:", err); setError("No se pudieron cargar tus boletos."); setMyTickets([]); } }, []);
  const loadResults = useCallback(async () => { setIsLoading(true); setError(''); try { const res = await fetchLatestResults(); if (res?.data?.success && res?.data?.results) { setLastDraw(res.data.results); } else { console.log("No se encontraron resultados válidos:", res?.data?.message); setLastDraw(null); } } catch (err) { console.error("Error obteniendo resultados:", err); setError("No se pudieron cargar los resultados del último sorteo."); setLastDraw(null); } finally { setIsLoading(false); } }, []);

  // --- Manejadores ---
  const handleProof = useCallback(async (proofResponse) => { setIsLoading(true); setPaymentStatus('idle'); setError(''); try { const res = await verifyWorldId(proofResponse); if (res.data.success && res.data.nullifierHash) { setNullifierHash(res.data.nullifierHash); setIsVerified(true); loadMyTickets(res.data.nullifierHash); } else { const backendError = res?.data?.message || 'Falló verificación en backend'; throw new Error(backendError); } } catch (err) { console.error("[handleProof] Error:", err); let displayError = `Error de verificación: ${err.message||'?'}`; if (err.message?.includes('already verified')) { displayError = "Ya te has verificado."; } setError(displayError); setIsVerified(false); setNullifierHash(null); } finally { setIsLoading(false); } }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { console.error("[handleError] IDKit:", errorData); setError(`Error World ID: ${errorData?.code || '?'}`); setPaymentStatus('failed'); }, []);
  const handleInitiatePayment = () => { if (!isVerified || !nullifierHash || !receiverAddress || !paymentCallbackUrlBase || !worldcoinAppId || !worldcoinActionId) { setError("Error: Datos/Config faltante."); return; } setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true); const amount = "1"; const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`; const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`; console.log("[Pay] Navegando a:", payUrl); window.location.href = payUrl; };
  const handlePaymentCallback = useCallback(async () => { const urlParams = new URLSearchParams(window.location.search); const status = urlParams.get('status'); const receivedNullifier = urlParams.get('nullifier_hash'); const txHash = urlParams.get('tx_hash'); console.log(`[Callback] S=${status}, T=${txHash?.substring(0,8)}..., N=${receivedNullifier?.substring(0,8)}...`); if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') return; if (!receivedNullifier || receivedNullifier !== nullifierHash) { window.history.replaceState({}, '', window.location.pathname); return; } window.history.replaceState({}, '', window.location.pathname); if (status === 'success' && txHash) { console.log("[Callback] Confirmando backend..."); setPaymentStatus('confirming'); setIsLoading(true); setError(''); try { const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash); if (confirmRes.data.success && confirmRes.data.ticket) { setPaymentStatus('success'); setError(''); loadMyTickets(receivedNullifier); } else { throw new Error(confirmRes.data.message || 'Fallo confirmación backend.'); } } catch (err) { console.error("[Callback] Error:", err); setError(`Error confirmando: ${err.response?.data?.message || err.message || '?'}`); setPaymentStatus('failed'); } finally { setIsLoading(false); } } else if (status === 'success' && !txHash) { setError('Callback OK pero sin tx_hash.'); setPaymentStatus('failed'); } else { setError('Pago cancelado/fallido.'); setPaymentStatus('failed'); } }, [nullifierHash, paymentStatus, loadMyTickets]);

  // --- Efectos ---
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('status') && params.has('nullifier_hash')) { if(nullifierHash) handlePaymentCallback(); else { console.warn("[useEffect Callback] Sin nullifier state."); window.history.replaceState({}, '', window.location.pathname); } } }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);

  // --- Renderizado JSX con Clases Elegantes ---
  return (
    <div className="app-container"> {/* Contenedor Principal */}
      {/* Encabezado */}
      <header className="app-header">
        <h1><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lotería <span role="img" aria-label="ticket">🎟️</span></h1>
        <p className="subtitle">¡Verifícate con World ID, paga 1 WLD y obtén tu boleto para el sorteo semanal!</p>
      </header>

      {/* Sección de Estado/Errores */}
      <section className="status-section">
        {error && <p className="message message-error">⚠️ Error: {error}</p>}
        {isLoading && <p className="message message-loading">⏳ Cargando / Procesando...</p>}
        {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Esperando confirmación en World App...</p>}
        {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirmando pago en la blockchain...</p>}
        {paymentStatus === 'success' && <p className="message message-success">✅ ¡Pago completado y boleto emitido!</p>}
      </section>

      {/* Sección Principal: Verificar o Comprar */}
      <section className="action-section card"> {/* Estilo card aplicado */}
        {!isVerified ? (
          // Si no está verificado
          <div className="action-box worldid-box">
            <h2>Paso 1: Verifícate</h2>
            <p>Necesitamos confirmar que eres un humano único.</p>
            <IDKitWidget
                app_id={worldcoinAppId || 'app_INVALID_ID'}
                action={worldcoinActionId || 'invalid_action'}
                signal={worldcoinActionId}
                handleVerify={handleProof}
                onError={handleError}
                credential_types={['orb', 'phone']}
            >
              {({ open }) => <button onClick={open} disabled={isLoading || !worldcoinAppId || !worldcoinActionId} className="button button-primary button-worldid">Verificar con World ID</button>}
            </IDKitWidget>
            {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error Config.</p>}
          </div>
        ) : (
           // Si ya está verificado
          <div className="action-box purchase-box">
            <h2>Paso 2: ¡Compra tu Boleto!</h2>
            <p className="verified-text">✅ Verificado ({nullifierHash?.substring(0,8)}...).</p>
            {paymentStatus !== 'success' ? (
                <button
                    onClick={handleInitiatePayment}
                    disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'}
                    className="button button-primary button-buy" // Botón de compra
                >
                    Comprar Boleto (1 WLD) <span role="img" aria-label="money">💸</span>
                </button>
            ) : (
                 // Si ya compró exitosamente
                <p className="message message-success">¡Ya tienes tu boleto para esta semana!</p>
            )}
          </div>
        )}
      </section>

      {/* Sección Mis Boletos */}
      {isVerified && ( // Mostrar solo si está verificado
        <section className="tickets-section card">
          <h2>Mis Boletos (Semana Actual)</h2>
          {Array.isArray(myTickets) && myTickets.length > 0 ? (
            <ul className="ticket-list">
              {myTickets.map(ticket => (
                <li key={ticket?.id || Math.random()} className="ticket-item">
                  <span role="img" aria-label="ticket icon">🎫</span> {Array.isArray(ticket?.numbers) ? ticket.numbers.join(' - ') : 'N/A'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-items-message">No hay boletos.</p>
          )}
        </section>
      )}

      {/* Sección Resultados */}
      <section className="results-section card">
         <h2>Resultados Último Sorteo ({lastDraw?.drawWeek?.replace('-W',' / S ')||'N/A'})</h2>
         {lastDraw && Array.isArray(lastDraw.winningNumbers) ? (
           <div className="draw-details">
             <p><strong>Números Ganadores:</strong> <span className="winning-numbers">{lastDraw.winningNumbers.join(' - ')}</span></p>
             <p><strong>Pozo Total:</strong> {lastDraw.potWld || 0} WLD</p>
             <h3>Ganadores:</h3>
             {lastDraw.results ? (
               <ul className="winners-list">
                 {Array.isArray(lastDraw.results.first) && lastDraw.results.first.length > 0 ? (
                   lastDraw.results.first.map((w, i) => ( <li key={`1-${w?.ticketId || i}`} className="winner winner-first">🥇 1ro: #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) ganó {w?.prizeShare ?? '?'} WLD</li> ))
                 ) : (<li className="no-winner">(No 1ro)</li>)}
                 {Array.isArray(lastDraw.results.second) && lastDraw.results.second.length > 0 ? (
                   lastDraw.results.second.map((w, i) => ( <li key={`2-${w?.ticketId || i}`} className="winner winner-second">🥈 2do: #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) ganó {w?.prizeShare ?? '?'} WLD</li> ))
                 ) : (<li className="no-winner">(No 2do)</li>)}
                 {Array.isArray(lastDraw.results.third) && lastDraw.results.third.length > 0 ? (
                    lastDraw.results.third.map((w, i) => ( <li key={`3-${w?.ticketId || i}`} className="winner winner-third">🥉 3ro: #{w?.ticketId || '?'} ({w?.nullifierHash?.substring(0,8)}...) ganó {w?.prizeShare ?? '?'} WLD</li> ))
                 ) : (<li className="no-winner">(No 3ro)</li>)}
               </ul>
             ) : ( <p className="no-items-message">Info ganadores no disp.</p> )}
           </div>
         ) : (
           <p className="no-items-message">{isLoading && !error ? 'Cargando...' : 'Resultados no disponibles aún.'}</p>
         )}
       </section>

      {/* Footer */}
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Golden Ticket Lotería. Buena suerte!</p>
      </footer>
    </div>
  );
}

export default App;