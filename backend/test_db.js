// backend/test_db.js
require('dotenv').config(); // Carga las variables de .env
const { Client } = require('pg'); // Importa el cliente de PostgreSQL

// Lee la URL de conexión directamente desde el archivo .env
const connectionString = process.env.DATABASE_URL;

// Verifica si la URL se cargó correctamente
if (!connectionString) {
  console.error('ERROR: No se pudo leer DATABASE_URL desde el archivo .env');
  console.error('Asegúrate de que el archivo .env exista en la carpeta backend/ y tenga la variable DATABASE_URL definida correctamente.');
  process.exit(1); // Termina el script si no hay URL
}

console.log(`Intentando conectar a: ${connectionString.split('@')[1] || 'URL inválida'}`); // Muestra a dónde intenta conectar (ocultando user/pass)
console.log(`Usando SSL: ${connectionString.includes('ssl=true')}`); // Confirma si SSL está en la URL

// Crea un nuevo cliente con la URL de conexión
// La librería 'pg' automáticamente usa SSL si la URL contiene ?ssl=true
const client = new Client({
  connectionString: connectionString,
  // Puedes añadir explícitamente ssl si tienes problemas, aunque ?ssl=true debería bastar
  // ssl: {
  //   rejectUnauthorized: false // Necesario para Render/Supabase usualmente
  // }
});

async function testConnection() {
  try {
    await client.connect(); // Intenta conectar
    console.log('¡CONEXIÓN EXITOSA a la base de datos!');
    // Opcional: hacer una consulta simple
    const res = await client.query('SELECT NOW()');
    console.log('Hora actual de la base de datos:', res.rows[0].now);
  } catch (err) {
    console.error('-------------------------------------');
    console.error('¡ERROR DE CONEXIÓN A LA BASE DE DATOS!');
    console.error('-------------------------------------');
    console.error('Detalles del error:', err.message); // Muestra el mensaje de error específico
    console.error('---');
    console.error('Posibles causas:');
    console.error('1. ¿Son correctos el usuario, contraseña, host, puerto y nombre de BD en la DATABASE_URL del archivo .env?');
    console.error('2. ¿Termina la DATABASE_URL con "?ssl=true"? (Necesario para Render)');
    console.error('3. ¿Está la base de datos en Render realmente "Available"?');
    console.error('4. ¿Hay algún firewall bloqueando la conexión saliente al puerto 5432?');
  } finally {
    await client.end(); // Cierra la conexión, haya funcionado o no
    console.log('Conexión cerrada.');
  }
}

testConnection(); // Ejecuta la función de prueba