// Minimal stub for tests/local runs when a Twilio provider is not available.
// This module should export IProvider and adapterProvider used by app.js.

class IProvider {}

const adapterProvider = {
  // Minimal server shim used by tests; real implementation should provide HTTP endpoints.
  server: {
    post: () => {}
  },
  // Provide a no-op sendText for forwarding in tests if used
  sendText: async (to, text) => {
    return true;
  }
};

module.exports = { IProvider, adapterProvider };
