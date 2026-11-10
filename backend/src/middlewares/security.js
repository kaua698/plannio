import { AppError } from '../lib/errors.js';

const LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

// Proteção contra CSRF, além do SameSite=Lax: escrita só vinda do próprio site.
export const sameOrigin = (appUrl) => {
  const permitido = new URL(appUrl).host;
  return (req, res, next) => {
    const origin = req.get('origin');
    if (LEITURA.has(req.method) || !origin) return next();
    let host = null;
    try { host = new URL(origin).host; } catch { /* origem inválida é recusada abaixo */ }
    if (host && (host === permitido || host === req.get('host'))) return next();
    return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Esta ação só pode ser feita pelo próprio site.'));
  };
};

export const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
