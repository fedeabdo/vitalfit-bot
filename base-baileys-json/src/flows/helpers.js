const { createApiClient } = require('../utils/apiClient');

// Validation helpers
const validateDeleteCedulaMessage = (message) => {
  if (!message || message.trim() === '') return '❌ El mensaje no puede estar vacío. Por favor, incluye la cédula.';
  if (!/^borrar\s+\d{6,}$/i.test(message.trim())) return '❌ El mensaje debe tener el formato: BORRAR <cédula> (sin caracteres especiales, todo junto).';
  return null;
};

const validateConsultaMessage = (message) => {
  if (!message || message.trim() === '') return 'Mensaje incompleto. Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678';
  if (!/^consulta\s+\d{6,}$/i.test(message.trim())) return 'Mensaje incompleto. Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678';
  return null;
};

const validateReservaMessage = (message) => {
  if (!message || message.trim() === '') return '❌ El mensaje no puede estar vacío. Por favor, incluye una hora y una cédula.';
  const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;
  if (!timeRegex.test(message)) return '❌ Debes incluir una hora válida en formato 24 horas (por ejemplo, 20:30).';
  const numberRegex = /\b\d+$/;
  if (!numberRegex.test(message)) return '❌ La cédula debe escribirse en un formato válido (sin caracteres especiales, todo junto).';
  return null;
};

const extractErrorMessage = (error) => {
  if (error.response && error.response.data) {
    if (typeof error.response.data.error === 'string' && error.response.data.error.includes('El usuario ya tiene una reserva')) {
      return error.response.data.error.replace('El usuario ya tiene', 'Ya tienes');
    }
    if (typeof error.response.data.error === 'string') return error.response.data.error;
    if (typeof error.response.data.message === 'string') return error.response.data.message;
  }
  return '❌ Ocurrió un error inesperado.';
};

const horarioInvalidoFlowMessage = async (flowDynamic, apiClient, baseUrl) => {
  try {
    const response = await apiClient.get(`${baseUrl}/horariosHoy`);
    const { dia, horarios } = response.data;
    let horariosMsg = '';
    if (Array.isArray(horarios) && horarios.length > 0) {
      horariosMsg = horarios
        .map(({ hora, disponible, lugaresDisponibles }) =>
          `🕒 - ${hora}: ${disponible ? '✅ ' + `${lugaresDisponibles} lugar${lugaresDisponibles === 1 ? '' : 'es'}` : '❌ No disponible'} `
        )
        .join('\n');
    } else {
      horariosMsg = 'No hay horarios disponibles.';
    }
    let header = `Los horarios disponibles para ${dia || 'Desconocido'} son: \n`;
    await flowDynamic(header + horariosMsg);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    await flowDynamic(errorMessage);
  }
};

module.exports = {
  validateDeleteCedulaMessage,
  validateConsultaMessage,
  validateReservaMessage,
  extractErrorMessage,
  horarioInvalidoFlowMessage,
};
