import { describe, expect, test } from 'vitest';
import { loadConfig } from '../src/config.js';

const SECRET = 'x'.repeat(32);

describe('loadConfig', () => {
  test('recusa JWT_SECRET curto ou ausente', () => {
    expect(() => loadConfig({ JWT_SECRET: 'curto', DATABASE_URL: 'x' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ DATABASE_URL: 'x' })).toThrow(/JWT_SECRET/);
  });

  test('lê as variáveis com padrões', () => {
    expect(loadConfig({ JWT_SECRET: SECRET, DATABASE_URL: 'postgres://x' })).toMatchObject({
      jwtSecret: SECRET, databaseUrl: 'postgres://x', nodeEnv: 'development', port: 3001, appUrl: 'http://localhost:5173',
    });
    expect(loadConfig({ JWT_SECRET: SECRET, NODE_ENV: 'production', PORT: '8080', DATABASE_URL: 'postgres://x', APP_URL: 'https://x.test' }).port).toBe(8080);
  });

  test('sem DATABASE_URL usa o banco em memória, só fora de produção', () => {
    expect(loadConfig({ JWT_SECRET: SECRET }).databaseUrl).toBeNull();
    expect(() => loadConfig({ JWT_SECRET: SECRET, NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });

  test('em produção, o endereço do site é obrigatório e usa https', () => {
    expect(() => loadConfig({ JWT_SECRET: SECRET, NODE_ENV: 'production', DATABASE_URL: 'x' })).toThrow(/APP_URL/);
    expect(() => loadConfig({ JWT_SECRET: SECRET, NODE_ENV: 'production', DATABASE_URL: 'x', APP_URL: 'http://x.test' })).toThrow(/APP_URL/);
  });

  test('na Vercel, o endereço do site vem do próprio ambiente', () => {
    const base = { NODE_ENV: 'production', JWT_SECRET: SECRET, DATABASE_URL: 'postgresql://a' };
    expect(loadConfig({ ...base, VERCEL_URL: 'plannio-abc.vercel.app' }).appUrl).toBe('https://plannio-abc.vercel.app');
    expect(loadConfig({ ...base, VERCEL_URL: 'plannio-abc.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'plannio.vercel.app' }).appUrl).toBe('https://plannio.vercel.app');
    expect(loadConfig({ ...base, VERCEL_URL: 'plannio-abc.vercel.app', APP_URL: 'https://meu.exemplo/' }).appUrl).toBe('https://meu.exemplo');
  });

  test('não há configuração de e-mail', () => {
    expect(loadConfig({ JWT_SECRET: SECRET, SMTP_HOST: 'smtp.x' })).not.toHaveProperty('email');
  });
});
