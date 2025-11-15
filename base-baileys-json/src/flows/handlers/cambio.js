const { validateReservaMessage, extractErrorMessage, horarioInvalidoFlowMessage } = require('../helpers');

const handlerCambio = async (ctx, { flowDynamic, apiClient, config } = {}) => {
  const userMessage = ctx.body;

  const validationError = validateReservaMessage(userMessage);
  if (validationError) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: CAMBIO 20:30 12345678`);
    return;
  }

  const match = userMessage.match(/cambio\s+(\d{1,2}:\d{2})\s+(\d+)/i);
  if (!match) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: CAMBIO 20:30 12345678`);
    return;
  }

  const [_, hora, cedula] = match;
  if (!hora || !cedula) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).\nEjemplo: CAMBIO 20:30 12345678`);
    return;
  }

    try {
    const client = apiClient || require('../../utils/apiClient').getApiClient();
    const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
    const response = await client.put(`${baseUrl}/reservas`, { hora, cedula });
    await flowDynamic(`✅ Cambio procesado para las ${hora}. Cédula: ${cedula}. Confirmado 💪🏽`);
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    if (errorMessage === 'Borrado rechazado') {
      await flowDynamic(`La clase ya comenzó, y no es posible cambiar una vez iniciada.\nPara que otra persona pueda aprovechar el lugar, las modificaciones tratemos de hacerlas con al menos 30 minutos de anticipación 🙏🏼`);
      return;
    }
    await flowDynamic(errorMessage);
    console.log(errorMessage);
    if (
      (errorMessage.includes('Este horario ya está lleno')) ||
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

module.exports = { handlerCambio };
