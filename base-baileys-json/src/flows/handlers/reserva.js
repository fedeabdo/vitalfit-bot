const { validateReservaMessage, extractErrorMessage, horarioInvalidoFlowMessage } = require('../helpers');

const handlerReserva = async (ctx, { flowDynamic, apiClient, config } = {}) => {
  const userMessage = ctx.body;

  const validationError = validateReservaMessage(userMessage);
  if (validationError) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: RESERVA 20:30 12345678`);
    return;
  }

  const match = userMessage.match(/reserva\s+(\d{1,2}:\d{2})\s+(\d+)/i);
  if (!match) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: RESERVA 20:30 12345678`);
    return;
  }

  const [_, hora, cedula] = match;
  if (!hora || !cedula) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: RESERVA 20:30 12345678`);
    return;
  }

  try {
    const client = apiClient || require('../../utils/apiClient').getApiClient();
    const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
    const response = await client.post(`${baseUrl}/reservas`, { hora, cedula });
    await flowDynamic(`✅ Reserva procesada para las ${hora}. Cédula: ${cedula}. Confirmada! 💪🏽`);
  } catch (error) {
    console.log(error);
    const errorMessage = extractErrorMessage(error);
    await flowDynamic(errorMessage);
    if (
      errorMessage.includes('Este horario ya está lleno') ||
      (errorMessage.includes('El horario') && errorMessage.includes('ya está lleno')) ||
      (errorMessage.includes('Horario de reserva inválido')) ||
      (errorMessage.includes('El horario de reserva es inválido'))
    ) {
      const client = apiClient || require('../../utils/apiClient').getApiClient();
      const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
      await horarioInvalidoFlowMessage(flowDynamic, client, baseUrl);
    }
  }
};

module.exports = { handlerReserva };
