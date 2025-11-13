const {
    normalizeSenderNumber,
    withRateLimitAndRedirect,
    apiClient,
    handlerHola,
    handlerAyuda,
    handlerHorarios,
    handlerConsulta,
    handlerReserva,
    handlerCambio,
    handlerBorrar,
    handlerGenerico
} = require('..');

// Helper to create mock tools
const makeTools = (overrides = {}) => {
    const messages = [];
    const mock = {
        provider: {
            sendText: async (to, text) => messages.push({ to, text })
        },
        flowDynamic: async (msg) => messages.push({ flowDynamic: msg })
    };
    return { mock, messages, tools: { ...mock, ...overrides } };
}

describe('flow handlers smoke tests', () => {
    test('handlerHola runs without throwing', async () => {
        const { tools } = makeTools();
        await expect(handlerHola({}, tools)).resolves.not.toThrow();
    });

    test('handlerAyuda runs without throwing', async () => {
        const { tools } = makeTools();
        await expect(handlerAyuda({}, tools)).resolves.not.toThrow();
    });

    test('handlerHorarios calls apiClient.get and flowDynamic', async () => {
        const { tools, messages } = makeTools();
        // stub apiClient.get
        const originalGet = apiClient.get;
        apiClient.get = async () => ({ data: { dia: 'Lunes', horarios: [{ hora: '20:30', disponible: true, lugaresDisponibles: 2 }] } });
        await handlerHorarios({}, tools);
        expect(messages.some(m => m.flowDynamic && m.flowDynamic.includes('20:30'))).toBe(true);
        apiClient.get = originalGet;
    });

    test('handlerConsulta validates and calls api', async () => {
        const { tools, messages } = makeTools();
        const originalGet = apiClient.get;
        apiClient.get = async () => ({ data: { hora: '20:30' } });
        await handlerConsulta({ body: 'consulta 123456' }, tools);
        expect(messages.some(m => m.flowDynamic && m.flowDynamic.includes('20:30'))).toBe(true);
        apiClient.get = originalGet;
    });

    test('handlerReserva makes a post and replies', async () => {
        const { tools, messages } = makeTools();
        const originalPost = apiClient.post;
        apiClient.post = async () => ({ data: { success: true } });
        await handlerReserva({ body: 'reserva 20:30 123456' }, tools);
        expect(messages.some(m => m.flowDynamic && m.flowDynamic.includes('Confirmada'))).toBe(true);
        apiClient.post = originalPost;
    });

    test('handlerCambio makes a put and replies', async () => {
        const { tools, messages } = makeTools();
        const originalPut = apiClient.put;
        apiClient.put = async () => ({ data: { success: true } });
        await handlerCambio({ body: 'cambio 20:30 123456' }, tools);
        expect(messages.some(m => m.flowDynamic && m.flowDynamic.includes('Confirmado'))).toBe(true);
        apiClient.put = originalPut;
    });

    test('handlerBorrar makes a delete and replies', async () => {
        const { tools, messages } = makeTools();
        const originalDelete = apiClient.delete;
        apiClient.delete = async () => ({ data: { success: true } });
        await handlerBorrar({ body: 'borrar 123456' }, tools);
        expect(messages.some(m => m.flowDynamic && m.flowDynamic.includes('Confirmado'))).toBe(true);
        apiClient.delete = originalDelete;
    });

    test('handlerGenerico runs without throwing', async () => {
        const { tools } = makeTools();
        await expect(handlerGenerico({}, tools)).resolves.not.toThrow();
    });
});
