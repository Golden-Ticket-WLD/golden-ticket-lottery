// backend/src/services/worldcoinService.js - Usando @worldcoin/id SDK (Versión Confirmada)

// Importar desde la ruta correcta del paquete @worldcoin/id
const { verifyCloudProof } = require('@worldcoin/id/backend');

async function verifyWorldIdProof(proofData) {
  const { merkle_root, nullifier_hash, proof } = proofData;
  const app_id = process.env.WORLDCOIN_APP_ID;
  const action_id = process.env.WORLDCOIN_ACTION_ID;

  // Validación de configuración y datos
  if (!app_id) return { success: false, error: 'Configuración incompleta (APP_ID).' };
  if (!action_id) return { success: false, error: 'Configuración incompleta (ACTION_ID).' };
  if (!merkle_root || !nullifier_hash || !proof) return { success: false, error: 'Datos proof inválidos.' };

  console.log(`[verifyWorldIdProof - SDK @worldcoin/id] Verificando proof para Action: ${action_id}, Nullifier: ${nullifier_hash.substring(0,10)}...`);

  try {
    // Llamar a la función de verificación del SDK @worldcoin/id
    await verifyCloudProof(
      nullifier_hash, // Argumento 1: nullifier_hash
      merkle_root,    // Argumento 2: merkle_root
      proof,          // Argumento 3: proof
      {               // Argumento 4: Opciones
        action: action_id,
        signal: action_id, // Usar action_id como signal consistentemente
        app_id: app_id,
         // verification_level no es un parámetro directo aquí, el SDK lo maneja.
      }
    );

    // Si verifyCloudProof NO lanzó un error, la verificación fue exitosa
    console.log("[verifyWorldIdProof - SDK @worldcoin/id] Verificación SDK EXITOSA.");
    return {
      success: true,
      nullifierHash: proofData.nullifier_hash // Devolvemos el nullifier
    };

  } catch (error) {
    // El SDK lanza un error si la verificación falla
    console.error("[verifyWorldIdProof - SDK @worldcoin/id] Error durante verificación:", { code: error.code, detail: error.detail, message: error.message } ); // Log más detallado del error SDK
    let errorMessage = error.detail || error.message || 'Error desconocido durante la verificación con el SDK.'; // Priorizar 'detail' si existe
    if(error.code){ // Añadir código de error del SDK si existe
        errorMessage = `Error SDK (${error.code}): ${errorMessage}`;
    }
    return { success: false, error: errorMessage };
  }
}

module.exports = {
  verifyWorldIdProof
};