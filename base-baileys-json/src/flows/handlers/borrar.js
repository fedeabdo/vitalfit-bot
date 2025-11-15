const { validateDeleteCedulaMessage, extractErrorMessage } = require('../helpers');

const handlerBorrar = async (ctx, { flowDynamic, apiClient, config } = {}) => {
  const userMessage = ctx.body;

  const validationError = validateDeleteCedulaMessage(userMessage);
  if (validationError) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).\nEjemplo: BORRAR 12345678`);
    return;
  }

  const match = userMessage.match(/^borrar\s+(\d{6,})$/i);
  if (!match) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).\nEjemplo: BORRAR 12345678`);
    return;
  }

  const [, cedula] = match;
  if (!cedula) {
    await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).\nEjemplo: BORRAR 12345678`);
    return;
  }

  try {
    const client = apiClient || require('../../utils/apiClient').getApiClient();
    const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
    const response = await client.delete(`${baseUrl}/reservas`, { data: { cedula } });
    await flowDynamic(`✅ Borrado procesado para la cédula: ${cedula}. Confirmado 😔`);
  } catch (error) {
    console.log(error);
    const errorMessage = extractErrorMessage(error);

    if (errorMessage === 'Borrado rechazado') {
      await flowDynamic(`La clase ya comenzó, y no es posible cancelar una vez iniciada.\nPara que otra persona pueda aprovechar el lugar, las cancelaciones tratemos de hacerlas con al menos 30 minutos de anticipación 🙏🏼`);
      return;
    }
    await flowDynamic(errorMessage);
  }
};

module.exports = { handlerBorrar };
