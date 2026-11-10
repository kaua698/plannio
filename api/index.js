import { createApp } from '../backend/src/app.js';
import { loadConfig } from '../backend/src/config.js';
import { createStore } from '../backend/src/stores.js';

// Entrada do servidor na Vercel. As telas são arquivos estáticos; só /api chega aqui (veja vercel.json).
const config = loadConfig();
const store = await createStore(config);

export default createApp({ store, jwtSecret: config.jwtSecret, nodeEnv: config.nodeEnv, appUrl: config.appUrl });
