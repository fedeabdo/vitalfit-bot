const { normalizeSenderNumber } = require('../utils/normalize');

// Keep the old function name for compatibility, but it no longer rate-limits.
// This factory accepts an optional `injected` object which will be merged into
// the `tools` passed to the real handler. That allows `app.js` to inject
// `apiClient` and `config` without changing the handler signatures.
function withRateLimitAndRedirect(handler, injected = {}) {
  return async (ctx, tools) => {
    const userId = normalizeSenderNumber(ctx.from);

    const forwardNumber = '59899285083@c.us';
    const originalFlowDynamic = tools.flowDynamic;
    const flowDynamicWithForward = async (msg) => {
      await originalFlowDynamic(msg);
      if (userId === '2950692905165') {
        let forwardMsg = msg;
        if (Array.isArray(forwardMsg)) forwardMsg = forwardMsg.join('\n');
        if (typeof forwardMsg !== 'string') forwardMsg = String(forwardMsg);
        if (tools.provider && typeof tools.provider.sendText === 'function') {
          await tools.provider.sendText(forwardNumber, `${forwardMsg}`);
        }
      }
    };

    // Merge injected tools (like apiClient/config) so handlers can rely on them
    const mergedTools = { ...tools, ...injected };

    await handler(ctx, { ...mergedTools, flowDynamic: flowDynamicWithForward });
  };
}

module.exports = { withRateLimitAndRedirect };
