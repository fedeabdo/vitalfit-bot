const dotenv = require('dotenv');

dotenv.config();

const { createBot, createProvider, createFlow } = require('@builderbot/bot')
// Use the project's db re-export (src/db) which already falls back to MemoryDB
const { adapterDB } = require('./src/db');
// NOTE: We import the BaileysProvider dynamically inside `main()` with `import()` to
// avoid ESM/CommonJS interop issues during tests. In production this will load the
// real provider package (@builderbot/provider-baileys).
// Use the shared api client factory in src/utils so token state is centralized
const { createApiClient, fetchAuthToken } = require('./src/utils/apiClient');
// Load helpers, normalizers and the flows factory from src
const { normalizeSenderNumber } = require('./src/utils/normalize');
const { withRateLimitAndRedirect } = require('./src/middleware/forwarder');
const { createFlows } = require('./src/flows');


const apiClient = createApiClient({ baseUrl: process.env.BASE_URL, username: process.env.USERNAME2, password: process.env.PASSWORD });




const PORT = process.env.PORT ?? 3008;


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



// (forwarding, normalization and flow helpers live in src/* now)

const main = async () => {
    const adapterDBInstance = adapterDB;

    // Build flows, injecting apiClient and a tiny config object so handlers can
    // make requests and read BASE_URL without depending on globals.
    const flows = createFlows({ apiClient, config: { BASE_URL: process.env.BASE_URL } });
    const adapterFlow = createFlow(flows);

    // Dynamically import BaileysProvider to avoid loading ESM-only modules during tests.
    const { BaileysProvider } = await import('@builderbot/provider-baileys').then(m => m.default ? m.default : m);
    const adapterProvider = createProvider(BaileysProvider, {
        pathSession: './bot_sessions',
    });

    // Diagnostic: print bot_sessions folder contents and attempt to read
    // critical LID-related files so we can see whether files are present
    // and contain valid JSON. This helps debug the 'Auth state missing'
    // messages seen in logs.
    try {
        const fs = require('fs');
        const sessionDir = require('path').resolve('./bot_sessions');
        console.log('DEBUG: sessionDir ->', sessionDir);
        if (fs.existsSync(sessionDir)) {
            const files = fs.readdirSync(sessionDir);
            console.log('DEBUG: bot_sessions files:', files);
            const wanted = files.filter(f => /lid-mapping|device-index|creds|session-/.test(f));
            for (const fname of wanted) {
                try {
                    const full = require('path').join(sessionDir, fname);
                    const stat = fs.statSync(full);
                    console.log(`DEBUG: ${fname} size=${stat.size} updated=${stat.mtime.toISOString()}`);
                    // Try to parse small JSONs for diagnostic info (limit to 200KB)
                    if (stat.size < 200 * 1024) {
                        const txt = fs.readFileSync(full, 'utf8');
                        try {
                            const parsed = JSON.parse(txt);
                            console.log(`DEBUG: ${fname} keys:`, Object.keys(parsed).slice(0,10));
                        } catch (e) {
                            console.warn(`WARN: ${fname} JSON parse failed:`, e && e.message);
                        }
                    } else {
                        console.log(`DEBUG: ${fname} too large to print`);
                    }
                } catch (e) {
                    console.warn('WARN: reading session file', fname, e && e.message);
                }
            }
        } else {
            console.warn('WARN: sessionDir does not exist:', sessionDir);
        }
    } catch (e) {
        console.warn('WARN: session diagnostics failure:', e && e.message);
    }

    // Diagnostic: inspect provider auth object if exposed
    try {
        const authCandidate = adapterProvider && (adapterProvider.authState || adapterProvider.auth || adapterProvider.authStateProvider || adapterProvider.provider && adapterProvider.provider.authState);
        console.log('DEBUG: adapterProvider authCandidate type:', typeof authCandidate);
        if (authCandidate && typeof authCandidate === 'object') {
            console.log('DEBUG: adapterProvider authCandidate keys:', Object.keys(authCandidate));
            if (typeof authCandidate.get === 'function') console.log('DEBUG: auth.get exists');
            if (typeof authCandidate.set === 'function') console.log('DEBUG: auth.set exists');
            if (typeof authCandidate.multiFile === 'function') console.log('DEBUG: auth.multiFile exists');
        }
    } catch (e) {
        console.warn('WARN: cannot inspect adapterProvider authCandidate:', e && e.message);
    }

    let botResult;
    try {
        botResult = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDBInstance
        });
    } catch (err) {
        // Log full error with stack where available to help diagnose auth issues
        console.error('❌ createBot failed:', err && (err.stack || err.message || err));
        // If the error has nested properties, print them too
        try { console.error('ERROR details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2)); } catch (e) {}
        throw err;
    }

    // Defensive handling: different versions of createBot may return different
    // shapes. Log the returned value and attempt to start any http server the
    // library returns. This helps diagnose why the HTTP port might not be
    // accepting connections.
    try {
        console.log('DEBUG: createBot returned:', botResult && typeof botResult === 'object' ? Object.keys(botResult) : typeof botResult);
    } catch (e) { /* ignore */ }

    const startPort = Number(PORT || 3008);

    // Helper to log a server instance's bound address when possible
    const logServerAddress = (maybeServer, fallbackPort) => {
        try {
            if (maybeServer && typeof maybeServer.address === 'function') {
                const addr = maybeServer.address();
                if (addr) {
                    console.log(`✅ HTTP server listening on ${addr.address || '0.0.0.0'}:${addr.port || fallbackPort}`);
                    return;
                }
            }
        } catch (e) {
            // ignore
        }
        console.log(`✅ HTTP server listening (port ${fallbackPort})`);
    };

    // Try binding the server across consecutive ports when the preferred
    // port is already in use. startFn should be a function taking
    // (port, host) and returning the server or throwing an error.
    const tryPorts = async (startFn, initialPort, maxAttempts = 5) => {
        let port = Number(initialPort || 3008);
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const maybe = await Promise.resolve(startFn(port, '0.0.0.0'));
                logServerAddress(maybe, port);
                return { port, maybe };
            } catch (err) {
                const code = err && (err.code || err.errno || (err.message && err.message.code));
                if (err && (err.code === 'EADDRINUSE' || (typeof err.message === 'string' && err.message.includes('EADDRINUSE')))) {
                    console.warn(`WARN: Port ${port} in use, trying ${port + 1}`);
                    port = port + 1;
                    continue;
                }
                // If it's a different error, rethrow.
                throw err;
            }
        }
        throw new Error(`Failed to bind to a port after ${maxAttempts} attempts starting at ${initialPort}`);
    };

    // If the library returned an object with httpServer
    if (botResult && typeof botResult === 'object') {
        // If httpServer is a function (some libs return a function to start)
        if (typeof botResult.httpServer === 'function') {
            console.log('DEBUG: calling botResult.httpServer(port, host) -> trying 0.0.0.0 (will retry on EADDRINUSE)');
            try {
                await tryPorts((p, h) => botResult.httpServer(p, h), startPort);
            } catch (e) {
                console.error('ERROR starting botResult.httpServer:', e && e.message);
            }
        } else if (botResult.httpServer && typeof botResult.httpServer.listen === 'function') {
            console.log('DEBUG: calling botResult.httpServer.listen(port, host) -> trying 0.0.0.0 (will retry on EADDRINUSE)');
            try {
                await tryPorts((p, h) => botResult.httpServer.listen(p, h), startPort);
            } catch (e) {
                console.error('ERROR starting botResult.httpServer.listen:', e && e.message);
            }
        } else if (typeof botResult.listen === 'function') {
            console.log('DEBUG: calling botResult.listen(port, host) -> trying 0.0.0.0 (will retry on EADDRINUSE)');
            try {
                await tryPorts((p, h) => botResult.listen(p, h), startPort);
            } catch (e) {
                console.error('ERROR starting botResult.listen:', e && e.message);
            }
        } else if (typeof botResult === 'function') {
            // Some implementations return a function you call with (port)
            console.log('DEBUG: calling createBot() result as function(port, host) -> trying 0.0.0.0 (will retry on EADDRINUSE)');
            try {
                await tryPorts((p, h) => botResult(p, h), startPort);
            } catch (e) {
                console.error('ERROR calling botResult as function:', e && e.message);
            }
        } else {
            console.log('DEBUG: createBot returned object but no httpServer/listen function found; keys:', Object.keys(botResult));
        }
    } else if (typeof botResult === 'function') {
        // if it returned a function directly
        console.log('DEBUG: createBot returned a function, calling with port');
        try { const maybe = botResult(startPort); logServerAddress(maybe, startPort); } catch (e) { console.error('ERROR calling createBot result:', e && e.message); }
    } else {
        console.log('DEBUG: createBot returned nothing useful; ensure the library starts any HTTP server itself.');
    }
};

// Export helpers for tests
// Re-export for compatibility with existing tests which import from the package
const { handlerHola } = require('./src/flows/handlers/hola');
const { handlerAyuda } = require('./src/flows/handlers/ayuda');
const { handlerHorarios } = require('./src/flows/handlers/horarios');
const { handlerConsulta } = require('./src/flows/handlers/consulta');
const { handlerReserva } = require('./src/flows/handlers/reserva');
const { handlerCambio } = require('./src/flows/handlers/cambio');
const { handlerBorrar } = require('./src/flows/handlers/borrar');
const { handlerGenerico } = require('./src/flows/handlers/generico');

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
    // Pass the environment values to the auth helper so it can build the
    // correct login URL and credentials. createApiClient already received the
    // same values above.
    fetchAuthToken(process.env.BASE_URL, process.env.USERNAME2, process.env.PASSWORD).catch((err) => {
        console.error('❌ Unhandled error in fetchAuthToken:', err);
    });

    main().catch((err) => {
        console.error('❌ Unhandled error in main:', err);
    });
}
