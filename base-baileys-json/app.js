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

// Function to fetch a new JWT token from the backend
const fetchAuthToken = async () => {
    try {
        const response = await axios.post(`${process.env.BASE_URL}/login`, {
            username: process.env.USERNAME,
            password: process.env.PASSWORD,
        });
        authToken = response.data.token;
        const decodedToken = jwt.decode(authToken);
        tokenExpiry = decodedToken.exp * 1000; // Convert to milliseconds
        console.log('✅ Token fetched successfully');
    } catch (error) {
        console.error('❌ Error fetching token:', error.message);
    }
};

// Function to refresh the token if it's about to expire
const refreshAuthTokenIfNeeded = async () => {
    const now = Date.now();
    if (!authToken || !tokenExpiry || now >= tokenExpiry - 60000) { // Refresh 1 minute before expiry
        console.log('🔄 Refreshing token...');
        await fetchAuthToken();
    }
};

// Axios instance with interceptor to attach the token
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

// Rate limiting
const rateLimit = {};
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 3;

const isRateLimited = (userId) => {
    const currentTime = Date.now();

    if (!rateLimit[userId]) {
        rateLimit[userId] = [];
    }

    // Filter out timestamps older than the rate limit window
    rateLimit[userId] = rateLimit[userId].filter(timestamp => currentTime - timestamp < RATE_LIMIT_WINDOW);

    // Check if the user has exceeded the max requests
    if (rateLimit[userId].length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    // Add the current timestamp to the user's request log
    rateLimit[userId].push(currentTime);
    return false;
};


// EL orden es importante
const flowAyudaCambio = addKeyword(['AYUDA CAMBIO', 'ayuda cambio', 'Ayuda cambio', 'Ayuda Cambio'])	
    .addAnswer(`Para hacer una cambio de reserva escribe la palabra CAMBIO seguido del horario al que quieres cambiar (formato 24 horas) y tu cédula (sin puntos ni guiones).
        Por ejemplo: CAMBIO 20:30 12345678.`
, null, async (ctx, { flowDynamic }) => {       
    });


const flowAyudaReserva = addKeyword(['AYUDA RESERVA', 'ayuda reserva', 'Ayuda reserva', 'Ayuda Reserva'])
    .addAnswer(`Para hacer una reserva escribe la palabra RESERVA seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
        Por ejemplo: RESERVA 20:30 12345678.`
, null, async (ctx, { flowDynamic }) => {       
    });

const flowAyudaBorrar = addKeyword(['AYUDA BORRAR', 'ayuda borrar', 'Ayuda borrar', 'Ayuda Borrar'])
    .addAnswer(`Para hacer una borrado de reserva escribe la palabra BORRAR seguido del horario (formato 24 horas) y tu cédula (sin puntos ni guiones).
        Por ejemplo: BORRAR 20:30 12345678.`
, null, async (ctx, { flowDynamic }) => {       
    });


const flowAyuda = addKeyword(['AYUDA', 'HOLA', 'ayuda', 'Hola'])
    .addAnswer(`🙌 Hola!. Enviando mensajes a este número podés hacer una reserva, borrar una reserva o cambiar una reserva. Para más información enviá las palabras:
        HORARIOS, AYUDA RESERVA, AYUDA CAMBIO o AYUDA BORRAR.`
, null, async (ctx, { flowDynamic }) => {       
    });

const flowHorarios = addKeyword(['HORARIOS', 'horarios', 'Horarios'])
    .addAnswer(`Los horarios disponibles para hoy son:`, null, async (ctx, { flowDynamic }) => {
        try {
            const response = await apiClient.get(`${process.env.BASE_URL}/horariosHoy`);
            const horarios = response.data
                .map(({ hora, disponibilidad }) => `🕒 - ${hora}: ${disponibilidad ? '✅ Disponible' : '❌ No disponible'}`)
                .join('\n');
            await flowDynamic(horarios);
        } catch (error) {
            console.error('❌ Error fetching horarios:', error.message);
            await flowDynamic('❌ Hubo un error al obtener los horarios disponibles.');
        }
    });

const flowReserva = addKeyword(['RESERVA', 'reserva', 'Reserva'])
    .addAnswer('Estamos procesando tu reserva. 💪', null, async (ctx, { flowDynamic }) => {
        const userMessage = ctx.body;

        // Validate the user's message
        const validationError = validateReservaMessage(userMessage);
        if (validationError) {
            await flowDynamic(validationError);
            return;
        }

        // Extract data from the message
        const match = userMessage.match(/reserva\s+(\d{1,2}:\d{2})\s+(\d+)/i);
        if (!match) {
            await flowDynamic('❌ El mensaje no tiene el formato esperado. Por favor, usa: RESERVA <hora> <cédula>.');
            return;
        }

        const [_, hora, cedula] = match;
        if (!hora || !cedula) {
            await flowDynamic('❌ Faltan datos en el mensaje. Asegúrate de incluir la hora y la cédula.');
            return;
        }

        // Make an API request with the extracted data
        try {
            const response = await apiClient.post(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
            await flowDynamic(`✅ Reserva procesada para las ${hora} con el número ${cedula}: ${response.data.message}`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    });

const flowCambio = addKeyword(['CAMBIO', 'Cambio']
)
    .addAnswer('Estamos procesando tu cambio de reserva ⏳.', null, async (ctx, { flowDynamic }) => {
        const userMessage = ctx.body;

        // Validate the user's message
        const validationError = validateReservaMessage(userMessage);
        if (validationError) {
            await flowDynamic(validationError);
            return;
        }

        // Extract data from the message
        const match = userMessage.match(/cambio\s+(\d{1,2}:\d{2})\s+(\d+)/i);
        if (!match) {
            await flowDynamic('❌ El mensaje no tiene el formato esperado. Por favor, usa: CAMBIO <hora> <cédula>.');
            return;
        }

        const [_, hora, cedula] = match;
        if (!hora || !cedula) {
            await flowDynamic('❌ Faltan datos en el mensaje. Asegúrate de incluir la hora y la cédula.');
            return;
        }

        // Make an API request with the extracted data
        try {
            const response = await apiClient.put(`${process.env.BASE_URL}/reservas`, { "hora": hora, "cedula": cedula });
            await flowDynamic(`✅ Cambio procesado para las ${hora} con el número ${cedula}: ${response.data.message}`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    }
)

const flowBorrar = addKeyword(['BORRAR', 'borrar', 'Borrar'])
    .addAnswer('Estamos procesando tu borrado 😔', null, async (ctx, { flowDynamic }) =>  {
        const userMessage = ctx.body;

        // Validate the user's message
        const validationError = validateReservaMessage(userMessage);
        if (validationError) {
            await flowDynamic(validationError);
            return;
        }

        // Extract data from the message
        const match = userMessage.match(/borrar\s+(\d{1,2}:\d{2})\s+(\d+)/i);
        if (!match) {
            await flowDynamic('❌ El mensaje no tiene el formato esperado. Por favor, usa: BORRAR <hora> <cédula>.');
            return;
        }

        const [_, hora, cedula] = match;
        if (!hora || !cedula) {
            await flowDynamic('❌ Faltan datos en el mensaje. Asegúrate de incluir la hora y la cédula.');
            return;
        }

        try {
            // Make an API request with the extracted data
            const response = await apiClient.delete(`${process.env.BASE_URL}/reservas`, { data: { "hora": hora, "cedula": cedula } });
            await flowDynamic(`✅ Borrado procesado para las ${hora} con el número ${cedula}`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    }
)

const validateReservaMessage = (message) => {
    if (!message || message.trim() === '') {
        return '❌ El mensaje no puede estar vacío. Por favor, incluye una hora y una cédula.';
    }

    // Check if the message contains a valid time in 24-hour format
    const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;
    if (!timeRegex.test(message)) {
        return '❌ Debes incluir una hora válida en formato 24 horas (por ejemplo, 20:30).';
    }

    // Check if the message ends with a valid number (no special characters)
    const numberRegex = /\b\d+$/;
    if (!numberRegex.test(message)) {
        return '❌ La cédula debe escribirse en un formato válido (sin caracteres especiales, todo junto).';
    }

    // If all checks pass, return null (no errors)
    return null;
};

const extractErrorMessage = (error) => {
    if (error.response && error.response.data && error.response.data.error) {
        return error.response.data.error; // Extract the error message from the response body
    }
    return '❌ Ocurrió un error inesperado.'; // Default message for unexpected errors
};



const applyRateLimitMiddleware = (flow) => {
    if (!flow || typeof flow.addAnswer !== 'function') {
        console.error('❌ Invalid flow passed to applyRateLimitMiddleware:', flow);
        throw new Error('Invalid flow object. The flow must have an addAnswer method.');
    }

    // Wrap the original addAnswer method to include rate-limiting logic
    const originalAddAnswer = flow.addAnswer.bind(flow);
    flow.addAnswer = (answer, options, callback) => {
        const wrappedCallback = async (ctx, { flowDynamic }, next) => {
            const userId = ctx.from; // Assuming `ctx.from` contains the user ID

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
const flowAyudaCambioWithRateLimit = applyRateLimitMiddleware(flowAyudaCambio);
const flowAyudaReservaWithRateLimit = applyRateLimitMiddleware(flowAyudaReserva);
const flowAyudaBorrarWithRateLimit = applyRateLimitMiddleware(flowAyudaBorrar);
const flowAyudaWithRateLimit = applyRateLimitMiddleware(flowAyuda);
const flowHorariosWithRateLimit = applyRateLimitMiddleware(flowHorarios);
const flowReservaWithRateLimit = applyRateLimitMiddleware(flowReserva);
const flowCambioWithRateLimit = applyRateLimitMiddleware(flowCambio);
const flowBorrarWithRateLimit = applyRateLimitMiddleware(flowBorrar);

const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([
        flowAyudaCambioWithRateLimit,
        flowAyudaReservaWithRateLimit,
        flowAyudaBorrarWithRateLimit,
        flowAyudaWithRateLimit,
        flowHorariosWithRateLimit,
        flowReservaWithRateLimit,
        flowCambioWithRateLimit,
        flowBorrarWithRateLimit
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
fetchAuthToken();

main()
