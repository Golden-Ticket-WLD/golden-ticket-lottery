// backend/src/config/database.js - CORREGIDO: Parseando DATABASE_URL manualmente en prod

// Importar módulo 'url' nativo de Node.js para parsear la URL de la base de datos
const url = require('url');

// Cargar variables .env SOLO para desarrollo local
// En producción (Render), las variables se establecen en la plataforma.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); // Busca .env en el directorio actual (backend/) por defecto
    // Log opcional para desarrollo
    // console.log(`DB Config [Dev]: Leyendo DB_USER: '${process.env.DB_USER}'`);
}

// --- Preparar configuración de Producción ---
const productionDbUrl = process.env.DATABASE_URL; // Obtener la URL de Render
let productionConfig = {}; // Objeto para la configuración parseada

if (productionDbUrl) { // Solo si la variable DATABASE_URL existe
    try {
        const parsedUrl = url.parse(productionDbUrl); // Parsear la URL completa
        const auth = parsedUrl.auth ? parsedUrl.auth.split(':') : [null, null]; // Separar usuario:contraseña

        productionConfig = {
            username: auth[0],                    // Usuario extraído
            password: auth[1],                    // Contraseña extraída
            database: parsedUrl.pathname.split('/')[1], // Nombre de BD (quitar '/')
            host: parsedUrl.hostname,             // Host extraído
            port: parsedUrl.port,                 // Puerto extraído
            dialect: 'postgres',                 // Indicar que es PostgreSQL
            // Aplicar las opciones SSL cruciales explícitamente
            dialectOptions: {
                ssl: {
                    require: true,              // Requerir conexión SSL
                    rejectUnauthorized: false   // Aceptar certificados autofirmados (Render)
                }
            },
            // Desactivar logs SQL detallados en producción
            logging: false
        };
        console.log(`DB Config [Prod]: Configuración parseada OK desde DATABASE_URL (Host: ${productionConfig.host})`);

    } catch (e) {
        console.error("DB Config [Prod]: !!! ERROR CRÍTICO parseando DATABASE_URL !!!", e);
        // Dejar productionConfig vacío o con error causará fallo al iniciar servidor
        productionConfig = { error: 'Failed to parse DATABASE_URL' };
    }
} else if (process.env.NODE_ENV === 'production') {
    // Esto no debería pasar en Render si la BD está vinculada
    console.error("DB Config [Prod]: !!! ERROR CRÍTICO - Entorno es 'production' pero DATABASE_URL no está definida !!!");
    productionConfig = { error: 'DATABASE_URL no definida en producción' };
}


// --- Exportar las configuraciones para ambos entornos ---
module.exports = {
  development: {
    // Configuración para DESARROLLO (se lee de .env)
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      // Activar SSL solo si DB_SSL=true en .env (para pruebas locales con BD en nube)
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false
    },
    logging: console.log // Mostrar SQL en desarrollo (útil)
  },
  production: productionConfig // Usar la configuración parseada de DATABASE_URL
};