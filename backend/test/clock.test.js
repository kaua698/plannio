import { beforeEach, describe, expect, test } from 'vitest';
import { signUp, testApp } from './helpers.js';

const MSG = 'A data do seu aparelho parece errada. Ajuste e tente de novo.';
let app;
let store;
let ana;
const atividades = () => store.snapshot().activities.length;

// O relógio dos testes está em 2026-11-04. O navegador continua decidindo o dia, dentro de uma margem de 2 dias.
beforeEach(async () => {
  ({ app, store } = testApp());
  ana = await signUp(app);
  await ana.post('/api/routines').send({ name: 'Ler', startMinutes: 600, endMinutes: 630, frequency: 'DAILY', startDate: '2026-11-04', now: { date: '2026-11-04', minutes: 480 } });
});

describe('data enviada pelo navegador', () => {
  test.each([
    ['ofensiva', () => ana.get('/api/streak').query({ today: '2046-11-08' })],
    ['agenda', () => ana.get('/api/activities').query({ from: '2036-11-03', to: '2036-11-04', nowDate: '2036-01-01' })],
    ['progresso', () => ana.get('/api/progress').query({ weekStart: '2036-11-03', today: '2036-11-04', minutes: 600 })],
    ['criar', () => ana.post('/api/activities').send({ name: 'x', date: '2036-11-04', startMinutes: 600, endMinutes: 630, now: { date: '2036-11-04', minutes: 0 } })],
  ])('%s: data distante responde 400 e não cria linhas', async (_, chamada) => {
    const antes = atividades();
    const res = await chamada();
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: MSG });
    expect(res.body.error.fields).toHaveProperty('now');
    expect(atividades()).toBe(antes);
  });

  test('aceita até 2 dias de diferença, para qualquer fuso horário', async () => {
    for (const today of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']) {
      expect((await ana.get('/api/streak').query({ today })).status, today).toBe(200);
    }
    expect((await ana.get('/api/streak').query({ today: '2026-11-07' })).status).toBe(400);
  });

  test('progresso além de dois anos, com o dia atual certo, responde 400', async () => {
    const antes = atividades();
    const res = await ana.get('/api/progress').query({ weekStart: '2036-11-03', today: '2026-11-04', minutes: 600 });
    expect(res.status).toBe(400);
    expect(atividades()).toBe(antes);
  });
});
