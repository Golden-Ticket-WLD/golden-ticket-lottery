// backend/src/config/database.js - Corregido con SSL explícito en producción

// Cargar variables de entorno SÓLO si el archivo existe (para desarrollo local)
// Nota: En producción (Render), las variables se setean en la plataforma, no desde un archivo .env usualmente.
// Así que dotenv es principalmente para 'development'.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config(); // Carga .env desde la raíz del backend (por defecto)
}
// Opcional: Log para verificar qué entorno se está usando y si se leyó algo de .env
// console.log(`DB Config: Usando entorno '${process.env.NODE_ENV || 'development'}'`);
// console.log(`DB Config: DB_USER leído es '${process.env.DB_USER}'`);


module.exports = {
// Configuración para DESARROLLO (tu máquina local)
development: {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432, // Usar puerto de .env o 5432 por defecto
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' // Activar SSL solo si DB_SSL=true en .env
      ? {
          require: true,
          // Esta es la clave para certificados autofirmados (como los de Render/Supabase)
          rejectUnauthorized: false
        }
      : false // Si DB_SSL no es 'true', no usar SSL
  },
  logging: console.log // Muestra logs SQL en desarrollo (útil para depurar)
                       // Puedes cambiarlo a 'false' si es mucho ruido
},

// Configuración para PRODUCCIÓN (cuando se despliega en Render)
production: {
   // Render configura automáticamente DATABASE_URL en el entorno del servicio.
   // Esta opción le dice a Sequelize que la use.
   use_env_variable: 'DATABASE_URL',
   dialect: 'postgres',
   // AÑADIMOS SSL explícitamente aquí para reforzarlo:
   ssl: true, // Forzar el uso de SSL
   dialectOptions: {
     ssl: {
       require: true,              // Requerir SSL
       rejectUnauthorized: false // <<--- MUY IMPORTANTE para aceptar certificados de Render/nube
     }
   },
   // Desactivar logs SQL en producción para no llenar los logs del servidor
   logging: false
}
};