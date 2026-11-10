import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, test } from 'vitest';
import { SECRET, signUp, testApp } from './helpers.js';

describe('contas e sessão', () => {
  test('cadastro cria o usuário e as 4 categorias iniciais, sem expor o hash', async () => {
    const { app, store } = testApp();
    const agent = await signUp(app);
    expect(agent.user).toMatchObject({ name: 'Ana', email: 'ana@x.com', planningStart: 360, planningEnd: 1380, theme: null });
    expect(agent.user).not.toHaveProperty('passwordHash');
    const cats = store.snapshot().categories.filter((c) => c.userId === agent.user.id);
    expect(cats.map((c) => [c.name, c.color])).toEqual([['Pessoal', 'BARRO'], ['Faculdade', 'AZUL'], ['Estudos', 'OCRE'], ['Saúde', 'EUCALIPTO']]);
  });

  test('normaliza e-mail: maiúsculas e espaços entram na mesma conta e não duplicam', async () => {
    const { app } = testApp();
    await signUp(app, { email: ' Ana@X.com ' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@x.com', password: 'Senha-forte-8' });
    expect(login.status).toBe(200);
    const dup = await request(app).post('/api/auth/register').send({ name: 'Outra', email: 'ANA@x.com', password: 'Senha-forte-8' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('cadastro inválido responde 400 com fields', async () => {
    const res = await request(testApp().app).post('/api/auth/register').send({ name: '', email: 'x', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'name', 'password']);
  });

  test('login inválido responde igual para e-mail inexistente e senha errada', async () => {
    const { app } = testApp();
    await signUp(app);
    for (const body of [{ email: 'nao@x.com', password: 'Senha-forte-8' }, { email: 'ana@x.com', password: 'errada123' }]) {
      const res = await request(app).post('/api/auth/login').send(body);
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' });
    }
  });

  test('cookie de sessão é HttpOnly, SameSite=Lax, 7 dias; Secure só em produção', async () => {
    const res = await request(testApp().app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^plannio_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Max-Age=604800/);
    expect(cookie).not.toMatch(/Secure/);
    const prod = await request(testApp({ nodeEnv: 'production' }).app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' });
    expect(prod.headers['set-cookie'][0]).toMatch(/Secure/);
  });

  test('sem sessão, GET /api/me responde 401 UNAUTHENTICATED', async () => {
    const res = await request(testApp().app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente.' });
  });

  test('token inválido, expirado ou assinado com outra chave responde 401', async () => {
    const { app } = testApp();
    const agent = await signUp(app);
    const expired = jwt.sign({ sub: agent.user.id }, SECRET, { expiresIn: -10 });
    const other = jwt.sign({ sub: agent.user.id }, 'outra-chave-com-mais-de-32-caracteres!!', { expiresIn: '7d' });
    for (const token of ['lixo', expired, other]) {
      const res = await request(app).get('/api/me').set('Cookie', `plannio_session=${token}`);
      expect(res.status).toBe(401);
    }
  });

  test('logout apaga o cookie', async () => {
    const { app } = testApp();
    const agent = await signUp(app);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    expect(out.headers['set-cookie'][0]).toMatch(/plannio_session=;/);
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  test('conta excluída: cookie antigo responde 401', async () => {
    const { app } = testApp();
    const reg = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' });
    const cookie = reg.headers['set-cookie'][0].split(';')[0];
    expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(200);
    const del = await request(app).delete('/api/me').set('Cookie', cookie).send({ password: 'Senha-forte-8' });
    expect(del.status).toBe(204);
    const res = await request(app).get('/api/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  test('DELETE /me: senha errada não exclui; senha certa exclui tudo em cascata', async () => {
    const { app, store } = testApp();
    const agent = await signUp(app);
    const wrong = await agent.delete('/api/me').send({ password: 'errada123' });
    expect(wrong.status).toBe(401);
    expect((await agent.get('/api/me')).status).toBe(200);
    const ok = await agent.delete('/api/me').send({ password: 'Senha-forte-8' });
    expect(ok.status).toBe(204);
    const snap = store.snapshot();
    expect(snap.users).toEqual([]);
    expect(snap.categories).toEqual([]);
  });

  test('PATCH /me aceita tema (inclusive null), nome e horário do dia; recusa início >= fim', async () => {
    const { app } = testApp();
    const agent = await signUp(app);
    expect((await agent.patch('/api/me').send({ theme: 'DARK', name: 'Ana Lu' })).body).toMatchObject({ theme: 'DARK', name: 'Ana Lu' });
    expect((await agent.patch('/api/me').send({ theme: null })).body.theme).toBeNull();
    expect((await agent.patch('/api/me').send({ planningStart: 420, planningEnd: 1320 })).body).toMatchObject({ planningStart: 420, planningEnd: 1320 });
    const bad = await agent.patch('/api/me').send({ planningStart: 1320, planningEnd: 420 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toHaveProperty('planningEnd');
  });

  test('PATCH /me ignora campos que não podem mudar por ali', async () => {
    const { app } = testApp();
    const agent = await signUp(app);
    const res = await agent.patch('/api/me').send({ email: 'outro@x.com', passwordHash: 'x', id: 'y' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'ana@x.com', id: agent.user.id });
  });
});
