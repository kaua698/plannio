import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createStore } from '../src/stores.js';
import { testApp } from './helpers.js';

let dir;
let app;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'plannio-static-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<title>tela do plannio</title>');
  writeFileSync(path.join(dir, 'assets', 'a.js'), 'console.log(1)');
  ({ app } = testApp({ staticDir: dir }));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('telas servidas pelo servidor', () => {
  test.each(['/', '/semana', '/configuracoes'])('GET %s devolve o index.html', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.text).toContain('tela do plannio');
  });

  test('arquivos reais são servidos, e arquivo inexistente não vira página', async () => {
    expect((await request(app).get('/assets/a.js')).status).toBe(200);
    expect((await request(app).get('/assets/nao-existe.js')).status).toBe(404);
  });

  test('a API continua respondendo em JSON', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
  });

  test('sem pasta de telas, o servidor só atende a API', async () => {
    expect((await request(testApp().app).get('/semana')).status).toBe(404);
  });

  test('a página não depende de script inline, que a política de segurança bloqueia', async () => {
    const csp = (await request(app).get('/')).headers['content-security-policy'];
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
  });
});

describe('createStore', () => {
  test('sem DATABASE_URL usa a memória', async () => {
    expect((await createStore({ databaseUrl: null })).kind).toBe('memory');
  });

  test('com DATABASE_URL usa o Postgres, sem conectar até a primeira consulta', async () => {
    expect((await createStore({ databaseUrl: 'postgresql://x:x@localhost:1/x' })).kind).toBe('prisma');
  });
});
