const { validateConsultaMessage, extractErrorMessage } = require('../helpers');

const handlerConsulta = async (ctx, { flowDynamic, apiClient, config } = {}) => {
  const userMessage = ctx.body;

  const validationError = validateConsultaMessage(userMessage);
  if (validationError) {
    await flowDynamic(validationError);
    return;
  }

  const match = userMessage.match(/^consulta\s+(\d{6,})$/i);
  if (!match) {
    await flowDynamic('Mensaje incompleto. Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678');
    return;
  }

  const [, cedula] = match;
  if (!cedula) {
    await flowDynamic('Mensaje incompleto. Escribí CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678');
    return;
  }

  try {
    const client = apiClient || require('../../utils/apiClient').getApiClient();
    const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
    const response = await client.get(`${baseUrl}/reservas/consulta/${cedula}`);
    if (response.data && response.data.hora) {
      await flowDynamic(`✅ Tienes una reserva registrada para el horario: ${response.data.hora}.`);
    } else if (response.data && response.data.message) {
      await flowDynamic(response.data.message);
    } else {
      await flowDynamic('No se encontró una reserva para esa cédula.');
    }
  } catch (error) {
    console.log(error);
    const errorMessage = extractErrorMessage(error);
    await flowDynamic(errorMessage);
  }
};

module.exports = { handlerConsulta };
