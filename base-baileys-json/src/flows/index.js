const { addKeyword } = require('@builderbot/bot');
const { withRateLimitAndRedirect } = require('../middleware/forwarder');

const { handlerHola } = require('./handlers/hola');
const { handlerAyuda } = require('./handlers/ayuda');
const { handlerHorarios } = require('./handlers/horarios');
const { handlerConsulta } = require('./handlers/consulta');
const { handlerReserva } = require('./handlers/reserva');
const { handlerCambio } = require('./handlers/cambio');
const { handlerBorrar } = require('./handlers/borrar');
const { handlerGenerico } = require('./handlers/generico');

// Export a factory so the caller can provide apiClient/config which will be
// injected into the handler tools via the forwarder wrapper.
function createFlows({ apiClient, config }) {
  // Build flows using same static answers as before, but inject apiClient/config
  const flowHola = addKeyword(['HOLA', 'Hola', 'hola'])
    .addAnswer(`🙌 Hola! Mi nombre es Horacio 🕛. Enviando mensajes a este número puedes hacer una reserva, borrar una reserva o cambiar una reserva. Para más información envía la palabra: AYUDA`, null, withRateLimitAndRedirect(handlerHola, { apiClient, config }));

  const flowAyuda = addKeyword(['AYUDA', 'ayuda'])
    .addAnswer(`🕙 RESERVA
Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: RESERVA 20:30 12345678

🔁 CAMBIO DE RESERVA
Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: CAMBIO 20:30 12345678

❌ BORRAR RESERVA
Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).
Ejemplo: BORRAR 12345678

📋 HORARIOS
Escribe HORARIOS para ver la disponibilidad de los horarios del día.

❓ CONSULTA
Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.
Ejemplo: CONSULTA 12345678`, null, withRateLimitAndRedirect(handlerAyuda, { apiClient, config }));

  const flowHorarios = addKeyword(['HORARIOS', 'horarios', 'Horarios'])
    .addAnswer(`Verificando horarios...`, null, withRateLimitAndRedirect(handlerHorarios, { apiClient, config }));

  const flowConsulta = addKeyword(['CONSULTA', 'consulta', 'Consulta'])
    .addAnswer('Estamos procesando tu consulta ⏳', null, withRateLimitAndRedirect(handlerConsulta, { apiClient, config }));

  const flowReserva = addKeyword(['RESERVA', 'reserva', 'Reserva'])
    .addAnswer('Estamos procesando tu reserva ⏳', null, withRateLimitAndRedirect(handlerReserva, { apiClient, config }));

  const flowCambio = addKeyword(['CAMBIO', 'Cambio'])
    .addAnswer('Estamos procesando tu cambio de reserva ⏳', null, withRateLimitAndRedirect(handlerCambio, { apiClient, config }));

  const flowBorrar = addKeyword(['BORRAR', 'borrar', 'Borrar'])
    .addAnswer('Estamos procesando tu borrado 😔', null, withRateLimitAndRedirect(handlerBorrar, { apiClient, config }));

  const flowGenerico = addKeyword(['.*'])
    .addAnswer(`😬 No es posible procesar tu mensaje. Prueba con alguno de los siguientes:

🕙 RESERVA
Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: RESERVA 20:30 12345678

🔁 CAMBIO DE RESERVA
Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: CAMBIO 20:30 12345678

❌ BORRAR RESERVA
Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).
Ejemplo: BORRAR 12345678

📋 HORARIOS
Escribe HORARIOS para ver la disponibilidad de los horarios del día.

❓ CONSULTA
Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.
Ejemplo: CONSULTA 12345678 `, null, withRateLimitAndRedirect(handlerGenerico, { apiClient, config }));

  return [
    flowHola,
    flowConsulta,
    flowAyuda,
    flowHorarios,
    flowReserva,
    flowCambio,
    flowBorrar,
    flowGenerico
  ];
}

module.exports = { createFlows };
