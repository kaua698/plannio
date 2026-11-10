import { getUser, unauthenticated } from '@plannio/shared/core/index';
import { handle } from '../lib/errors.js';
import { isSessionActive } from '../services/sessions.js';

// Confere o cookie, a sessão no banco e se a conta ainda existe; define req.userId e req.sessionId.
export const requireAuth = ({ store, session, clock }) => handle(async (req, res, next) => {
  const atual = session.read(req);
  if (!atual || !(await isSessionActive(store, atual, clock))) throw unauthenticated();
  await getUser(store, atual.userId);
  req.userId = atual.userId;
  req.sessionId = atual.sessionId;
  next();
});
