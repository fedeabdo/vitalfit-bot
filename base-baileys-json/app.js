const dotenv = require('dotenv');

dotenv.config();

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    // Don't exit the process - let the bot continue running
    // Log the error for debugging but don't crash
});

// Global handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // For uncaught exceptions, we might want to exit gracefully
    // But for now, just log and continue
});

const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const JsonFileAdapter = require('@bot-whatsapp/database/json')


const jwt = require('jsonwebtoken');
const axios = require('axios');

let authToken = null;
let tokenExpiry = null;

const fetchAuthToken = async () => {
    try {
        console.log('🔄 Fetching new token at: ' + `${process.env.BASE_URL}/login`);
        const response = await axios.post(`${process.env.BASE_URL}/login`, {
            username: process.env.USERNAME,
            password: process.env.PASSWORD,
        });
        authToken = response.data.token;
        const decodedToken = jwt.decode(authToken);
        tokenExpiry = decodedToken.exp * 1000;
        console.log('✅ Token fetched successfully');
    } catch (error) {
        console.error('❌ Error fetching token:', error.message);
    }
};

const refreshAuthTokenIfNeeded = async () => {
    const now = Date.now();
    if (!authToken || !tokenExpiry || now >= tokenExpiry - 60000) {
        console.log('🔄 Refreshing token...');
        await fetchAuthToken();
    }
};

