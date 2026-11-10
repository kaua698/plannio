import { AppError, errorBody } from '../lib/errors.js';

const CONEXAO = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const semBanco = (e) => CONEXAO.has(e.code) || CONEXAO.has(e.cause?.code) || e.cause?.kind === 'DatabaseNotReachable';

export function notFoundRoute(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) return res.status(err.status).json(errorBody(err));
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Confira os dados informados.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'Os dados enviados são grandes demais.' } });
  }
  // O log traz só o tipo do erro e a rota: mensagens de banco e corpos de requisição podem ter dados pessoais.
  const tipo = String(err.code || err.cause?.kind || err.name || 'Error');
  console.error(`[erro] ${req.method} ${req.path}: ${tipo}`);
  if (semBanco(err)) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível no momento. Tente de novo em instantes.' } });
  }
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Algo deu errado. Tente novamente.' } });
}
