const dotenv = require('dotenv');

dotenv.config();
// Low-level capture: wrap process.stderr.write to catch any direct writes
// (some libs write directly to stderr, bypassing console.error). If a
// message contains our auth error marker, we log a stack and a short
// snippet so we can trace the origin.
try {
    const origStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = function (...args) {
        try {
            const chunk = args[0];
            const s = typeof chunk === 'string' ? chunk : (chunk && chunk.toString && chunk.toString(args[1]) || '');
            if (s && (s.includes('⚡⚡ ERROR AUTH ⚡⚡') || s.includes('ERROR AUTH'))) {
                const stack = new Error().stack.split('\n').slice(2,10).map(s => s.trim()).join(' | ');
                console.log('DEBUG_STDERR_CAPTURE: matched stderr chunk ->', s.trim().slice(0,300));
                console.log('DEBUG_STDERR_CAPTURE_STACK:', stack);
            }
        } catch (e) { /* ignore */ }
        return origStderrWrite(...args);
    };
} catch (e) {
    console.warn('WARN: failed to wrap process.stderr.write', e && e.message);
}

// Instrument console.error and process-level errors to capture stack traces
// for unexpected error logs (helps locate origin of 'ERROR AUTH' messages).
(() => {
    const origErr = console.error.bind(console);
    console.error = (...args) => {
        try {
            const stack = new Error().stack.split('\n').slice(2,8).map(s => s.trim()).join(' | ');
            origErr('DEBUG_CONSOLE_ERROR_CALLER_STACK:', stack);
            origErr.apply(console, args);
        } catch (e) {
            origErr('DEBUG_CONSOLE_ERROR_WRAPPER_FAIL', e && e.message);
            origErr.apply(console, args);
        }
    };

    process.on('uncaughtException', (err) => {
        origErr('UNCAUGHT_EXCEPTION:', err && (err.stack || err));
        // rethrow to keep default behavior
        throw err;
    });

    process.on('unhandledRejection', (reason) => {
        origErr('UNHANDLED_REJECTION:', reason && (reason.stack || reason));
    });
})();

// Also wrap console.log to capture any direct 'ERROR AUTH' logs that use
// console.log instead of console.error.
try {
    const origLog = console.log.bind(console);
    const origErr2 = console.error.bind(console);
    console.log = (...args) => {
        try {
            const first = args && args[0];
            const asStr = typeof first === 'string' ? first : (first && first.toString && first.toString()) || '';
            if (asStr && (asStr.includes('⚡⚡ ERROR AUTH ⚡⚡') || asStr.includes('ERROR AUTH') || args.some(a => a === undefined))) {
                const stack = new Error().stack.split('\n').slice(2,8).map(s => s.trim()).join(' | ');
                origErr2('DEBUG_CONSOLE_LOG_CAPTURE:', asStr && asStr.slice(0,300));
                origErr2('DEBUG_CONSOLE_LOG_CAPTURE_STACK:', stack);
            }
        } catch (e) { /* ignore */ }
        return origLog.apply(console, args);
    };
} catch (e) { console.warn('WARN: failed to wrap console.log', e && e.message); }

// Wrap process.stdout.write too, similar to stderr
try {
    const origStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = function (...args) {
        try {
            const chunk = args[0];
            const s = typeof chunk === 'string' ? chunk : (chunk && chunk.toString && chunk.toString(args[1]) || '');
            if (s && (s.includes('⚡⚡ ERROR AUTH ⚡⚡') || s.includes('ERROR AUTH') || s.includes('undefined'))) {
                const stack = new Error().stack.split('\n').slice(2,10).map(s => s.trim()).join(' | ');
                console.log('DEBUG_STDOUT_CAPTURE: matched stdout chunk ->', s.trim().slice(0,300));
                console.log('DEBUG_STDOUT_CAPTURE_STACK:', stack);
            }
        } catch (e) { /* ignore */ }
        return origStdoutWrite(...args);
    };
} catch (e) {
    console.warn('WARN: failed to wrap process.stdout.write', e && e.message);
}

