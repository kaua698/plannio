import { Router } from 'express';
import { API_ROUTES } from '@plannio/shared/core/routes';
import { handle } from '../lib/errors.js';
import { clientClock } from '../middlewares/clientClock.js';

// Monta a tabela de rotas do núcleo, todas atrás da sessão.
export function dataRoutes({ store, auth, clock }) {
  const r = Router();
  const checkClock = clientClock(clock);
  for (const route of API_ROUTES) {
    r[route.method.toLowerCase()](route.path, auth, checkClock, handle(async (req, res) => {
      const data = await route.handler({ store, uid: req.userId, params: req.params, query: req.query, body: req.body });
      if (route.status === 204) res.status(204).end();
      else res.status(route.status).json(data);
    }));
  }
  return r;
}
