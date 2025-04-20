// frontend/src/services/api.js
import axios from 'axios';

// Lee la URL base de la API del backend desde las variables de entorno VITE
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Envía el proof de World ID al backend para verificación.
 * @param {object} proofResponse - El objeto proof devuelto por IDKit.
 * @returns {Promise<object>} - La respuesta de la API del backend.
 */
export const verifyWorldId = (proofResponse) => {
  console.log("API Call: Verificando World ID");
  return apiClient.post('/verify', { proofResponse }); // Envía el proof dentro de un objeto
};

/**
 * Envía el txHash y nullifierHash al backend para confirmar el pago on-chain.
 * @param {string} nullifierHash - El hash nulo del usuario verificado.
 * @param {string} txHash - El hash de la transacción de pago.
 * @returns {Promise<object>} - La respuesta de la API del backend.
 */
export const confirmPaymentOnBackend = (nullifierHash, txHash) => {
  console.log(`API Call: Confirmando pago - Tx: ${txHash.substring(0,10)}..., Nullifier: ${nullifierHash.substring(0,10)}...`);
  return apiClient.post('/confirm-payment', { nullifierHash, txHash });
};

/**
 * Obtiene los boletos del usuario para una semana específica (o la actual por defecto).
 * @param {string} nullifierHash - El hash nulo del usuario.
 * @param {string} [week] - Opcional. La semana del sorteo (ej: '2024-W30').
 * @returns {Promise<object>} - La respuesta de la API del backend.
 */
export const fetchMyTickets = (nullifierHash, week = null) => {
  console.log(`API Call: Obteniendo tickets - Nullifier: ${nullifierHash.substring(0,10)}..., Week: ${week || 'actual'}`);
  // Los parámetros GET se pasan en el objeto 'params' de Axios
  return apiClient.get('/tickets', { params: { nullifierHash, week } });
};

/**
 * Obtiene los resultados del último sorteo completado.
 * @returns {Promise<object>} - La respuesta de la API del backend.
 */
export const fetchLatestResults = () => {
  console.log("API Call: Obteniendo últimos resultados");
  return apiClient.get('/results/latest');
};