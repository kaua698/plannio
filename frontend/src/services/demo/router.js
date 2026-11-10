import * as core from '@plannio/shared/core/index';
import { API_ROUTES } from '@plannio/shared/core/routes';
import { seedDemo } from './seed.js';

// API de demonstração: mesmas rotas e respostas da API real, com os dados no localStorage.
export const DEMO_KEY = 'plannio-demo-v1';
const VERSION = 1;
const DEMO_EMAIL = 'exemplo@plannio.app';
const DEMO_PASSWORD = 'plannio-exemplo';

let store = null;
let sessionUserId = null;

const hasher = {
  async hash(password) {
    const data = new TextEncoder().encode(`plannio-demo:${password}`);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },
  async verify(password, hash) { return (await this.hash(password)) === hash; },
};

function load() {
  if (store) return;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch { saved = null; }
  const valid = saved && saved.version === VERSION && saved.snapshot && Array.isArray(saved.snapshot.users);
  store = core.createMemoryStore(valid ? saved.snapshot : undefined);
  sessionUserId = valid ? saved.sessionUserId ?? null : null;
  if (!valid) persist();
}

function persist() {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ version: VERSION, snapshot: store.snapshot(), sessionUserId }));
  } catch { /* armazenamento indisponível: a demonstração segue só em memória */ }
}

export function resetDemo({ keepStorage = false } = {}) {
  store = null;
  sessionUserId = null;
  if (!keepStorage) {
    try { localStorage.removeItem(DEMO_KEY); } catch { /* ignora */ }
  }
}

const routes = [];
const on = (method, pattern, handler, { open = false, status = 200 } = {}) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, handler, open, status });
};

const S = () => store;

on('GET', '/health', async () => ({ status: 'ok' }), { open: true });
on('POST', '/auth/register', async ({ body }) => {
  const u = await core.registerUser(S(), body, hasher);
  sessionUserId = u.id;
  return u;
}, { open: true, status: 201 });
on('POST', '/auth/login', async ({ body }) => {
  const u = await core.loginUser(S(), body, hasher);
  sessionUserId = u.id;
  return u;
}, { open: true });
on('POST', '/auth/demo', async ({ body }) => {
  let u;
  try {
    u = await core.loginUser(S(), { email: DEMO_EMAIL, password: DEMO_PASSWORD }, hasher);
  } catch {
    u = await core.registerUser(S(), { name: 'Visitante', email: DEMO_EMAIL, password: DEMO_PASSWORD }, hasher);
    await seedDemo(S(), u.id, body.now);
  }
  sessionUserId = u.id;
  return u;
}, { open: true });
on('POST', '/auth/logout', async () => { sessionUserId = null; return null; }, { open: true, status: 204 });

on('GET', '/auth/session', async () => ({ user: sessionUserId ? await core.getUser(S(), sessionUserId).catch(() => null) : null }), { open: true });
on('GET', '/me', ({ uid }) => core.getUser(S(), uid));
on('PATCH', '/me', ({ uid, body }) => core.updateUser(S(), uid, body));
on('DELETE', '/me', async ({ uid, body }) => { await core.deleteUser(S(), uid, body, hasher); sessionUserId = null; return null; }, { status: 204 });

// As rotas de dados são as mesmas do servidor.
for (const r of API_ROUTES) {
  on(r.method, r.path, ({ uid, p, query, body }) => r.handler({ store: S(), uid, params: p, query, body }), { status: r.status });
}

const errorBody = (e) => ({ error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}), ...(e.overlaps ? { overlaps: e.overlaps } : {}) } });

export async function handleDemo({ method, path, query, body }) {
  load();
  const route = routes.find((r) => r.method === method && r.re.test(path));
  if (!route) return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } } };
  const values = route.re.exec(path).slice(1).map(decodeURIComponent);
  const p = Object.fromEntries(route.keys.map((k, i) => [k, values[i]]));
  try {
    if (!route.open) {
      if (!sessionUserId) throw new core.AppError(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.');
      await core.getUser(S(), sessionUserId);
    }
    const data = await route.handler({ uid: sessionUserId, p, query, body });
    persist();
    return { status: route.status, body: route.status === 204 ? null : data };
  } catch (e) {
    if (e instanceof core.AppError) {
      if (e.code === 'UNAUTHENTICATED') { sessionUserId = null; persist(); }
      return { status: e.status, body: errorBody(e) };
    }
    console.error(e);
    return { status: 500, body: { error: { code: 'INTERNAL', message: 'Algo deu errado. Tente novamente.' } } };
  }
}
