const dotenv = require('dotenv');

dotenv.config();

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


const rateLimit = {};
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 1;

const isRateLimited = (userId) => {
    const currentTime = Date.now();

    if (!rateLimit[userId]) {
        rateLimit[userId] = [];
    }

    rateLimit[userId] = rateLimit[userId].filter(timestamp => currentTime - timestamp < RATE_LIMIT_WINDOW);

    if (rateLimit[userId].length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }
    rateLimit[userId].push(currentTime);
    return false;
};

const flowHola = addKeyword(['HOLA', 'Hola', 'hola'])
    .addAnswer(`🙌 Hola! Mi nombre es Horacio 🕛. Enviando mensajes a este número puedes hacer una reserva, borrar una reserva o cambiar una reserva. Para más información envía la palabra: AYUDA`, null, async (ctx, { flowDynamic }) => {
    });

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
Ejemplo: CONSULTA 12345678`
, null, async (ctx, { flowDynamic }) => {       
    });

const flowHorarios = addKeyword(['HORARIOS', 'horarios', 'Horarios'])
    .addAnswer(`Verificando horarios...`, null, async (ctx, { flowDynamic }) => {
        try {
            const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
            const horarios = response.data
                .map(({ hora, disponibilidad }) => `🕒 - ${hora}: ${disponibilidad ? '✅ Disponible' : '❌ No disponible'}`)
                .join('\n');
            await flowDynamic(`Los horarios disponibles para hoy son:\n` + horarios);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    });


const flowConsulta = addKeyword(['CONSULTA', 'consulta', 'Consulta'])
    .addAnswer('Estamos procesando tu consulta ⏳', null, async (ctx, { flowDynamic }) => {
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
            // Use cedula as a URL param
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
    });

const flowReserva = addKeyword(['RESERVA', 'reserva', 'Reserva'])
    .addAnswer('Estamos procesando tu reserva ⏳', null, async (ctx, { flowDynamic }) => {
        const userMessage = ctx.body;

        const validationError = validateReservaMessage(userMessage);
        if (validationError) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: RESERVA 20:30 12345678`);
            return;
        }

        const match = userMessage.match(/reserva\s+(\d{1,2}:\d{2})\s+(\d+)/i);
        if (!match) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: RESERVA 20:30 12345678`);
            return;
        }

        const [_, hora, cedula] = match;
        if (!hora || !cedula) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: RESERVA 20:30 12345678`);
            return;
        }

        try {
            const response = await apiClient.post(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
            await flowDynamic(`✅ Reserva procesada para las ${hora}. Cédula: ${cedula}. Confirmada! 💪🏽`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);


            if (
                errorMessage.includes('Este horario ya está lleno') ||
                (errorMessage.includes('El horario') && errorMessage.includes('ya está lleno')) ||
		(errorMessage.includes('Horario de reserva inválido'))
            ) {
                await flowDynamic(errorMessage);


                try {
                    const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
                    const horarios = response.data
                        .map(({ hora, disponibilidad }) => `🕒 - ${hora}: ${disponibilidad ? '✅ Disponible' : '❌ No disponible'}`)
                        .join('\n');
                    await flowDynamic('Horarios disponibles para hoy:\n' + horarios);
                } catch (err) {
                    await flowDynamic('❌ Hubo un error al obtener los horarios disponibles.');
                }
                return;
            }
            await flowDynamic(errorMessage);
        }
    });

const flowCambio = addKeyword(['CAMBIO', 'Cambio']
)
    .addAnswer('Estamos procesando tu cambio de reserva ⏳ prueba', null, async (ctx, { flowDynamic }) => {
        const userMessage = ctx.body;

        const validationError = validateReservaMessage(userMessage);
        if (validationError) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: CAMBIO 20:30 12345678`);
            return;
        }

        const match = userMessage.match(/cambio\s+(\d{1,2}:\d{2})\s+(\d+)/i);
        if (!match) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: CAMBIO 20:30 12345678`);
            return;
        }

        const [_, hora, cedula] = match;
        if (!hora || !cedula) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