const apiClient = axios.create();
apiClient.interceptors.request.use(async (config) => {
    await refreshAuthTokenIfNeeded();
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// flowHola will be defined after handlers so handlerHola is available

// Extracted handlers so tests can call them directly
const handlerHola = async (ctx, { flowDynamic }) => {
    // greeting handled by static addAnswer; no dynamic follow-up required
};

const handlerAyuda = async (ctx, { flowDynamic }) => {
    // help text is served as the static answer; no dynamic follow-up
};

const handlerHorarios = async (ctx, { flowDynamic }) => {
    try {
        const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
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

const handlerConsulta = async (ctx, { flowDynamic }) => {
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
        const response = await apiClient.get(`${process.env.BASE_URL}/reservas/consulta/${cedula}`);
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

const handlerReserva = async (ctx, { flowDynamic }) => {
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
        const response = await apiClient.post(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
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
            await horarioInvalidoFlowMessage(flowDynamic);
        }
    }
};

const handlerCambio = async (ctx, { flowDynamic }) => {
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
        const response = await apiClient.put(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
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
            await horarioInvalidoFlowMessage(flowDynamic);
        }
    }
};

const handlerBorrar = async (ctx, { flowDynamic }) => {
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
        const response = await apiClient.delete(`${process.env.BASE_URL}/reservas`, { data: { cedula } });
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

const handlerGenerico = async (ctx, { flowDynamic, provider }) => {
    // static generic answer is provided by addAnswer; no dynamic follow-up
};

// Define flows using the extracted handlers
const flowHola = addKeyword(['HOLA', 'Hola', 'hola'])
    .addAnswer(`🙌 Hola! Mi nombre es Horacio 🕛. Enviando mensajes a este número puedes hacer una reserva, borrar una reserva o cambiar una reserva. Para más información envía la palabra: AYUDA`, null, withRateLimitAndRedirect(handlerHola));

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
Ejemplo: CONSULTA 12345678`, null, withRateLimitAndRedirect(handlerAyuda));

const flowHorarios = addKeyword(['HORARIOS', 'horarios', 'Horarios'])
    .addAnswer(`Verificando horarios...`, null, withRateLimitAndRedirect(handlerHorarios));

const flowConsulta = addKeyword(['CONSULTA', 'consulta', 'Consulta'])
    .addAnswer('Estamos procesando tu consulta ⏳', null, withRateLimitAndRedirect(handlerConsulta));

const flowReserva = addKeyword(['RESERVA', 'reserva', 'Reserva'])
    .addAnswer('Estamos procesando tu reserva ⏳', null, withRateLimitAndRedirect(handlerReserva));

const flowCambio = addKeyword(['CAMBIO', 'Cambio'])
    .addAnswer('Estamos procesando tu cambio de reserva ⏳', null, withRateLimitAndRedirect(handlerCambio));

const flowBorrar = addKeyword(['BORRAR', 'borrar', 'Borrar'])
    .addAnswer('Estamos procesando tu borrado 😔', null, withRateLimitAndRedirect(handlerBorrar));

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
Ejemplo: CONSULTA 12345678 `, null, withRateLimitAndRedirect(handlerGenerico));

const validateDeleteCedulaMessage = (message) => {
    if (!message || message.trim() === '') {
        return '❌ El mensaje no puede estar vacío. Por favor, incluye la cédula.';
    }
    if (!/^borrar\s+\d{6,}$/i.test(message.trim())) {
        return '❌ El mensaje debe tener el formato: BORRAR <cédula> (sin caracteres especiales, todo junto).';
    }
    return null;
};

const validateConsultaMessage = (message) => {
    if (!message || message.trim() === '') {
        return 'Mensaje incompleto. Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678';
    }
    if (!/^consulta\s+\d{6,}$/i.test(message.trim())) {
        return 'Mensaje incompleto. Escribe CONSULTA seguido de tu cédula (sin puntos ni guiones) para ver si ya tienes una reserva.\nEjemplo: CONSULTA 12345678';
    }
    return null;
};

const validateReservaMessage = (message) => {
    if (!message || message.trim() === '') {
        return '❌ El mensaje no puede estar vacío. Por favor, incluye una hora y una cédula.';
    }

    const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;
    if (!timeRegex.test(message)) {
        return '❌ Debes incluir una hora válida en formato 24 horas (por ejemplo, 20:30).';
    }
    const numberRegex = /\b\d+$/;
    if (!numberRegex.test(message)) {
        return '❌ La cédula debe escribirse en un formato válido (sin caracteres especiales, todo junto).';
    }

    return null;
};

const extractErrorMessage = (error) => {
    if (error.response && error.response.data) {
        if (
            typeof error.response.data.error === 'string' &&
            error.response.data.error.includes('El usuario ya tiene una reserva')
        ) {
            return error.response.data.error.replace('El usuario ya tiene', 'Ya tienes');
        }
        if (typeof error.response.data.error === 'string') {
            return error.response.data.error;
        }
        if (typeof error.response.data.message === 'string') {
            return error.response.data.message;
        }
    }
    return '❌ Ocurrió un error inesperado.';
};



// Utility to normalize sender numbers and handle hardcoded redirect
function normalizeSenderNumber(senderJid) {
    let number = senderJid.split('@')[0];
    return number;
}

function withRateLimitAndRedirect(handler) {
    return async (ctx, tools) => {
        const userId = normalizeSenderNumber(ctx.from);

        // Arreglo para el número de reenvío Antonela
        const forwardNumber = '59899285083@c.us';
        const originalFlowDynamic = tools.flowDynamic;
        const flowDynamicWithForward = async (msg) => {
            try {
                await originalFlowDynamic(msg);
                // Forward to 2950692905165
                if (userId === '2950692905165') {
                    let forwardMsg = msg;
                    if (Array.isArray(forwardMsg)) forwardMsg = forwardMsg.join('\n');
                    if (typeof forwardMsg !== 'string') forwardMsg = String(forwardMsg);
                    try {
                        await tools.provider.sendText(forwardNumber, `${forwardMsg}`);
                    } catch (forwardError) {
                        // Don't fail if forwarding fails
                        console.error('⚠️ Failed to forward message:', forwardError.message);
                    }
                }
            } catch (error) {
                // Handle timeout and other errors from flowDynamic for ALL users
                // Check if error exists and has properties
                if (!error) {
                    console.error(`⚠️ Undefined error caught for user ${userId}`);
                    return; // Silently fail
                }

                const isTimeout = (
                    error.message === 'Timed Out' ||
                    error.message?.includes('Timed Out') ||
                    error.output?.payload?.message === 'Timed Out' ||
                    error.message?.includes('timeout') ||
                    error.message?.includes('Request Time-out')
                );

                if (isTimeout) {
                    console.error(`⚠️ Timeout error sending message to user ${userId}, but bot continues running:`, error.message || 'Unknown timeout');
                    // Don't throw - let the bot continue running for other users
                    return; // Silently fail - the bot will continue processing other messages
                } else {
                    // Log the error but don't re-throw to prevent UnhandledPromiseRejection
                    // The outer try-catch will handle it
                    console.error(`⚠️ Error in flowDynamic for user ${userId}:`, error.message || error.toString() || 'Unknown error');
                    // Don't throw - let the handler's try-catch handle it if needed
                    // But since we're catching here, we won't let it propagate as unhandled
                    return;
                }
            }
        };

        try {
            await handler(ctx, { ...tools, flowDynamic: flowDynamicWithForward });
        } catch (error) {
            // Catch any unhandled errors from the handler
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            console.error(`❌ Error in handler for user ${userId}:`, errorMessage);
            console.error('Error details:', error);

            // Try to send error message to user if possible, but don't let this fail the bot
            try {
                await flowDynamicWithForward('❌ Ocurrió un error inesperado. Por favor intenta nuevamente más tarde.');
            } catch (sendError) {
                // Don't log as error if it's just a timeout - we already handled that
                if (!sendError?.message?.includes('Timed Out') && !sendError?.message?.includes('timeout')) {
                    console.error('❌ Failed to send error message to user:', sendError?.message || sendError);
                }
            }
            // Don't re-throw - let the bot continue processing other messages
        }
    };
}


async function horarioInvalidoFlowMessage(flowDynamic) {
    try {
        const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
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
    return;
}

const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([
        flowHola,
        flowConsulta,
        flowAyuda,
        flowHorarios,
        flowReserva,
        flowCambio,
        flowBorrar,
        flowGenerico
    ]);
    const adapterProvider = createProvider(BaileysProvider, {
        pathSession: './bot_sessions',
    });

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });
    QRPortalWeb();
};

// Export helpers for tests
module.exports = {
    normalizeSenderNumber,
    withRateLimitAndRedirect,
    fetchAuthToken,
    main,
    // exported for tests
    apiClient,
    handlerHola,
    handlerAyuda,
    handlerHorarios,
    handlerConsulta,
    handlerReserva,
    handlerCambio,
    handlerBorrar,
    handlerGenerico
};

// If this file is executed directly, start the bot. When required (tests), do not auto-start.
if (require.main === module) {
    // Fetch the initial token when the bot starts
    fetchAuthToken().catch((err) => {
        console.error('❌ Unhandled error in fetchAuthToken:', err);
    });

    main().catch((err) => {
        console.error('❌ Unhandled error in main:', err);
    });
}
