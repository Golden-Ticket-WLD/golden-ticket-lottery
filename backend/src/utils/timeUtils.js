// backend/src/utils/timeUtils.js

const moment = require('moment-timezone');

const TIMEZONE = "America/Bogota"; // Zona horaria de Colombia

/**
 * Obtiene la cadena que identifica la semana actual del sorteo.
 * La semana empieza Lunes 01:00 AM y termina Domingo 7:00 PM.
 * Formato: 'YYYY-WNN' (ej: '2024-W30')
 * @returns {string} La cadena de la semana actual del sorteo.
 */
function getCurrentDrawWeek() {
  const now = moment().tz(TIMEZONE);
  // Si es Domingo después de las 7 PM (19:00), ya contamos como la *próxima* semana ISO
  if (now.day() === 0 && now.hour() >= 19) {
     // Sumamos un día para asegurar que moment().format() calcule la semana ISO correcta
     return now.add(1, 'day').format('YYYY-[W]WW');
  }
  // Si es Lunes antes de la 1 AM (01:00), aún pertenece a la semana anterior ISO que acaba de cerrar.
  // Para fines de *participación*, queremos la semana ISO que *empezó* este Lunes o que está por empezar.
  // La función format('YYYY-[W]WW') de moment por defecto usa la semana ISO (Lunes-Domingo)
  return now.format('YYYY-[W]WW');
}

/**
 * Obtiene la cadena que identifica la semana del sorteo ANTERIOR.
 * @returns {string} La cadena de la semana anterior del sorteo.
 */
function getPreviousDrawWeek() {
    const now = moment().tz(TIMEZONE);
    // Si es Domingo después de las 7 PM, la semana que acaba de terminar es la actual ISO.
    if (now.day() === 0 && now.hour() >= 19) {
        return now.format('YYYY-[W]WW');
    }
    // Si no, es la semana ISO anterior.
    return now.subtract(1, 'week').format('YYYY-[W]WW');
}

/**
 * Verifica si ya ha pasado la hora del sorteo (Domingo 7 PM) para una semana dada.
 * @param {string} drawWeek - La semana del sorteo en formato 'YYYY-WNN'.
 * @returns {boolean} - True si la hora del sorteo ya pasó, false si no.
 */
function isDrawTimePassed(drawWeek) {
    try {
        // Convertir la semana 'YYYY-WNN' al Domingo de esa semana
        const weekMoment = moment(drawWeek, 'YYYY-[W]WW').tz(TIMEZONE);
        // El fin de la semana ISO es el Domingo. Establecemos la hora a las 19:00.
        const drawMoment = weekMoment.endOf('isoWeek').set({ hour: 19, minute: 0, second: 0, millisecond: 0 });
        // Comparamos con la hora actual
        return moment().tz(TIMEZONE).isAfter(drawMoment);
    } catch (error) {
         console.error(`Error calculando si pasó el tiempo del sorteo para ${drawWeek}:`, error);
         return false; // Asumir que no pasó si hay error
    }
}


module.exports = {
    getCurrentDrawWeek,
    getPreviousDrawWeek,
    isDrawTimePassed,
    TIMEZONE
};