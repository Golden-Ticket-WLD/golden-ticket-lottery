// backend/src/services/worldcoinService.js - Usando Axios para llamar API v1

const axios = require('axios'); // Asegúrate de tener axios instalado (npm install axios)

const WORLDCOIN_API_BASE_URL = 'https://developer.worldcoin.org/api/v1';

async function verifyWorldIdProof(proofData /*, signal = ''*/) {
  const { merkle_root, nullifier_hash, proof } = proofData;
  const app_id = process.env.WORLDCOIN_APP_ID;
  const action_id = process.env.WORLDCOIN_ACTION_ID;

  // --- Validación de configuración y datos ---
  if (!app_id || !action_id || !merkle_root || !nullifier_hash || !proof) {
    const errorMsg = 'Faltan datos de configuración o del proof para la verificación.';
    console.error(`[verifyWorldIdProof] Error: ${errorMsg}`, { proofData: {...proofData, proof: 'OMITIDO'} });
    return { success: false, error: errorMsg };
  }

  const verificationUrl = `${WORLDCOIN_API_BASE_URL}/verify/${app_id}`;
  const payload = {
      merkle_root: merkle_root,
      nullifier_hash: nullifier_hash,
      proof: proof,
      action: action_id,      // El 'action' para la API v1
      signal: action_id,      // Usar action_id como signal consistentemente
      verification_level: 'orb' // Requerir Orb (o 'device' si prefieres)
  };

  console.log(`[verifyWorldIdProof] Enviando a Worldcoin API (v1) con Axios:`);
  console.log(`  -> URL: ${verificationUrl}`);
  console.log(`  -> Payload: ${JSON.stringify({...payload, proof: 'PROOF_OMITIDO_EN_LOG'}, null, 2)}`);

  try {
    // Realizar la petición POST con Axios
    const response = await axios.post(verificationUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000 // Timeout de 20 segundos
    });

    // Analizar respuesta
    if (response.status === 200 && response.data?.nullifier_hash === nullifier_hash) {
        console.log(`[verifyWorldIdProof] Verificación EXITOSA para Nullifier: ${response.data.nullifier_hash}`);
        return { success: true, nullifierHash: response.data.nullifier_hash };
    } else {
         const errorCode = response.data?.code || (response.status === 200 ? 'verification_logic_failed' : 'api_error');
         const errorDetail = response.data?.detail || `Respuesta inesperada o nullifier no coincide (Status: ${response.status || 200})`;
         console.warn(`[verifyWorldIdProof] Verificación FALLIDA: Código=${errorCode}, Detalle=${errorDetail}`);
         // Devolver el detalle específico de la API
         return { success: false, error: `Error de comunicación con la API (${response.status || 200}): ${errorDetail}` };
    }

  } catch (error) {
    // --- Manejo de Errores de Axios ---
    let status = 'AXIOS_ERROR';
    let message = error.message;
    let errorDetail = 'Error desconocido';

    if (error.response) { // Error con respuesta del servidor (4xx, 5xx)
      status = error.response.status;
      errorDetail = error.response.data?.detail || JSON.stringify(error.response.data) || 'Error sin detalle.';
      message = `Error de comunicación con la API (${status}): ${errorDetail}`; // Usar detalle de API
      console.error(`[verifyWorldIdProof] Error de API (${status}) - Detalle: ${errorDetail}`);
    } else if (error.request) { // Error de red
      status = 'NETWORK_ERROR';
      message = `Error de red o timeout al contactar la API de Worldcoin: ${error.message}`;
      console.error(`[verifyWorldIdProof] Error de red/timeout:`, error.message);
    } else { // Otro error
      message = `Error al configurar la petición Axios: ${error.message}`;
      console.error(`[verifyWorldIdProof] Error de configuración Axios:`, error.message);
    }
    return { success: false, error: message }; // Devolver el mensaje de error más útil
  }
}

module.exports = {
  verifyWorldIdProof
};