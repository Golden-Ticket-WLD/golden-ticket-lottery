// frontend/src/App.jsx - Probando credential_types: ['orb']

import React, { useState, useEffect, useCallback } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { verifyWorldId, confirmPaymentOnBackend, fetchMyTickets, fetchLatestResults } from './services/api';
import './App.css';

function App() {
  // --- Estados, Config, Funciones (sin cambios respecto a la última versión funcional) ---
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
  const loadMyTickets = useCallback(async (hash) => { /* ... */ }, []);
  const loadResults = useCallback(async () => { /* ... */ }, []);
  const handleProof = useCallback(async (proofResponse) => { /* ... */ }, [loadMyTickets]);
  const handleError = useCallback((errorData) => { /* ... */ }, []);
  const handleInitiatePayment = () => { /* ... */ };
  const handlePaymentCallback = useCallback(async () => { /* ... */ }, [nullifierHash, paymentStatus, loadMyTickets]);
  useEffect(() => { /* ... */ }, [handlePaymentCallback, nullifierHash]);
  useEffect(() => { loadResults(); }, [loadResults]);

  // --- RENDERIZADO JSX ---
  return (
    <div className="App container">
      {/* ... header ... */}
       <header> <h1>🎟️ Golden Ticket Lotería 🎟️</h1> <p>¡Verifícate con World ID, paga 1 WLD y obtén tu boleto para el sorteo semanal!</p> </header>

      {/* ... status-section ... */}
      <section className="status-section"> {error && <p className="error-message">⚠️ Error: {error}</p>} {isLoading && <p className="loading-message">⏳ Cargando / Procesando...</p>} {paymentStatus === 'pending_worldapp' && <p className="info-message">📲 Esperando confirmación en World App...</p>} {paymentStatus === 'confirming' && <p className="info-message">🔗 Confirmando pago en la blockchain...</p>} {paymentStatus === 'success' && <p className="success-message">✅ ¡Pago completado y boleto emitido!</p>} </section>

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
                credential_types={['orb', 'phone']} // O solo ['orb'] si prefieres
                enable_telemetry={false}
                // --- FIN CAMBIO ---
            >
              {({ open }) => <button onClick={open} disabled={isLoading || !worldcoinAppId || !worldcoinActionId} className="button button-primary button-worldid">Verificar con World ID</button>}
            </IDKitWidget>
            {(!worldcoinAppId || !worldcoinActionId) && <p className="message message-error-inline">Error Config.</p>}
          </div>
        ) : (
           <div className="action-box purchase-box">
               {/* ... (sección de compra igual que antes) ... */}
                 <h2>Paso 2: ¡Compra tu Boleto!</h2> <p className="verified-text">✅ Verificado ({nullifierHash?.substring(0,8)}...).</p> {paymentStatus!=='success'?(<button onClick={handleInitiatePayment} disabled={isLoading||paymentStatus==='pending_worldapp'||paymentStatus==='confirming'} className="button button-primary button-buy">Comprar (1 WLD) <span role="img" aria-label="money">💸</span></button>):(<p className="message message-success">¡Ya tienes tu boleto!</p>)}
           </div>
        )}
      </section>

       {/* ... tickets-section ... */}
       {isVerified && ( <section className="tickets-section card"> {/* ... */} </section> )}
       {/* ... results-section ... */}
       <section className="results-section card"> {/* ... */} </section>
        {/* ... footer ... */}
        <footer className="app-footer"> <p>© {new Date().getFullYear()} Golden Ticket Lotería. Buena suerte!</p> </footer>
    </div>
  );
}

export default App;