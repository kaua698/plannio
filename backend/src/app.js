import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createHasher } from './lib/password.js';
import { createSession } from './lib/session.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { errorHandler, notFoundRoute } from './middlewares/errorHandler.js';
import { noStore, sameOrigin } from './middlewares/security.js';
import { authRoutes, meRoutes } from './routes/auth.js';
import { dataRoutes } from './routes/data.js';

// Monta o Express sem escutar porta. O store (memória ou Postgres) vem de fora.
export function createApp({
  store, jwtSecret, nodeEnv = 'development', hashParams, clock = Date.now, staticDir, appUrl = 'http://localhost:5173',
} = {}) {
  if (!store) throw new Error('createApp precisa de um store.');
  if (!jwtSecret) throw new Error('createApp precisa de jwtSecret.');
  const production = nodeEnv === 'production';
  const hasher = createHasher(hashParams);
  const session = createSession({ jwtSecret, secure: production });
  const auth = requireAuth({ store, session, clock });
  const deps = { store, hasher, session, auth, clock };

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: production ? [] : null } } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(noStore, sameOrigin(appUrl));
  api.get('/health', (req, res) => res.json({ status: 'ok' }));
  api.use('/auth', authRoutes(deps));
  api.use('/me', meRoutes(deps));
  api.use(dataRoutes(deps));
  api.use(notFoundRoute);
  app.use('/api', api);
  if (staticDir) {
    app.use(express.static(staticDir));
    // Rotas do React devolvem a página; caminhos com extensão são arquivos que não existem.
    app.get('*', (req, res, next) => (path.extname(req.path) ? next() : res.sendFile(path.join(staticDir, 'index.html'))));
  }
  app.use(errorHandler);
  return app;
}
