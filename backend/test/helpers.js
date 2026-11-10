import request from 'supertest';
import { createMemoryStore } from '@plannio/shared/core/index';
import { createApp } from '../src/app.js';

// Relógio fixo: as datas dos testes giram em torno deste dia.
export const CLOCK = () => Date.parse('2026-11-04T12:00:00Z');
export const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

// App de teste: banco em memória novo e hash rápido.
export function testApp(options = {}) {
  const store = options.store || createMemoryStore();
  const app = createApp({ store, jwtSecret: SECRET, hashParams: { rounds: 4 }, clock: CLOCK, ...options });
  return { app, store };
}

export async function signUp(app, overrides = {}) {
  const agent = request.agent(app);
  const body = { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8', ...overrides };
  const res = await agent.post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`cadastro falhou: ${res.status} ${JSON.stringify(res.body)}`);
  agent.user = res.body;
  return agent;
}
