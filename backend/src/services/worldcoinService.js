// backend/src/services/worldcoinService.js - Usando Axios (más estable para el error Merkle Root)

const axios = require('axios');

const WORLDCOIN_API_BASE_URL = 'https://developer.worldcoin.org/api/v1';

async function verifyWorldIdProof(proofData /*, signal = ''*/) {
  const { merkle_root, nullifier_hash, proof } = proofData;
  const app_id = process.env.WORLDCOIN_APP_ID;
  const action_id = process.env.WORLDCOIN_ACTION_ID;

  if (!app_id || !action_id || !merkle_root || !nullifier_hash || !proof) {
    const errorMsg = 'Faltan datos config/proof.';
    console.error(`[verifyWorldIdProof] Error: ${errorMsg}`); return { success: false, error: errorMsg };
  }

  const verificationUrl = `${WORLDCOIN_API_BASE_URL}/verify/${app_id}`;
  const payload = {
      merkle_root: merkle_root, nullifier_hash: nullifier_hash, proof: proof,
      action: action_id, signal: action_id, verification_level: 'orb'
  };

  console.log(`[verifyWorldIdProof] Enviando a Worldcoin API (v1) con Axios:`); console.log(`  -> URL: ${verificationUrl}`); console.log(`  -> Payload: ${JSON.stringify({...payload, proof: 'OMITIDO_EN_LOG'}, null, 2)}`);

  try {
    const response = await axios.post(verificationUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });

    if (response.status === 200 && response.data?.nullifier_hash === nullifier_hash) {
        console.log(`[verifyWorldIdProof] Verificación EXITOSA (Axios) Nullifier: ${response.data.nullifier_hash}`); return { success: true, nullifierHash: response.data.nullifier_hash };
    } else {
         const errorDetail = response.data?.detail || `Respuesta inesperada/nullifier no coincide (Status: ${response.status || 200})`;
         const errorCode = response.data?.code || '...'; console.warn(`[verifyWorldIdProof] Verificación FALLIDA: Código=${errorCode}, Detalle=${errorDetail}`); return { success: false, error: `Error API (${response.status}): ${errorDetail}` };
    }
  } catch (error) {
      let status = '...'; let message = '...'; let errorDetail = '...';
      if (error.response) { status = error.response.status; errorDetail = error.response.data?.detail || JSON.stringify(error.response.data) || '...'; message = `Error API (${status}): ${errorDetail}`; console.error(`[verifyWorldIdProof] Error API Axios (${status}): ${errorDetail}`);}
      else if (error.request) { message = `Error Red/Timeout Axios...`; console.error(`[verifyWorldIdProof] Error Red/Timeout Axios`); }
      else { message = `Error Axios Config...`; console.error(`[verifyWorldIdProof] Error Axios Config`);}
      return { success: false, error: message };
  }
}
module.exports = { verifyWorldIdProof };