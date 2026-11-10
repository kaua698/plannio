import { afterEach, describe, expect, test, vi } from 'vitest';

const carrega = async () => {
  vi.stubEnv('VITE_API_MODE', 'http');
  vi.resetModules();
  return import('./api.js');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('servidor fora do ar', () => {
  test.each([502, 503, 504])('resposta %i sem detalhes diz que o servidor não respondeu', async (status) => {
    vi.stubGlobal('fetch', async () => new Response('', { status }));
    const { api } = await carrega();
    await expect(api('/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      status,
      message: 'O servidor não está respondendo. Tente de novo em instantes.',
    });
  });

  test('quando o servidor explica o erro, a explicação dele é mantida', async () => {
    const error = { code: 'SERVICE_UNAVAILABLE', message: 'O banco de dados está indisponível.' };
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error }), { status: 503 }));
    const { api } = await carrega();
    await expect(api('/me')).rejects.toMatchObject({ status: 503, message: error.message });
  });
});
