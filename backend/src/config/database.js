// backend/src/config/database.js
require('dotenv').config(); // Carga .env desde el directorio actual (backend/)

// Configuración para diferentes entornos (desarrollo, producción)
module.exports = {
  // Configuración para cuando desarrollas en tu máquina local
  development: {
    username: process.env.DB_USER,         // Usuario de tu BD (del .env)
    password: process.env.DB_PASSWORD,     // Contraseña de tu BD (del .env)
    database: process.env.DB_NAME,         // Nombre de tu BD (del .env)
    host: process.env.DB_HOST,             // Dirección de tu BD (del .env, ej: localhost o Supabase)
    port: process.env.DB_PORT || 5432,     // Puerto de tu BD (del .env, por defecto 5432 para Postgres)
    dialect: 'postgres',                  // Le decimos que usamos PostgreSQL
    dialectOptions: {                     // Opciones específicas para Postgres
      ssl: process.env.DB_SSL === 'true' ? { // Habilitar SSL si la variable DB_SSL es 'true' en .env
        require: true,
        rejectUnauthorized: false // Necesario para algunas DB en la nube como Render/Supabase
      } : false
    }
  },
  // Configuración para cuando despliegues la app en producción (ej. en Render)
  production: {
     // Render y otros servicios suelen configurar esta variable automáticamente
     use_env_variable: 'DATABASE_URL',
     dialect: 'postgres',
     dialectOptions: {
       ssl: { // Casi siempre necesitarás SSL en producción
         require: true,
         rejectUnauthorized: false // Ajusta si tu proveedor de BD lo requiere diferente
       }
     },
     logging: false // No mostrar cada comando SQL en los logs de producción
  }
};