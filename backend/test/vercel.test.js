import { existsSync, readFileSync } from 'node:fs';
import request from 'supertest';
import { afterEach, expect, test, vi } from 'vitest';

const raiz = new URL('../../', import.meta.url);

afterEach(() => vi.unstubAllEnvs());

test('a função da Vercel responde pela API', async () => {
  vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('NODE_ENV', 'test');
  const { default: funcao } = await import('../../api/index.js');
  const res = await request(funcao).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('o vercel.json publica as telas e leva /api para a função', () => {
  const v = JSON.parse(readFileSync(new URL('vercel.json', raiz), 'utf8'));
  expect(v.outputDirectory).toBe('frontend/dist');
  expect(v.buildCommand).toBe('npm run vercel-build');
  expect(v.rewrites).toEqual([
    { source: '/api/(.*)', destination: '/api' },
    { source: '/(.*)', destination: '/index.html' },
  ]);
});

test('não sobra dependência nativa nem de e-mail', () => {
  const { dependencies } = JSON.parse(readFileSync(new URL('backend/package.json', raiz), 'utf8'));
  expect(Object.keys(dependencies)).toEqual(expect.not.arrayContaining(['@node-rs/argon2', 'nodemailer', 'express-rate-limit']));
  expect(existsSync(new URL('backend/src/email', raiz))).toBe(false);
});
