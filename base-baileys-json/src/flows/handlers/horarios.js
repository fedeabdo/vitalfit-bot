const { extractErrorMessage } = require('../helpers');

const handlerHorarios = async (ctx, { flowDynamic, apiClient, config } = {}) => {
  try {
    const client = apiClient || require('../../utils/apiClient').getApiClient();
    const baseUrl = (config && config.BASE_URL) || process.env.BASE_URL;
    const response = await client.get(`${baseUrl}/horariosHoy`);
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
    console.log(error);
    const errorMessage = extractErrorMessage(error);
    await flowDynamic(errorMessage);
  }
};

module.exports = { handlerHorarios };
