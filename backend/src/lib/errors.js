import { AppError } from '@plannio/shared/core/index';

export { AppError };

export const errorBody = (e) => ({
  error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}), ...(e.overlaps ? { overlaps: e.overlaps } : {}) },
});

// Express 4 não captura promessas rejeitadas: o wrapper repassa o erro ao errorHandler.
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
