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
        const response = await axios.post('http://localhost:5100/api/login', {
            username: 'test',
            password: 'testing123',
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
            const response = await apiClient.get('http://localhost:5100/api/horariosHoy');
            const horarios = response.data
                .map((hora) => `- ${hora}`)
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
        const [_, hora, cedula] = userMessage.match(/reserva\s+(\d{1,2}:\d{2})\s+(\d+)/i);

        // Make an API request with the extracted data
        try {
            const response = await apiClient.post('http://localhost:5100/api/reservas', { "hora": hora, "cedula": cedula });
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
        const [_, hora, cedula] = userMessage.match(/cambio\s+(\d{1,2}:\d{2})\s+(\d+)/i);

        // Make an API request with the extracted data
        try {
            const response = await apiClient.put('http://localhost:5100/api/reservas', { "hora": hora, "cedula": cedula });
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
        const [_, hora, cedula] = userMessage.match(/borrar\s+(\d{1,2}:\d{2})\s+(\d+)/i);

        try {
            // Make an API request with the extracted data
            const response = await apiClient.delete('http://localhost:5100/api/reservas', { data: { "hora": hora, "cedula": cedula } });
            await flowDynamic(`✅ Borrado procesado para las ${hora} con el número ${cedula}`);
        } catch (error) {
            console.log(error);
            const errorMessage = extractErrorMessage(error);
            await flowDynamic(errorMessage);
        }
    }
)

const validateReservaMessage = (message) => {

    // Check if the message contains a valid time in 24-hour format
    const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;
    if (!timeRegex.test(message)) {
        return '❌ Debes incluir una hora válida en formato 24 horas (por ejemplo, 20:30).';
    }

    // Check if the message ends with a valid number (no special characters)
    const numberRegex = /\b\d+$/;
    if (!numberRegex.test(message)) {
        return '❌ La cedula debe escribirse en un formato valido (sin caracteres especiales, todo junto).';
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



const main = async () => {
    const adapterDB = new JsonFileAdapter()
    const adapterFlow = createFlow([flowAyudaCambio, flowAyudaReserva, flowAyudaBorrar, flowAyuda, flowHorarios, flowReserva, flowCambio, flowBorrar ])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

// Fetch the initial token when the bot starts
fetchAuthToken();

main()
