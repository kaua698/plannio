import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { createStore } from './stores.js';

// Servidor para a sua máquina e para hospedagens com processo sempre ligado. Na Vercel, a entrada é api/index.js.
const config = loadConfig();
const production = config.nodeEnv === 'production';
// E2E só vale fora de produção: serve as telas prontas nos testes.
const e2e = Boolean(process.env.E2E) && !production;
const staticDir = production || e2e ? fileURLToPath(new URL('../../frontend/dist', import.meta.url)) : undefined;

const store = await createStore(config);
const app = createApp({ store, jwtSecret: config.jwtSecret, nodeEnv: config.nodeEnv, staticDir, appUrl: config.appUrl });
const server = app.listen(config.port, () => console.log(`Plannio em http://localhost:${config.port}`));

const encerrar = () => server.close(() => process.exit(0));
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
