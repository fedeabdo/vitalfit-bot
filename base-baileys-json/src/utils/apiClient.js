const jwt = require('jsonwebtoken');
const axios = require('axios');

let authToken = null;
let tokenExpiry = null;
let currentClient = null; // singleton client used as a fallback by handlers

const fetchAuthToken = async (baseUrl, username, password) => {
  try {
    const response = await axios.post(`${baseUrl}/login`, {
      username,
      password,
    });
    authToken = response.data.token;
    const decodedToken = jwt.decode(authToken);
    tokenExpiry = decodedToken.exp * 1000;
    console.log('✅ Token refrescado con éxito', new Date(tokenExpiry).toISOString());
    return authToken;
  } catch (error) {
    throw error;
  }
};

const refreshAuthTokenIfNeeded = async (config) => {
  const { baseUrl, username, password } = config || {};
  const now = Date.now();
  if (!authToken || !tokenExpiry || now >= tokenExpiry - 60000) {
    await fetchAuthToken(baseUrl, username, password);
  }
};

const createApiClient = (config) => {
  const client = axios.create();
  client.interceptors.request.use(async (cfg) => {
    await refreshAuthTokenIfNeeded(config);
    if (authToken) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${authToken}`;
    }
    return cfg;
  }, (err) => Promise.reject(err));
  // store singleton reference so handlers/tests can access it as a fallback
  currentClient = client;
  return client;
};

const getApiClient = () => currentClient;

module.exports = { fetchAuthToken, refreshAuthTokenIfNeeded, createApiClient, getApiClient };
