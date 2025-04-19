// backend/src/server.js

require('dotenv').config(); // Carga las variables de entorno desde .env
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment-timezone');

// Importar Servicios y Rutas (los crearemos pronto)
const lotteryRoutes = require('./routes/lotteryRoutes');
const drawService = require('./services/drawService');
const { connectDB, sequelize } = require('./models'); // Asumiendo que models/index.js exporta la conexión

// --- Inicialización de Express ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
// Habilitar CORS para peticiones desde el origen especificado en .env
app.use(cors({ origin: process.env.CORS_ORIGIN }));
// Permitir que Express entienda JSON en el cuerpo de las peticiones
app.use(express.json());

// --- Rutas de la API ---
app.get('/api/health', (req, res) => { // Ruta simple para verificar que el servidor está vivo
  res.json({ status: 'OK', time: new Date() });
});
app.use('/api/lottery', lotteryRoutes); // Prefijo para todas las rutas de la lotería

// --- Programador del Sorteo Semanal (Cron Job) ---
// Se ejecuta cada Domingo a las 19:00:00 (7:00 PM) hora Colombia (America/Bogota)
cron.schedule('0 19 * * SUN', async () => {
  const timestamp = moment().tz("America/Bogota").format();
  console.log(`[${timestamp}] Iniciando tarea programada del sorteo semanal...`);
  try {
    await drawService.performWeeklyDraw();
    console.log(`[${timestamp}] Tarea del sorteo semanal completada exitosamente.`);
  } catch (error) {
    console.error(`[${timestamp}] ERROR ejecutando la tarea del sorteo semanal:`, error);
  }
}, {
  scheduled: true,
  timezone: "America/Bogota"
});

// --- Manejo de Errores Genérico (Middleware Final) ---
// (Se ejecutará si ninguna ruta anterior manejó la petición o si hubo un error)
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// --- Iniciar Servidor ---
const startServer = async () => {
    try {
        // (Opcional pero recomendado) Verificar conexión a BD antes de iniciar
        // await connectDB(); // Necesitas crear esta función en models/index.js o similar
        await sequelize.authenticate(); // Método de Sequelize para verificar conexión
        console.log('Conexión a la base de datos establecida correctamente.');

        app.listen(PORT, () => {
            console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
            console.log(`Hora actual en Bogotá: ${moment().tz("America/Bogota").format()}`);
            console.log(`El sorteo se ejecutará los Domingos a las 7:00 PM (Hora Colombia).`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor o conectar a la BD:', error);
        process.exit(1); // Salir si no se puede conectar a la BD
    }
};

startServer(); // Llama a la función para iniciar todo