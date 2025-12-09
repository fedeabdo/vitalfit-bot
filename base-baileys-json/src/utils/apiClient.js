const jwt = require('jsonwebtoken');
const axios = require('axios');

let authToken = null;
let tokenExpiry = null;
let currentClient = null; // singleton client used as a fallback by handlers

const fetchAuthToken = async (baseUrl, username, password) => {
  // fallbacks por si vienen undefined
  const finalBaseUrl = baseUrl || process.env.BASE_URL;
  const finalUsername = username ?? process.env.USERNAME;
  const finalPassword = password ?? process.env.PASSWORD;

  try {
    console.log('DEBUG fetchAuthToken payload =>', {
      baseUrl: finalBaseUrl,
      username: finalUsername,
      password: finalPassword,
    });

    const response = await axios.post(`${finalBaseUrl}/login`, {
      username: finalUsername,
      password: finalPassword,
    });

    authToken = response.data.token;
    const decodedToken = jwt.decode(authToken);
    tokenExpiry = decodedToken.exp * 1000;
    console.log('✅ Token refrescado con éxito', new Date(tokenExpiry).toISOString());
    return authToken;
  } catch (error) {
    console.error(
      '❌ Unhandled error in fetchAuthToken:',
      error.response?.data || error.message
    );
    throw error;
  }
};

const refreshAuthTokenIfNeeded = async (config) => {
  const baseUrl = config?.baseUrl || process.env.BASE_URL;
  const username = config?.username ?? process.env.USERNAME;
  const password = config?.password ?? process.env.PASSWORD;

  const now = Date.now();
  if (!authToken || !tokenExpiry || now >= tokenExpiry - 60000) {
    await fetchAuthToken(baseUrl, username, password);
  }
};

const createApiClient = (config) => {
  const client = axios.create();
  client.interceptors.request.use(
    async (cfg) => {
      await refreshAuthTokenIfNeeded(config);
      if (authToken) {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${authToken}`;
      }
      return cfg;
    },
    (err) => Promise.reject(err)
  );
  currentClient = client;
  return client;
};

const getApiClient = () => currentClient;

module.exports = { fetchAuthToken, refreshAuthTokenIfNeeded, createApiClient, getApiClient };
