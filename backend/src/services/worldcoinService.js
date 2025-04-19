// backend/src/services/worldcoinService.js

const axios = require('axios');

// La URL base de la API de desarrollador de Worldcoin
// Consulta la documentación oficial por si cambia, pero esta es la estándar v1
const WORLDCOIN_API_BASE_URL = 'https://developer.worldcoin.org/api/v1';

/**
 * Verifica un proof de World ID usando la API del Developer Portal.
 * @param {object} proofData - El objeto proof recibido de IDKit.
 * @param {string} proofData.merkle_root - La raíz de Merkle del proof.
 * @param {string} proofData.nullifier_hash - El hash nulo del proof.
 * @param {string} proofData.proof - La prueba ZKP codificada.
 * @param {string} [signal=''] - (Opcional) La señal usada al generar el proof (si aplica).
 * @returns {Promise<{success: boolean, nullifierHash?: string, error?: string}>} - Resultado de la verificación.
 */
async function verifyWorldIdProof(proofData, signal = '') {
  const { merkle_root, nullifier_hash, proof } = proofData;
  const app_id = process.env.WORLDCOIN_APP_ID; // Tu App ID desde .env
  const action_id = process.env.WORLDCOIN_ACTION_ID; // Tu Action ID desde .env

  // --- Validación básica de entrada ---
  if (!app_id) {
    console.error("Error: WORLDCOIN_APP_ID no está definido en .env");
    return { success: false, error: 'Configuración del servidor incompleta (App ID).' };
  }
  if (!action_id) {
      console.error("Error: WORLDCOIN_ACTION_ID no está definido en .env");
      return { success: false, error: 'Configuración del servidor incompleta (Action ID).' };
  }
  if (!merkle_root || !nullifier_hash || !proof) {
    console.error("Error: Datos del proof incompletos recibidos.");
    return { success: false, error: 'Datos del proof inválidos o incompletos.' };
  }
  // --- Fin Validación ---

  // Construye la URL del endpoint de verificación
  // La URL incluye el app_id como parte de la ruta
  const verificationUrl = `${WORLDCOIN_API_BASE_URL}/verify/${app_id}`;

  console.log(`Verificando proof para Action ID: ${action_id} y Nullifier: ${nullifier_hash.substring(0,10)}...`);

  try {
    // Realiza la petición POST a la API de Worldcoin
    const response = await axios.post(verificationUrl, {
      merkle_root: merkle_root,
      nullifier_hash: nullifier_hash,
      proof: proof,
      action: action_id, // La API v1 usa 'action' en lugar de 'action_id' en el body
      signal: signal || '', // Asegura que siempre sea un string
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Nota: La API v1 generalmente no requiere una API Key separada para /verify
        // La autenticación se basa en el app_id en la URL.
      }
    });

    // La API devuelve 200 OK tanto para éxito como para fallo,
    // necesitas verificar el contenido de la respuesta.
    // Un éxito usualmente devuelve el nullifier_hash confirmado.
    if (response.status === 200 && response.data && response.data.nullifier_hash === nullifier_hash) {
      console.log(`Verificación de World ID EXITOSA para Nullifier: ${response.data.nullifier_hash}`);
      return {
        success: true,
        nullifierHash: response.data.nullifier_hash
      };
    } else {
      // La verificación falló en la API de Worldcoin (proof inválido, acción no coincide, etc.)
      const errorCode = response.data?.code || 'verification_failed';
      const errorDetail = response.data?.detail || 'Motivo desconocido desde la API.';
      console.warn(`Verificación de World ID FALLIDA: Código=${errorCode}, Detalle=${errorDetail}`);
      return { success: false, error: `Fallo en la API de Worldcoin (${errorCode}): ${errorDetail}` };
    }
  } catch (error) {
    // Error de red o error inesperado al llamar a la API
    console.error('Error llamando a la API de verificación de Worldcoin:', error.response ? JSON.stringify(error.response.data) : error.message);
    const status = error.response?.status || 'NETWORK_ERROR';
    const message = error.response?.data?.detail || error.message;
    return { success: false, error: `Error de comunicación con la API (${status}): ${message}` };
  }
}

// Exporta la función para que otros archivos puedan usarla
module.exports = {
  verifyWorldIdProof
};