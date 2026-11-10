import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CLOCK, SECRET, signUp, testApp } from './helpers.js';

const SENHA = 'Senha-forte-8';
const MIN = 60_000;
const HORA = 60 * MIN;

let agora;
let app;
let store;
const clock = () => agora;
const avanca = (ms) => { agora += ms; };

beforeEach(() => {
  agora = CLOCK();
  ({ app, store } = testApp({ clock, appUrl: 'https://plannio.test' }));
});

const cadastra = (extra) => signUp(app, { password: SENHA, ...extra });

describe('cadastro', () => {
  test('grava a conta e já deixa a pessoa entrada', async () => {
    const agent = await cadastra();
    expect(agent.user).toMatchObject({ name: 'Ana', email: 'ana@x.com' });
    expect(store.snapshot().users).toHaveLength(1);
    expect((await agent.get('/api/me')).status).toBe(200);
  });

  test('o cadastro não depende de e-mail: a resposta não cita verificação nem envio', async () => {
    const agent = await cadastra();
    expect(agent.user).not.toHaveProperty('emailVerified');
    expect(agent.user).not.toHaveProperty('emailDelivery');
    for (const rota of ['/api/auth/verify', '/api/auth/forgot', '/api/auth/reset', '/api/auth/resend-verification']) {
      expect((await request(app).post(rota).send({})).status, rota).toBe(404);
    }
  });

  test('e-mail repetido não cria outra conta', async () => {
    await cadastra();
    const res = await request(app).post('/api/auth/register').send({ name: 'Bia', email: 'ANA@x.com', password: SENHA });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(store.snapshot().users).toHaveLength(1);
  });

  test('senha curta ou longa demais é recusada', async () => {
    for (const password of ['1234567', '', 'x'.repeat(73)]) {
      const res = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@x.com', password });
      expect(res.status, password).toBe(400);
      expect(res.body.error.fields).toHaveProperty('password');
    }
  });
});

describe('sessões e senhas', () => {
  const cookieDe = (res) => res.headers['set-cookie'][0].split(';')[0];
  const registra = () => request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@x.com', password: SENHA });

  test('visitante sem sessão recebe 200 e nenhum usuário, sem erro no console do navegador', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  test('a consulta de sessão devolve a conta de quem entrou e para de devolver após o logout', async () => {
    const cookie = cookieDe(await registra());
    const antes = await request(app).get('/api/auth/session').set('Cookie', cookie);
    expect(antes.body.user).toMatchObject({ email: 'ana@x.com' });
    expect(JSON.stringify(antes.body)).not.toMatch(/passwordHash/);
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect((await request(app).get('/api/auth/session').set('Cookie', cookie)).body).toEqual({ user: null });
  });

  test('depois do logout, o cookie antigo não funciona mais', async () => {
    const cookie = cookieDe(await registra());
    expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(200);
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(401);
  });

  test('sessão expira em 7 dias', async () => {
    const cookie = cookieDe(await registra());
    avanca(7 * 24 * HORA + MIN);
    expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(401);
  });

  test('token assinado, mas sem sessão no banco, é recusado', async () => {
    const res = await registra();
    const falso = jwt.sign({ sub: res.body.id, sid: 'nao-existe' }, SECRET, { expiresIn: '7d' });
    expect((await request(app).get('/api/me').set('Cookie', `plannio_session=${falso}`)).status).toBe(401);
  });

  test('senha é guardada só como hash bcrypt', async () => {
    await registra();
    expect(store.snapshot().users[0].passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test('entrar de novo apaga as sessões vencidas da conta', async () => {
    await registra();
    avanca(8 * 24 * HORA);
    await request(app).post('/api/auth/login').send({ email: 'ana@x.com', password: SENHA });
    expect(store.snapshot().sessions).toHaveLength(1);
  });

  test('a API nunca devolve hash nem tokens', async () => {
    const agent = await cadastra();
    const texto = JSON.stringify((await agent.get('/api/me')).body);
    expect(texto).not.toMatch(/passwordHash|tokenHash|argon2/);
  });

  test('excluir a conta apaga as sessões', async () => {
    const agent = await cadastra();
    expect((await agent.delete('/api/me').send({ password: SENHA })).status).toBe(204);
    const s = store.snapshot();
    expect([s.users, s.sessions].map((t) => t.length)).toEqual([0, 0]);
  });
});

describe('proteções da API', () => {
  const corpo = { email: 'ana@x.com', password: SENHA };

  test('recusa escrita vinda de outro site', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://site-malicioso.test').send(corpo);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });

  test('aceita a origem do próprio site e não libera CORS', async () => {
    await cadastra();
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://plannio.test').send(corpo);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('respostas da API não ficam em cache', async () => {
    const agent = await cadastra();
    expect((await agent.get('/api/me')).headers['cache-control']).toContain('no-store');
  });

  test('banco fora do ar responde 503 sem expor detalhes nem dados nos logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const quebrado = { kind: 'x', transaction: async () => { throw Object.assign(new Error('falha host=db password=segredo'), { code: 'ECONNREFUSED' }); } };
    ({ app } = testApp({ store: quebrado, clock }));
    const res = await request(app).post('/api/auth/login').send({ email: 'dado-pessoal@x.com', password: 'senha-que-nao-vaza' });
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/segredo|host=/);
    const saida = JSON.stringify(log.mock.calls);
    expect(saida).not.toMatch(/dado-pessoal|senha-que-nao-vaza|segredo/);
    log.mockRestore();
  });
});
