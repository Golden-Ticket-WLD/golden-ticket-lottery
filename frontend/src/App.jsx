// frontend/src/App.jsx - Versión Final Completa y Funcional

import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit'; // Importar World ID Widget
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api'; // Importar funciones API
import './App.css'; // Importar los estilos

function App() {
  // --- Estados del Componente ---
  const [isVerified, setIsVerified] = useState(false);          // Estado inicial: no verificado
  const [nullifierHash, setNullifierHash] = useState(null);      // Estado inicial: null
  const [myTickets, setMyTickets] = useState([]);              // Inicializar como array vacío
  const [lastDraw, setLastDraw] = useState(null);              // Estado inicial: null
  const [isLoading, setIsLoading] = useState(false);           // Para indicadores de carga
  const [paymentStatus, setPaymentStatus] = useState('idle');    // idle, pending_worldapp, confirming, success, failed
  const [error, setError] = useState('');                      // Mensajes de error

  // --- Configuración Leída desde Variables de Entorno (.env.local) ---
  // Asegúrate de que estas variables estén definidas en tu frontend/.env.local
  const worldcoinAppId = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const worldcoinActionId = import.meta.env.VITE_WORLDCOIN_ACTION_ID; // Usado como signal también
  const receiverAddress = import.meta.env.VITE_MY_WLD_RECEIVER_ADDRESS;
  const paymentCallbackUrlBase = import.meta.env.VITE_PAYMENT_CALLBACK_URL;
  const tokenIdentifier = import.meta.env.VITE_WLD_CONTRACT_ADDRESS || "WLD"; // Usar 'WLD' o dirección del contrato si la defines en .env.local

  // --- FUNCIONES DE CARGA DE DATOS ---
  const loadMyTickets = useCallback(async (hash) => {
    if (!hash) return; // No cargar si no hay hash
    console.log("[loadMyTickets] Cargando boletos para:", hash.substring(0, 8));
    try {
      const res = await fetchMyTickets(hash); // Llama a la API backend
      // Asegurar que siempre guardamos un array
      setMyTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      console.error("Error obteniendo tickets:", err);
      setError("No se pudieron cargar tus boletos.");
      setMyTickets([]); // Resetear a array vacío en caso de error
    }
  }, []); // Sin dependencias externas que cambien

  const loadResults = useCallback(async () => {
    console.log("[loadResults] Iniciando carga de resultados...");
    setIsLoading(true); // Mostrar indicador de carga
    setError(''); // Limpiar errores previos
    try {
      const res = await fetchLatestResults(); // Llama a la API backend
      if (res?.data?.success && res?.data?.results) {
        console.log("[loadResults] Resultados recibidos:", res.data.results);
        setLastDraw(res.data.results);
      } else {
        console.log("[loadResults] No se encontraron resultados válidos:", res?.data?.message);
        setLastDraw(null); // Establecer null si no hay resultados válidos
      }
    } catch (err) {
      console.error("Error obteniendo resultados:", err);
      setError("No se pudieron cargar los resultados del último sorteo.");
      setLastDraw(null);
    } finally {
      setIsLoading(false); // Ocultar indicador de carga
    }
  }, []); // Sin dependencias externas que cambien


  // --- MANEJADORES DE EVENTOS Y CALLBACKS ---
  const handleProof = useCallback(async (proofResponse) => {
    console.log("[handleProof] Recibido proof de IDKit:", proofResponse);
    setIsLoading(true);
    setPaymentStatus('idle'); // Resetear estado de pago al verificar de nuevo
    setError('');
    try {
      // Llamar al backend para verificar el proof
      const res = await verifyWorldId(proofResponse);
      console.log(">>> [handleProof] Respuesta del backend:", res);
      if (res.data.success && res.data.nullifierHash) {
        console.log('[handleProof] Verificación Backend EXITOSA:', res.data.nullifierHash);
        console.log(">>> [handleProof] Actualizando estado: setIsVerified(true)...");
        setNullifierHash(res.data.nullifierHash); // Guardar el hash
        setIsVerified(true);                    // Marcar como verificado
        loadMyTickets(res.data.nullifierHash);  // Cargar boletos asociados a este usuario/verificación
      } else {
         // Error devuelto por nuestro backend (que ya incluye el detalle de la API)
        throw new Error(res?.data?.message || 'Falló la verificación en el backend');
      }
    } catch (err) {
      console.error("[handleProof] Error durante la verificación:", err);
      let displayError = `Error de verificación: ${err.message || 'Error desconocido'}`;
      // Detectar error específico de verificación repetida para dar mensaje más claro
      if (err.message && err.message.includes('This person has already verified for this action')) {
          displayError = "Ya te has verificado para esta acción anteriormente con este World ID.";
          // Consideramos NO marcar como verificado en este caso, ya que la petición actual falló,
          // aunque podríamos recuperarlo si fuera necesario en una lógica más compleja.
      }
      setError(displayError);
      setIsVerified(false); // Resetear estado si hubo error
      setNullifierHash(null);
    } finally {
       console.log(">>> [handleProof] Ejecutando finally, setIsLoading(false)");
       setIsLoading(false); // Ocultar indicador de carga
    }
  }, [loadMyTickets]); // Depende de loadMyTickets

  const handleError = useCallback((errorData) => {
    console.error("[handleError] Error de IDKit:", errorData);
    setError(`Error de World ID: ${errorData?.code || 'Error desconocido del widget'}`);
    // Quizás resetear paymentStatus si estaba pendiente?
    // setPaymentStatus('idle');
  }, []);

  const handleInitiatePayment = () => {
    console.log("[handleInitiatePayment] Iniciando flujo de pago...");
    if (!isVerified || !nullifierHash) { setError("Error: Debes verificar tu World ID antes."); return; }
    if (!receiverAddress || !paymentCallbackUrlBase) { setError("Error: Configuración de pago incompleta en frontend."); return; }
    if (!worldcoinAppId || !worldcoinActionId) { setError("Error: Configuración de Worldcoin incompleta en frontend."); return; }

    setError(''); setPaymentStatus('pending_worldapp'); setIsLoading(true);
    const amount = "1"; // Pagar 1 WLD
    const successCallback = `${paymentCallbackUrlBase}?status=success&nullifier_hash=${encodeURIComponent(nullifierHash)}`;
    // Construir la URL para llamar a World App
    const payUrl = `world://pay?receiver=${receiverAddress}&amount=${amount}&token=${tokenIdentifier}&callback=${encodeURIComponent(successCallback)}`;
    console.log("[handleInitiatePayment] Navegando a:", payUrl);
    // Intentar abrir el enlace (funcionará en World App, fallará en navegador de escritorio)
    window.location.href = payUrl;
    // NOTA: No ponemos setIsLoading(false) aquí porque esperamos la acción del usuario y el callback.
  };

  const handlePaymentCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const receivedNullifier = urlParams.get('nullifier_hash');
    const txHash = urlParams.get('tx_hash'); // txHash debería venir en el callback real de World App

    console.log(`[Callback] Detectado: S=${status}, T=${txHash ? txHash.substring(0,8)+'...' : 'N/A'}, N=${receivedNullifier?.substring(0,8)}...`);

    // Prevenir procesamiento múltiple o inválido
    if (paymentStatus === 'confirming' || paymentStatus === 'success' || paymentStatus === 'failed') { console.warn("[Callback] Ignorado, estado:", paymentStatus); window.history.replaceState({}, '', window.location.pathname); return; }
    if (!receivedNullifier || receivedNullifier !== nullifierHash) { console.warn("[Callback] Ignorado, nullifier no coincide/falta."); window.history.replaceState({}, '', window.location.pathname); return; }

    window.history.replaceState({}, '', window.location.pathname); // Limpiar URL

    if (status === 'success' && txHash) {
      console.log("[Callback] Éxito y TxHash OK. Confirmando backend...");
      setPaymentStatus('confirming'); setIsLoading(true); setError('');
      try {
        // Llamar al backend para que verifique on-chain y emita boleto
        const confirmRes = await confirmPaymentOnBackend(receivedNullifier, txHash);
        if (confirmRes.data.success && confirmRes.data.ticket) {
          setPaymentStatus('success'); // Éxito final
          setError('');
          console.log("[Callback] Pago confirmado, ticket:", confirmRes.data.ticket);
          loadMyTickets(receivedNullifier); // Actualizar mis boletos
        } else {
          // El backend falló la confirmación
          throw new Error(confirmRes.data.message || 'Confirmación backend falló.');
        }
      } catch (err) {
        // Error llamando a la API de confirmación o durante el proceso
        console.error("[Callback] Error confirmando:", err);
        setError(`Error confirmando pago: ${err.response?.data?.message || err.message || '?'}`);
        setPaymentStatus('failed');
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'success' && !txHash) {
      // World App dijo success pero no envió el tx_hash crucial
      console.error("[Callback] Callback exitoso pero falta tx_hash de World App.");
      setError('Callback OK pero World App no envió el hash de transacción necesario para confirmar.');
      setPaymentStatus('failed');
    } else {
       // status no es 'success', o falta
      console.log("[Callback] Callback no exitoso o status desconocido:", status);
      setError('El pago fue cancelado o falló dentro de World App.');
      setPaymentStatus('failed');
    }
  }, [nullifierHash, paymentStatus, loadMyTickets]); // Dependencias correctas


  // --- EFECTOS DE REACT ---
  // Efecto para procesar el callback de pago cuando la página carga o el usuario verifica
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('status') && params.has('nullifier_hash')) {
      console.log("[useEffect Callback Check] URL de callback detectada.");
      // Procesar solo si TENEMOS un nullifier en el estado (el usuario se verificó ANTES de volver del callback)
      if(nullifierHash) {
          console.log("[useEffect Callback Check] NullifierHash presente, procesando callback...");
          handlePaymentCallback();
      } else {
           // Esto puede pasar si el usuario fue al pago, completó, pero luego cerró/recargó la mini-app
           // antes de que el callback fuera procesado con el nullifier en estado.
          console.warn("[useEffect Callback Check] Callback detectado pero sin nullifierHash state.");
          setError("Se detectó una respuesta de pago, pero necesitas verificar tu World ID primero en esta sesión.")
          window.history.replaceState({}, '', window.location.pathname); // Limpiar URL
      }
    }
  }, [handlePaymentCallback, nullifierHash]); // Depender de nullifierHash es importante

  // Efecto para cargar los resultados del último sorteo al montar el componente
  useEffect(() => {
    loadResults();
  }, [loadResults]); // Correcto, solo depende de la función memoizada


  // --- RENDERIZADO JSX ---
  return (
    <div className="app-container"> {/* Usar clases de App.css */}
      <header className="app-header">
        <h1><span role="img" aria-label="ticket">🎟️</span> Golden Ticket Lotería <span role="img" aria-label="ticket">🎟️</span></h1>
        <p className="subtitle">¡Verifícate con World ID, paga 1 WLD y obtén tu boleto para el sorteo semanal!</p>
      </header>

      <section className="status-section">
        {error && <p className="message message-error">⚠️ Error: {error}</p>}
        {isLoading && <p className="message message-loading">⏳ Cargando / Procesando...</p>}
        {paymentStatus === 'pending_worldapp' && <p className="message message-info">📲 Esperando confirmación en World App...</p>}
        {paymentStatus === 'confirming' && <p className="message message-info">🔗 Confirmando pago en la blockchain...</p>}
        {paymentStatus === 'success' && <p className="message message-success">✅ ¡Pago completado y boleto emitido!</p>}
      </section>

      <section className="action-section card">
        {!isVerified ? (
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
          <div className="action-box purchase-box">
            <h2>Paso 2: ¡Compra tu Boleto!</h2>
            <p className="verified-text">✅ Verificado ({nullifierHash?.substring(0,8)}...).</p>
            {paymentStatus !== 'success' ? (
                <button
                    onClick={handleInitiatePayment}
                    disabled={isLoading || paymentStatus === 'pending_worldapp' || paymentStatus === 'confirming'}
                    className="button button-primary button-buy"
                >
                    Comprar Boleto (1 WLD) <span role="img" aria-label="money">💸</span>
                </button>
            ) : (
                <p className="message message-success">¡Ya tienes tu boleto para esta semana!</p>
            )}
          </div>
        )}
      </section>

      {isVerified && (
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

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Golden Ticket Lotería. Buena suerte!</p>
      </footer>
    </div>
  );
}

export default App;