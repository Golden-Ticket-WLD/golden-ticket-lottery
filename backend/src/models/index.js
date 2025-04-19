// backend/src/models/index.js

'use strict';

const fs = require('fs');          // Módulo para interactuar con el sistema de archivos
const path = require('path');      // Módulo para manejar rutas de archivos
const Sequelize = require('sequelize'); // Importa la librería Sequelize
// require('dotenv').config(); // No necesitas cargar dotenv aquí si ya lo haces en server.js y database.js

const basename = path.basename(__filename); // Obtiene el nombre de este archivo (index.js)
const env = process.env.NODE_ENV || 'development'; // Determina el entorno (development o production)
// Carga la configuración de la base de datos desde el archivo que creamos
const config = require(__dirname + '/../config/database.js')[env];
const db = {}; // Objeto para guardar nuestros modelos y conexión

let sequelize;
// Crea la instancia de Sequelize, usando la URL de conexión si está definida (preferido en producción)
// o los parámetros individuales en otro caso (útil para desarrollo)
if (config.use_env_variable) {
  // Si la config de database.js dice que usemos DATABASE_URL (para producción)
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // Si no, usa los parámetros individuales (para desarrollo)
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// --- Carga dinámica de todos los modelos en esta carpeta ---
fs
  .readdirSync(__dirname) // Lee todos los archivos en el directorio actual (models/)
  .filter(file => {
    // Filtra para quedarse solo con archivos .js que NO sean este mismo (index.js)
    // y que no empiecen con un punto (archivos ocultos)
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1 // Excluye archivos de test si los hubiera
    );
  })
  .forEach(file => {
    // Para cada archivo de modelo encontrado (.js)...
    // Importa la definición del modelo (que debería exportar una función)
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    // Guarda el modelo en nuestro objeto 'db' usando su nombre como clave
    db[model.name] = model;
  });

// --- Configuración de Asociaciones (si las hubiera) ---
// Si tuvieras relaciones entre tablas (ej: un Usuario tiene muchos Tickets),
// aquí es donde llamarías a los métodos `associate` de cada modelo.
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// --- Exportar la conexión y los modelos ---
db.sequelize = sequelize; // Exporta la instancia de conexión de Sequelize
db.Sequelize = Sequelize; // Exporta la clase Sequelize misma (útil a veces)

// Función para verificar conexión (opcional, pero la usamos en server.js)
db.connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión Sequelize a la base de datos verificada.');
    } catch (error) {
        console.error('Error al autenticar conexión Sequelize:', error);
        throw error; // Relanzar el error para que server.js lo maneje
    }
};

module.exports = db; // Exporta el objeto 'db' con todo configurado