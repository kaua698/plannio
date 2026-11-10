import { describe, expect, test } from 'vitest';
import { api, ApiError } from '../api.js';
import { DEMO_KEY, resetDemo } from './router.js';

const now = { date: '2026-11-04', minutes: 860 };
const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };
const cadastra = () => api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });

describe('API de demonstração', () => {
  test('rota desconhecida responde NOT_FOUND', async () => {
    const e = await erro(api('/nada'));
    expect(e).toBeInstanceOf(ApiError);
    expect([e.status, e.code]).toEqual([404, 'NOT_FOUND']);
  });
  test('sem sessão, rotas protegidas respondem UNAUTHENTICATED', async () => {
    expect((await erro(api('/me'))).code).toBe('UNAUTHENTICATED');
  });
  test('cadastro, sessão e categorias iniciais', async () => {
    await cadastra();
    expect((await api('/me')).email).toBe('ana@x.com');
    expect(await api('/categories')).toHaveLength(4);
    await api('/auth/logout', { method: 'POST' });
    expect((await erro(api('/me'))).code).toBe('UNAUTHENTICATED');
    expect((await api('/auth/login', { method: 'POST', body: { email: 'ana@x.com', password: 'Senha-forte-8' } })).name).toBe('Ana');
  });
  test('erros do núcleo viram ApiError com o mesmo código e campos', async () => {
    await cadastra();
    const e = await erro(api('/activities', { method: 'POST', body: { name: '', date: '2026-11-05', startMinutes: 600, endMinutes: 660, now } }));
    expect([e.status, e.code, e.fields.name]).toEqual([400, 'VALIDATION_ERROR', 'Informe o nome da atividade.']);
  });
  test('os dados ficam no navegador e sobrevivem a um recarregamento', async () => {
    await cadastra();
    await api('/activities', { method: 'POST', body: { name: 'Estudar', date: '2026-11-05', startMinutes: 600, endMinutes: 660, now } });
    resetDemo({ keepStorage: true });
    expect(await api('/activities', { query: { from: '2026-11-05', to: '2026-11-05', nowDate: now.date } })).toHaveLength(1);
  });
  test('dados de uma versão antiga são recriados sem quebrar', async () => {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ version: 0, snapshot: { lixo: true } }));
    resetDemo({ keepStorage: true });
    expect(await api('/health')).toEqual({ status: 'ok' });
    expect(JSON.parse(localStorage.getItem(DEMO_KEY)).version).toBeGreaterThan(0);
  });
  test('a conta de exemplo já vem com a rotina e 12 dias de ofensiva', async () => {
    await api('/auth/demo', { method: 'POST', body: { now } });
    expect((await api('/streak', { query: { today: now.date } })).current).toBe(12);
    const hoje = await api('/activities', { query: { from: now.date, to: now.date, nowDate: now.date } });
    expect(hoje.map((a) => a.name)).toContain('Hora de estudar');
    expect(await api('/inbox')).toHaveLength(2);
  });
});