// Wrap process.exit to log a stack before exiting, in case provider calls it.
try {
    const origExit = process.exit.bind(process);
    process.exit = function (code) {
        try {
            const stack = new Error().stack.split('\n').slice(2,10).map(s => s.trim()).join(' | ');
            console.log('DEBUG_PROCESS_EXIT called with code:', code);
            console.log('DEBUG_PROCESS_EXIT_STACK:', stack);
        } catch (e) { /* ignore */ }
        return origExit(code);
    };
} catch (e) { console.warn('WARN: failed to wrap process.exit', e && e.message); }

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

    // Build a lightweight file-backed auth wrapper that exposes async get/set
    // for common keys. This helps Baileys v7 detect LID support even if the
    // provider doesn't expose the multi-file auth helper directly. It's a
    // best-effort shim that reads/writes JSON files under `./bot_sessions`.
    const fs = require('fs');
    const path = require('path');
    const sessionsDir = path.resolve('./bot_sessions');
    const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch (e) { return null; } };
    const writeJson = (p, v) => { try { fs.writeFileSync(p, JSON.stringify(v, null, 2), 'utf8'); return true; } catch (e) { return false; } };

    const fileAuth = {
        get: async (key) => {
            try {
                // map common keys to files
                if (key === 'creds' || key === 'creds.json') {
                    return readJson(path.join(sessionsDir, 'creds.json'));
                }
                if (key === 'device-index' || key === 'device-index.json') {
                    // attempt to read an explicit file, otherwise synthesize from lid mappings
                    const p = path.join(sessionsDir, 'device-index.json');
                    const v = readJson(p);
                    if (v) return v;
                    // synthesize minimal device-index from available lid-mapping files
                    const files = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir) : [];
                    const lids = files.filter(f => f.startsWith('lid-mapping-') && f.endsWith('.json'));
                    const idx = {};
                    lids.forEach((f, i) => { idx[i] = f.replace(/lid-mapping-(.*)\.json$/, '$1'); });
                    return Object.keys(idx).length ? idx : null;
                }
                if (key === 'lid-mapping' || key === 'lid-mapping.json') {
                    // merge available lid-mapping files
                    const files = fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir) : [];
                    const lids = files.filter(f => f.startsWith('lid-mapping') && f.endsWith('.json'));
                    const out = {};
                    for (const f of lids) {
                        const parsed = readJson(path.join(sessionsDir, f));
                        if (parsed && typeof parsed === 'object') {
                            Object.assign(out, parsed);
                        }
                    }
                    return Object.keys(out).length ? out : null;
                }
                // fallback: try reading `${key}.json`
                const fallback = readJson(path.join(sessionsDir, `${key}.json`));
                if (fallback) return fallback;
                return null;
            } catch (e) {
                return null;
            }
        },
        set: async (key, value) => {
            try {
                if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
                if (key === 'creds' || key === 'creds.json') return writeJson(path.join(sessionsDir,'creds.json'), value);
                if (key === 'device-index' || key === 'device-index.json') return writeJson(path.join(sessionsDir,'device-index.json'), value);
                if (key === 'lid-mapping' || key === 'lid-mapping.json') return writeJson(path.join(sessionsDir,'lid-mapping.json'), value);
                return writeJson(path.join(sessionsDir, `${key}.json`), value);
            } catch (e) { return false; }
        }
    };

    const adapterProvider = createProvider(BaileysProvider, {
        pathSession: './bot_sessions',
        // pass our shim as `auth` to the provider (best-effort; provider may ignore)
        auth: fileAuth
    });

    // Diagnostic: inspect adapterProvider shape
    try {
        console.log('DEBUG: adapterProvider type:', typeof adapterProvider);
        if (adapterProvider && typeof adapterProvider === 'object') {
            try { console.log('DEBUG: adapterProvider keys:', Object.keys(adapterProvider)); } catch (e) {}
        }
        if (adapterProvider && adapterProvider.provider) {
            try { console.log('DEBUG: adapterProvider.provider keys:', Object.keys(adapterProvider.provider)); } catch (e) {}
        }
    } catch (e) { /* ignore */ }

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

    // Deep-inspect botResult.provider to find where auth state lives
    try {
        if (botResult && botResult.provider) {
            try { console.log('DEBUG: botResult.provider keys:', Object.keys(botResult.provider)); } catch (e) {}
            const p = botResult.provider;
            const authProps = ['auth','authState','creds','saveCreds','saveCredsGlobal','getAuth','getCreds','authStateProvider','saveState','read','write'];
            for (const k of authProps) if (k in p) console.log(`DEBUG: provider has property '${k}'`);
            if (p.provider && typeof p.provider === 'object') {
                try { console.log('DEBUG: botResult.provider.provider keys:', Object.keys(p.provider)); } catch (e) {}
            }
            try { console.log('DEBUG: sample provider fields (first 20):', Object.keys(p).slice(0,20).map(k=>({k,type:typeof p[k]}))); } catch (e) {}
        } else {
            console.log('DEBUG: botResult.provider missing');
        }
    } catch (e) {
        console.warn('WARN: provider deep-inspect failed:', e && e.message);
    }

    // Attach generic instrumentation to emitters so we capture runtime events
    try {
        const maybeEmitter = botResult && (botResult.emitter || (botResult.provider && botResult.provider.emitter));
        if (maybeEmitter && typeof maybeEmitter.emit === 'function') {
            const origEmit = maybeEmitter.emit.bind(maybeEmitter);
            maybeEmitter.emit = function (ev, ...args) {
                try {
                    console.log('EVENT EMIT:', ev, (args && args.length) ? args.map(a => (typeof a === 'object' ? (a && a.constructor ? a.constructor.name : typeof a) : typeof a)) : 'no-args');
                } catch (e) {}
                return origEmit(ev, ...args);
            };
            // also hook 'on' to log listener additions
            if (typeof maybeEmitter.on === 'function') {
                const origOn = maybeEmitter.on.bind(maybeEmitter);
                maybeEmitter.on = function (ev, fn) {
                    console.log('EVENT LISTEN:', ev);
                    return origOn(ev, fn);
                };
            }
        }
    } catch (e) {
        console.warn('WARN: emitter instrumentation failed:', e && e.message);
    }

    // Inspect provider saveCreds* helpers (read-only diagnostics)
    try {
        const scNames = Object.keys(botResult.provider).filter(k => /saveCreds/i.test(k) || /saveCredsGlobal/i.test(k) || /saveCreds/i.test(k));
        console.log('DEBUG: detected saveCreds-like properties on provider:', scNames);
        for (const name of scNames) {
            try {
                const obj = botResult.provider[name];
                console.log(`DEBUG: provider.${name} typeof ->`, typeof obj);
                if (obj && typeof obj === 'object') {
                    try { console.log(`DEBUG: provider.${name} keys ->`, Object.keys(obj)); } catch (e) {}
                    try { console.log(`DEBUG: provider.${name} ownProps ->`, Object.getOwnPropertyNames(obj)); } catch (e) {}
                    try { console.log(`DEBUG: provider.${name} proto ->`, Object.getOwnPropertyNames(Object.getPrototypeOf(obj) || {})); } catch (e) {}
                    const candidateMethods = ['get','set','read','write','load','save','getItem','setItem'];
                    for (const m of candidateMethods) {
                        if (typeof obj[m] === 'function') console.log(`DEBUG: provider.${name}.${m} => function`);
                    }
                }
            } catch (e) {
                console.warn('WARN: inspecting provider saveCreds property', name, e && e.message);
            }
        }
    } catch (e) {
        console.warn('WARN: saveCreds inspect failed:', e && e.message);
    }

    // Instrument provider save functions (best-effort): replace any function
    // on saveCreds-like objects with a wrapper that logs a caller stack and
    // argument summary before calling the original. This helps capture which
    // module is emitting the undefined "ERROR AUTH" payload.
    try {
        const wrapSaveHelper = (obj, name) => {
            if (!obj || typeof obj !== 'object') return;
            const props = Object.getOwnPropertyNames(obj);
            for (const k of props) {
                try {
                    if (typeof obj[k] === 'function') {
                        const orig = obj[k].bind(obj);
                        obj[k] = function wrappedSave(...args) {
                            try {
                                const stack = new Error().stack.split('\n').slice(2,8).map(s => s.trim()).join(' | ');
                                console.log(`DEBUG_SAVE_WRAPPER: provider.${name}.${k} called, args:`, args && args.length ? args.map(a => (a === undefined ? 'undefined' : (typeof a))) : 'no-args');
                                console.log('DEBUG_SAVE_WRAPPER_STACK:', stack);
                            } catch (e) { console.warn('WARN: save wrapper logging failed', e && e.message); }
                            return orig(...args);
                        };
                    }
                } catch (e) {}
            }
        };

        const scNames2 = Object.keys(botResult && botResult.provider || {}).filter(k => /saveCreds/i.test(k) || /saveCredsGlobal/i.test(k));
        for (const name of scNames2) {
            try {
                wrapSaveHelper(botResult.provider[name], name);
                // also wrap nested provider shapes
                if (botResult.provider[name] && botResult.provider[name].provider) wrapSaveHelper(botResult.provider[name].provider, `${name}.provider`);
            } catch (e) {
                console.warn('WARN: failed to wrap provider save helper', name, e && e.message);
            }
        }
    } catch (e) {
        console.warn('WARN: saveCreds wrapper injection failed:', e && e.message);
    }

    // Test our fileAuth shim reads creds
    try {
        const creds = await fileAuth.get('creds');
        console.log('DEBUG: fileAuth.get("creds") ->', creds ? Object.keys(creds).slice(0,10) : null);
    } catch (e) {
        console.warn('WARN: fileAuth.get("creds") failed:', e && e.message);
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
