// backend/src/routes/lotteryRoutes.js

const express = require('express');
const lotteryController = require('../controllers/lotteryController'); // Importamos nuestro controlador

// Creamos un nuevo enrutador de Express
const router = express.Router();

// --- Definición de las Rutas Específicas para la Lotería ---

// POST /api/lottery/verify
// Ruta para que el frontend envíe el proof de World ID para verificación.
router.post('/verify', lotteryController.verifyProof);

// POST /api/lottery/confirm-payment
// Ruta para que el frontend envíe el txHash y nullifierHash después del callback de pago,
// para que el backend verifique on-chain y emita el boleto.
router.post('/confirm-payment', lotteryController.confirmPayment);

// GET /api/lottery/tickets
// Ruta para que el frontend solicite los boletos comprados por un usuario.
// Espera el nullifierHash como query parameter (?nullifierHash=...)
router.get('/tickets', lotteryController.getMyTickets);

// GET /api/lottery/results/latest
// Ruta para que el frontend obtenga los resultados del último sorteo completado.
router.get('/results/latest', lotteryController.getLatestResults);

// --- Exportar el Enrutador ---
// Exportamos el objeto 'router' para que pueda ser usado en server.js
module.exports = router;