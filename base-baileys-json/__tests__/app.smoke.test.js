const { normalizeSenderNumber, withRateLimitAndRedirect } = require('..');

describe('app.js smoke tests', () => {
    test('normalizeSenderNumber extracts number before @', () => {
        expect(normalizeSenderNumber('123456789@c.us')).toBe('123456789');
        expect(normalizeSenderNumber('2950692905165@s.whatsapp.net')).toBe('2950692905165');
    });

    test('withRateLimitAndRedirect forwards messages for special user', async () => {
        const messagesSent = [];
        const mockProvider = {
            sendText: async (to, text) => {
                messagesSent.push({ to, text });
                return true;
            }
        };

        const mockFlowDynamicMessages = [];
        const mockFlowDynamic = async (msg) => {
            mockFlowDynamicMessages.push(msg);
            return true;
        };

        const wrapper = withRateLimitAndRedirect(async (ctx, tools) => {
            await tools.flowDynamic('Hello world');
        });

        const ctx = { from: '2950692905165@c.us' };
        const tools = { provider: mockProvider, flowDynamic: mockFlowDynamic };

        await wrapper(ctx, tools);

        expect(mockFlowDynamicMessages.length).toBe(1);
        expect(messagesSent.length).toBe(1);
        expect(messagesSent[0].to).toBe('59899285083@c.us');
        expect(messagesSent[0].text).toContain('Hello world');
    });
});
