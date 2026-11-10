// Lê e valida as variáveis de ambiente. Sem DATABASE_URL, o servidor usa o banco em memória (só fora de produção).
export function loadConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const databaseUrl = env.DATABASE_URL || null;
  if (!databaseUrl && production) throw new Error('DATABASE_URL é obrigatória em produção.');
  // Na Vercel, o endereço vem do próprio ambiente, sem o protocolo.
  const daVercel = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const appUrl = (env.APP_URL || (daVercel ? `https://${daVercel}` : '') || (production ? '' : 'http://localhost:5173')).replace(/\/+$/, '');
  if (production && !appUrl.startsWith('https://')) throw new Error('APP_URL precisa começar com https:// em produção.');
  return { jwtSecret, databaseUrl, nodeEnv, port: Number(env.PORT) || 3001, appUrl };
}