Ejemplo: CAMBIO 20:30 12345678`);
            return;
        }

        try {
            const response = await apiClient.put(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
            await flowDynamic(`✅ Cambio procesado para las ${hora}. Cédula: ${cedula}. Confirmado 💪🏽`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);

            if (
                (errorMessage.includes('Este horario ya está lleno')) ||
                (errorMessage.includes('El horario') && errorMessage.includes('ya está lleno')) ||
            (errorMessage.includes('Horario de reserva inválido'))
            ) {
                await flowDynamic(errorMessage);

                try {
                    const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
                    const horarios = response.data
                        .map(({ hora, disponibilidad }) => `🕒 - ${hora}: ${disponibilidad ? '✅ Disponible' : '❌ No disponible'}`)
                        .join('\n');
                    await flowDynamic('Horarios disponibles para hoy:\n' + horarios);
                } catch (err) {
                    await flowDynamic('❌ Hubo un error al obtener los horarios disponibles.');
                }
                return;
            }


            await flowDynamic(errorMessage);
        }
    }
)

const flowBorrar = addKeyword(['BORRAR', 'borrar', 'Borrar'])
    .addAnswer('Estamos procesando tu borrado 😔', null, async (ctx, { flowDynamic }) =>  {
        const userMessage = ctx.body;

        const validationError = validateDeleteCedulaMessage(userMessage);
        if (validationError) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).
Ejemplo: BORRAR 12345678`);
            return;
        }

        const match = userMessage.match(/^borrar\s+(\d{6,})$/i);
        if (!match) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).
Ejemplo: BORRAR 12345678`);
            return;
        }

        const [, cedula] = match;
        if (!cedula) {
            await flowDynamic(`❌ El mensaje no tiene el formato esperado. Escribe BORRAR seguido de tu cédula (sin puntos ni guiones).
Ejemplo: BORRAR 12345678`);
            return;
        }

        try {
            const response = await apiClient.delete(`${process.env.BASE_URL}/reservas`, { data: { cedula } });
            await flowDynamic(`✅ Borrado procesado para la cédula: ${cedula}. Confirmado 😔`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    }
);

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
Ejemplo: CONSULTA 12345678 `, null, async (ctx, { flowDynamic }) =>  {    
    });

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

const applyRateLimitMiddleware = (flow) => {
    if (!flow || typeof flow.addAnswer !== 'function') {
        console.error('❌ Invalid flow passed to applyRateLimitMiddleware:', flow);
        throw new Error('Invalid flow object. The flow must have an addAnswer method.');
    }

    const originalAddAnswer = flow.addAnswer.bind(flow);
    flow.addAnswer = (answer, options, callback) => {
        const wrappedCallback = async (ctx, { flowDynamic }, next) => {
            const userId = ctx.from;

            if (isRateLimited(userId)) {
                await flowDynamic('❌ Estás enviando demasiados mensajes. Por favor, espera un momento antes de intentarlo de nuevo.');
                return;
            }

            if (callback) {
                await callback(ctx, { flowDynamic }, next);
            }
        };

        return originalAddAnswer(answer, options, wrappedCallback);
    };

    return flow;
};

// Wrap all flows with the rate limit middleware
const flowHolaWithRateLimit = applyRateLimitMiddleware(flowHola);
const flowConsultaWithRateLimit = applyRateLimitMiddleware(flowConsulta);
const flowAyudaWithRateLimit = applyRateLimitMiddleware(flowAyuda);
const flowHorariosWithRateLimit = applyRateLimitMiddleware(flowHorarios);
const flowReservaWithRateLimit = applyRateLimitMiddleware(flowReserva);
const flowCambioWithRateLimit = applyRateLimitMiddleware(flowCambio);
const flowBorrarWithRateLimit = applyRateLimitMiddleware(flowBorrar);
const flowGenericoWithRateLimit = applyRateLimitMiddleware(flowGenerico);   


const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([
        flowHolaWithRateLimit,
        flowConsultaWithRateLimit,
        flowAyudaWithRateLimit,
        flowHorariosWithRateLimit,
        flowReservaWithRateLimit,
        flowCambioWithRateLimit,
        flowBorrarWithRateLimit,
        flowGenericoWithRateLimit
    ]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });
    QRPortalWeb();
};

// Fetch the initial token when the bot starts
fetchAuthToken().catch((err) => {
    console.error('❌ Unhandled error in fetchAuthToken:', err);
});

main().catch((err) => {
    console.error('❌ Unhandled error in main:', err);
});
