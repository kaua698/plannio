import request from 'supertest';
import { beforeEach, describe, expect, test } from 'vitest';
import { API_ROUTES } from '@plannio/shared/core/routes';
import { signUp, testApp } from './helpers.js';

const now = { date: '2026-11-04', minutes: 480 };

describe('entradas hostis', () => {
  let app;
  beforeEach(() => { ({ app } = testApp()); });

  const LIXO = [123, null, true, [], ['a'], { $ne: null }, { a: { b: 1 } }, 'x'.repeat(5000)];

  test.each(LIXO.map((v) => [JSON.stringify(v).slice(0, 30), v]))('valor %s nos campos de conta nunca derruba o servidor', async (_, v) => {
    for (const [rota, corpo] of [
      ['/api/auth/login', { email: v, password: v }],
      ['/api/auth/register', { name: v, email: v, password: v }],
    ]) {
      const res = await request(app).post(rota).send(corpo);
      expect(res.status, `${rota} ${JSON.stringify(v).slice(0, 30)}`).toBeLessThan(500);
    }
  });

  test('JSON quebrado responde 400, sem detalhes internos', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|node_modules|at JSON/);
  });

  test('corpo acima do limite é recusado', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@x.com', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(JSON.stringify(res.body)).not.toMatch(/PayloadTooLarge|node_modules/);
  });

  test('o cadastro ignora campos que a pessoa não pode definir', async () => {
    const agent = await signUp(app, { id: 'id-escolhido', passwordHash: 'x', role: 'ADMIN' });
    expect(agent.user.id).not.toBe('id-escolhido');
    expect(agent.user.role).toBeUndefined();
  });

  test('editar o perfil não troca e-mail, senha nem verificação', async () => {
    const agent = await signUp(app);
    const res = await agent.patch('/api/me').send({ name: 'Nova', email: 'outra@x.com', passwordHash: 'x', id: 'outro' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Nova', email: 'ana@x.com', id: agent.user.id });
  });

  test('criar atividade não aceita o dono vindo do corpo', async () => {
    const ana = await signUp(app);
    const bia = await signUp(app, { email: 'bia@x.com', name: 'Bia' });
    const res = await ana.post('/api/activities').send({ name: 'Minha', date: now.date, startMinutes: 600, endMinutes: 660, now, userId: bia.user.id });
    expect(res.status).toBe(201);
    expect((await bia.get('/api/activities').query({ from: now.date, to: now.date, nowDate: now.date })).body).toEqual([]);
    expect((await ana.get(`/api/activities/${res.body.id}`)).status).toBe(200);
  });
});

describe('uma conta não alcança os dados de outra', () => {
  test('todas as rotas com identificador recusam o de outra conta', async () => {
    const { app } = testApp();
    const ana = await signUp(app);
    const bia = await signUp(app, { email: 'bia@x.com', name: 'Bia' });

    const categoria = (await ana.get('/api/categories')).body[0];
    const atividade = (await ana.post('/api/activities').send({ name: 'Particular', date: now.date, startMinutes: 600, endMinutes: 660, steps: [{ title: 'Passo' }], now })).body;
    const rotina = (await ana.post('/api/routines').send({ name: 'Acordar', startMinutes: 390, endMinutes: 420, frequency: 'WEEKDAYS', startDate: now.date, now })).body;
    const inbox = (await ana.post('/api/activities').send({ name: 'Ler', estimatedMinutes: 30, date: now.date, startMinutes: 700, endMinutes: 730, now })).body;
    await ana.post(`/api/activities/${inbox.id}/inbox`).send({ now });
    const historico = (await ana.get('/api/history')).body.items[0];
    expect(historico).toBeTruthy();

    const IDS = { '/categories': categoria.id, '/activities': atividade.id, '/inbox': inbox.id, '/routines': rotina.id, '/history': historico.id };
    const rotas = API_ROUTES.filter((r) => r.path.includes(':id'));
    expect(rotas.length).toBeGreaterThanOrEqual(14);

    for (const r of rotas) {
      const base = Object.keys(IDS).find((k) => r.path.startsWith(k));
      const caminho = `/api${r.path.replace(':id', IDS[base]).replace(':stepId', 'qualquer')}`;
      const res = await bia[r.method.toLowerCase()](caminho).send({ now, name: 'Invadida', scope: 'SERIES', status: 'DONE', done: true, estimatedMinutes: 30, requestId: 'x', targetVersion: 1 });
      // 404 quando o corpo é válido; 400 quando a validação vem antes. Nunca sucesso, e nunca revela o dado.
      expect([400, 404], `${r.method} ${caminho}`).toContain(res.status);
      expect(JSON.stringify(res.body)).not.toContain('Particular');
    }

    expect((await ana.get(`/api/activities/${atividade.id}`)).body.name).toBe('Particular');
    expect((await ana.get(`/api/routines/${rotina.id}`)).body.name).toBe('Acordar');
    expect((await ana.get('/api/categories')).body.map((c) => c.name)).toContain(categoria.name);
  });
});
