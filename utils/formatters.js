// utils/formatters.js
/**
 * Formatea una fecha (YYYY-MM-DD o Date) al formato dd/MM/yyyy en español (Bolivia).
 */
function formatFechaCitaISOToES(isoDate) {
  const d = new Date(isoDate);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una hora “HH:MM:SS” al formato “HH:MM”.
 */
function formatHoraCitaToHM(horaStr) {
  if (!horaStr) return '';
  const [hh, mm] = horaStr.split(':');
  return `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}`;
}

module.exports = {
  formatFechaCitaISOToES,
  formatHoraCitaToHM
};
