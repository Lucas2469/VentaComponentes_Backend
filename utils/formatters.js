// utils/formatters.js

/**
 * Convierte fecha ISO (YYYY-MM-DD) a formato español (DD/MM/YYYY)
 * @param {string} fechaISO - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {string} - Fecha en formato español (DD/MM/YYYY)
 */
function formatFechaCitaISOToES(fechaISO) {
  if (!fechaISO) return '';
  
  const fecha = new Date(fechaISO);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  
  return `${dia}/${mes}/${año}`;
}

/**
 * Convierte hora de base de datos (HH:MM:SS) a formato legible (HH:MM)
 * @param {string} horaDB - Hora en formato de base de datos (HH:MM:SS)
 * @returns {string} - Hora en formato legible (HH:MM)
 */
function formatHoraCitaToHM(horaDB) {
  if (!horaDB) return '';
  
  // Si ya está en formato HH:MM, devolverlo tal como está
  if (horaDB.length === 5) return horaDB;
  
  // Si está en formato HH:MM:SS, tomar solo HH:MM
  if (horaDB.length === 8) {
    return horaDB.substring(0, 5);
  }
  
  return horaDB;
}

module.exports = {
  formatFechaCitaISOToES,
  formatHoraCitaToHM
};