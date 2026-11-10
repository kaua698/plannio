import request from 'supertest';
import { beforeEach, describe, expect, test } from 'vitest';
import { signUp, testApp } from './helpers.js';

const now = { date: '2026-11-04', minutes: 480 };
const antes = { date: '2026-11-03', minutes: 0 };
let app;
let ana;
let bia;

const nova = (agent, body) => agent.post('/api/activities').send({ name: 'Estudar', date: '2026-11-05', startMinutes: 840, endMinutes: 930, now, ...body });

beforeEach(async () => {
  ({ app } = testApp());
  ana = await signUp(app);
  bia = await signUp(app, { name: 'Bia', email: 'bia@x.com' });
});

describe('proteção e formato', () => {
  test('rotas de dados exigem sessão', async () => {
    for (const [m, p] of [['get', '/api/categories'], ['get', '/api/activities'], ['post', '/api/routines'], ['get', '/api/progress'], ['get', '/api/history']]) {
      const res = await request(app)[m](p);
      expect(res.status, `${m} ${p}`).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('categorias', () => {
  test('CRUD com códigos de status e meta', async () => {
    const c = await ana.post('/api/categories').send({ name: 'Leitura', color: 'VIOLETA', weeklyGoalMinutes: 360 });
    expect(c.status).toBe(201);
    expect(c.body).toMatchObject({ name: 'Leitura', color: 'VIOLETA', weeklyGoalMinutes: 360 });
    expect((await ana.patch(`/api/categories/${c.body.id}`).send({ weeklyGoalMinutes: null })).body.weeklyGoalMinutes).toBeNull();
    expect((await ana.delete(`/api/categories/${c.body.id}`)).status).toBe(204);
    expect((await ana.get('/api/categories')).body.map((x) => x.name)).not.toContain('Leitura');
  });

  test('nome duplicado 409, cor fora da biblioteca 400, meta zero 400', async () => {
    expect((await ana.post('/api/categories').send({ name: 'Estudos', color: 'AZUL' })).body.error.code).toBe('NAME_TAKEN');
    const cor = await ana.post('/api/categories').send({ name: 'X', color: '#123456' });
    expect(cor.status).toBe(400);
    expect(cor.body.error.fields).toHaveProperty('color');
    expect((await ana.post('/api/categories').send({ name: 'Y', color: 'AZUL', weeklyGoalMinutes: 0 })).status).toBe(400);
  });

  test('categoria de outro usuário responde 404', async () => {
    const [c] = (await ana.get('/api/categories')).body;
    expect((await bia.patch(`/api/categories/${c.id}`).send({ name: 'Minha' })).status).toBe(404);
    expect((await bia.delete(`/api/categories/${c.id}`)).status).toBe(404);
  });
});

describe('atividades', () => {
  test('cria com 201, valida com fields e mensagens da spec (CA03)', async () => {
    expect((await nova(ana)).status).toBe(201);
    const res = await nova(ana, { name: ' ', startMinutes: 900, endMinutes: 840 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({ name: 'Informe o nome da atividade.', endMinutes: 'O término precisa ser depois do início.' });
  });

  test('sobreposição responde 409 OVERLAP com a lista; allowOverlap salva', async () => {
    await nova(ana);
    const res = await nova(ana, { name: 'Inglês', startMinutes: 900, endMinutes: 960 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OVERLAP');
    expect(res.body.error.overlaps.map((o) => o.name)).toEqual(['Estudar']);
    expect((await nova(ana, { name: 'Inglês', startMinutes: 900, endMinutes: 960, allowOverlap: true })).status).toBe(201);
  });

  test('lista por intervalo: mais de 62 dias ou além de 2 anos responde 400', async () => {
    const ok = await ana.get('/api/activities').query({ from: '2026-11-02', to: '2026-11-08', nowDate: now.date });
    expect(ok.status).toBe(200);
    expect((await ana.get('/api/activities').query({ from: '2026-11-01', to: '2027-01-15', nowDate: now.date })).status).toBe(400);
    expect((await ana.get('/api/activities').query({ from: '2028-11-05', to: '2028-11-06', nowDate: now.date })).status).toBe(400);
    expect((await nova(ana, { date: '2028-11-05' })).status).toBe(400);
  });

  test('atividade de outro usuário: GET, PATCH, DELETE, status e etapa respondem 404 (CA02)', async () => {
    const a = (await nova(ana, { steps: ['Ler'] })).body;
    expect((await bia.get(`/api/activities/${a.id}`)).status).toBe(404);
    expect((await bia.patch(`/api/activities/${a.id}`).send({ name: 'x', now })).status).toBe(404);
    expect((await bia.delete(`/api/activities/${a.id}`).send({ now })).status).toBe(404);
    expect((await bia.post(`/api/activities/${a.id}/status`).send({ status: 'DONE' })).status).toBe(404);
    expect((await bia.patch(`/api/activities/${a.id}/steps/${a.steps[0].id}`).send({ done: true })).status).toBe(404);
    expect((await ana.get(`/api/activities/${a.id}`)).status).toBe(200);
  });

  test('status, etapas e exclusão', async () => {
    const a = (await nova(ana, { steps: ['Ler'] })).body;
    const st = await ana.post(`/api/activities/${a.id}/status`).send({ status: 'PARTIAL', actualStart: 840, actualEnd: 900 });
    expect(st.body).toMatchObject({ status: 'PARTIAL', actualStart: 840, actualEnd: 900 });
    expect((await ana.post(`/api/activities/${a.id}/status`).send({ status: 'PARTIAL', actualStart: 900, actualEnd: 840 })).status).toBe(400);
    const step = await ana.patch(`/api/activities/${a.id}/steps/${a.steps[0].id}`).send({ done: true });
    expect(step.status).toBe(200);
    expect((await ana.delete(`/api/activities/${a.id}`).send({ now })).status).toBe(204);
    expect((await ana.get(`/api/activities/${a.id}`)).status).toBe(404);
  });

  test('Inbox e cópia de dia', async () => {
    const item = await ana.post('/api/activities').send({ name: 'Ler artigo', now });
    expect(item.status).toBe(201);
    expect((await ana.get('/api/inbox')).body.map((i) => [i.name, i.estimatedMinutes])).toEqual([['Ler artigo', 30]]);
    await nova(ana, { date: '2026-11-04' });
    const copy = await ana.post('/api/days/2026-11-06/copy').send({ fromDate: '2026-11-04', now });
    expect(copy.body).toEqual({ copied: 1, skipped: 0 });
    expect((await ana.post('/api/days/2026-11-03/copy').send({ fromDate: '2026-11-04', now })).status).toBe(400);
  });
});

describe('repetições', () => {
  const rotina = (agent, extra = {}) => agent.post('/api/routines').send({
    name: 'Acordar', startMinutes: 390, endMinutes: 420, frequency: 'WEEKDAYS', startDate: '2026-11-04', now, ...extra,
  });

  test('cria com 201; ocorrência exige scope em PATCH e DELETE', async () => {
    const r = await rotina(ana);
    expect(r.status).toBe(201);
    const [qua] = (await ana.get('/api/activities').query({ from: '2026-11-05', to: '2026-11-05', nowDate: now.date })).body;
    const sem = await ana.patch(`/api/activities/${qua.id}`).send({ startMinutes: 400, endMinutes: 430, now });
    expect(sem.status).toBe(400);
    expect(sem.body.error.fields).toHaveProperty('scope');
    expect((await ana.delete(`/api/activities/${qua.id}`).send({ now })).status).toBe(400);
    const so = await ana.patch(`/api/activities/${qua.id}`).send({ startMinutes: 400, endMinutes: 430, scope: 'this', now });
    expect(so.status).toBe(200);
    expect(so.body.exceptionKind).toBe('CHANGED');
  });

  test('início antes de hoje 400; repetição de outro usuário 404', async () => {
    expect((await rotina(ana, { startDate: '2026-11-03' })).status).toBe(400);
    const r = (await rotina(ana)).body;
    expect((await bia.get(`/api/routines/${r.id}`)).status).toBe(404);
    expect((await bia.patch(`/api/routines/${r.id}`).send({ name: 'x', fromDate: '2026-11-05', now })).status).toBe(404);
    expect((await bia.post(`/api/routines/${r.id}/cancel`).send({ fromDate: '2026-11-05', now })).status).toBe(404);
    expect((await ana.get('/api/routines')).body).toHaveLength(1);
  });
});

describe('reorganizar', () => {
  let alvo;
  beforeEach(async () => {
    alvo = (await ana.post('/api/activities').send({ name: 'Hora de estudar', date: '2026-11-04', startMinutes: 840, endMinutes: 930, now: antes })).body;
    await ana.post('/api/activities').send({ name: 'Academia', date: '2026-11-04', startMinutes: 1020, endMinutes: 1110, isFixed: true, now: antes });
  });
  const reorg = { date: '2026-11-04', minutes: 860 };

  test('sugestões não salvam; apply repetido com o mesmo requestId altera uma vez (E3)', async () => {
    const s = await ana.post(`/api/activities/${alvo.id}/suggestions`).send({ now: reorg });
    expect(s.status).toBe(200);
    expect(s.body.options.length).toBeGreaterThan(0);
    expect((await ana.get(`/api/activities/${alvo.id}`)).body.startMinutes).toBe(840);
    const body = { option: s.body.options[0], targetVersion: s.body.targetVersion, requestId: 'req-1', now: reorg };
    const [a, b] = [await ana.post(`/api/activities/${alvo.id}/apply`).send(body), await ana.post(`/api/activities/${alvo.id}/apply`).send(body)];
    expect([a.status, b.status]).toEqual([200, 200]);
    const hist = (await ana.get('/api/history')).body.items.filter((c) => c.reason === 'REORGANIZE');
    expect(hist).toHaveLength(1);
  });

  test('versão antiga responde 409 AGENDA_CHANGED sem alterar (E2)', async () => {
    const s = (await ana.post(`/api/activities/${alvo.id}/suggestions`).send({ now: reorg })).body;
    await ana.patch(`/api/activities/${alvo.id}`).send({ name: 'Estudar mais', now: reorg });
    const res = await ana.post(`/api/activities/${alvo.id}/apply`).send({ option: s.options[0], targetVersion: s.targetVersion, requestId: 'r2', now: reorg });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AGENDA_CHANGED');
    expect((await ana.get(`/api/activities/${alvo.id}`)).body.startMinutes).toBe(840);
  });

  test('compromisso fixo responde 409 NOT_REORGANIZABLE; de outro usuário 404', async () => {
    const [, academia] = (await ana.get('/api/activities').query({ from: '2026-11-04', to: '2026-11-04', nowDate: '2026-11-04' })).body;
    expect((await ana.post(`/api/activities/${academia.id}/suggestions`).send({ now: reorg })).body.error.code).toBe('NOT_REORGANIZABLE');
    expect((await bia.post(`/api/activities/${alvo.id}/suggestions`).send({ now: reorg })).status).toBe(404);
  });

  test('encaixe da Inbox sugere e agenda', async () => {
    const item = (await ana.post('/api/activities').send({ name: 'Ler artigo', now: reorg })).body;
    const s = await ana.post(`/api/inbox/${item.id}/suggestions`).send({ now: reorg });
    expect(s.status).toBe(200);
    const [o] = s.body.options;
    const res = await ana.post(`/api/inbox/${item.id}/schedule`).send({ date: o.date, startMinutes: o.start, endMinutes: o.end, now: reorg });
    expect(res.status).toBe(200);
    expect((await ana.get('/api/inbox')).body).toEqual([]);
  });
});

describe('ofensiva, progresso e histórico', () => {
  test('GET /streak e /progress usam o dia enviado pelo navegador', async () => {
    const a = (await ana.post('/api/activities').send({ name: 'Ler', date: '2026-11-04', startMinutes: 600, endMinutes: 630, now: antes })).body;
    await ana.post(`/api/activities/${a.id}/status`).send({ status: 'DONE' });
    expect((await ana.get('/api/streak').query({ today: '2026-11-04' })).body).toEqual({ current: 1, best: 1, today: { total: 1, done: 1 } });
    const p = await ana.get('/api/progress').query({ weekStart: '2026-11-02', today: '2026-11-04', minutes: 700 });
    expect(p.status).toBe(200);
    expect(p.body.counts.done).toBe(1);
    expect(p.body.byDay[2]).toMatchObject({ date: '2026-11-04', percent: 100 });
    expect((await ana.get('/api/progress').query({ weekStart: '2026-11-03', today: '2026-11-04', minutes: 700 })).status).toBe(400);
  });

  test('histórico pagina e só o dono exclui', async () => {
    const a = (await nova(ana)).body;
    await ana.patch(`/api/activities/${a.id}`).send({ startMinutes: 900, endMinutes: 990, now });
    const h = await ana.get('/api/history');
    expect(h.body).toMatchObject({ next: null });
    expect(h.body.items).toHaveLength(1);
    const id = h.body.items[0].id;
    expect((await bia.delete(`/api/history/${id}`)).status).toBe(404);
    expect((await ana.delete(`/api/history/${id}`)).status).toBe(204);
  });
});
