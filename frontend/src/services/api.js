export class ApiError extends Error {
  constructor(status, error = {}) {
    super(error.message || 'Algo deu errado. Tente novamente.');
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code || 'INTERNAL';
    this.fields = error.fields || {};
    this.overlaps = error.overlaps || [];
  }
}

// http: servidor e banco de dados de verdade, o padrão em qualquer execução.
// demo: dados só neste navegador, usado nos testes de tela e em `npm run dev:demo`.
export const API_MODE = import.meta.env.VITE_API_MODE
  || (['test', 'demo'].includes(import.meta.env.MODE) ? 'demo' : 'http');
export const NETWORK_MESSAGE = 'Não foi possível salvar. Verifique sua conexão.';
const SERVER_DOWN = { code: 'SERVER_DOWN', message: 'O servidor não está respondendo. Tente de novo em instantes.' };

const queryString = (query) => {
  const entries = Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};

async function viaHttp(method, path, query, body) {
  let res;
  try {
    res = await fetch(`/api${path}${queryString(query)}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: NETWORK_MESSAGE });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body: data };
}

// Chamada única para a API, seja a de demonstração (no navegador) ou a do servidor.
export async function api(path, { method = 'GET', body, query } = {}) {
  const { status, body: data } = API_MODE === 'http'
    ? await viaHttp(method, path, query, body)
    : await (await import('./demo/router.js')).handleDemo({ method, path, query: query || {}, body: body || {} });
  if (status >= 400) {
    if (status === 401 && !path.startsWith('/auth/') && path !== '/me') window.dispatchEvent(new Event('plannio:session-expired'));
    throw new ApiError(status, data?.error ?? (status >= 502 ? SERVER_DOWN : undefined));
  }
  return data;
}
