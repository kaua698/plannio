import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { testApp } from './helpers.js';

describe('API mínima', () => {
  test('GET /api/health responde ok', async () => {
    const res = await request(testApp().app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('rota inexistente responde no formato padrão', async () => {
    const res = await request(testApp().app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('JSON malformado responde 400 no formato padrão', async () => {
    const res = await request(testApp().app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('corpo acima de 100 KB é recusado', async () => {
    const res = await request(testApp().app).post('/api/auth/login').send({ email: 'a'.repeat(110 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('usa cabeçalhos de segurança do helmet', async () => {
    const res = await request(testApp().app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
