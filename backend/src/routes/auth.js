import { Router } from 'express';
import * as core from '@plannio/shared/core/index';
import { handle } from '../lib/errors.js';
import { isSessionActive, openSession, revokeSession } from '../services/sessions.js';

export function authRoutes({ store, hasher, session, clock }) {
  const r = Router();

  async function iniciarSessao(res, userId) {
    const s = await openSession(store, userId, clock);
    session.write(res, userId, s.id);
  }

  // Saber se há alguém entrado não é um erro: visitante recebe 200 e nenhum usuário.
  r.get('/session', handle(async (req, res) => {
    const atual = session.read(req);
    if (!atual || !(await isSessionActive(store, atual, clock))) { res.json({ user: null }); return; }
    res.json({ user: await core.getUser(store, atual.userId) });
  }));

  r.post('/register', handle(async (req, res) => {
    const user = await core.registerUser(store, req.body ?? {}, hasher);
    await iniciarSessao(res, user.id);
    res.status(201).json(user);
  }));

  r.post('/login', handle(async (req, res) => {
    const user = await core.loginUser(store, req.body ?? {}, hasher);
    await iniciarSessao(res, user.id);
    res.json(user);
  }));

  r.post('/logout', handle(async (req, res) => {
    const atual = session.read(req);
    if (atual) await revokeSession(store, atual, clock);
    session.clear(res);
    res.status(204).end();
  }));

  return r;
}

export function meRoutes({ store, hasher, session, auth }) {
  const r = Router();
  r.use(auth);
  r.get('/', handle(async (req, res) => { res.json(await core.getUser(store, req.userId)); }));
  r.patch('/', handle(async (req, res) => {
    const { name, theme, planningStart, planningEnd } = req.body ?? {};
    const input = Object.fromEntries(Object.entries({ name, theme, planningStart, planningEnd }).filter(([k]) => k in (req.body ?? {})));
    res.json(await core.updateUser(store, req.userId, input));
  }));
  r.delete('/', handle(async (req, res) => {
    await core.deleteUser(store, req.userId, req.body ?? {}, hasher);
    session.clear(res);
    res.status(204).end();
  }));
  return r;
}
