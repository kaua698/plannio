import jwt from 'jsonwebtoken';

export const COOKIE = 'plannio_session';
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

// O cookie leva um JWT com o id da sessão. A sessão em si fica no banco, e é isso que permite encerrá-la.
export function createSession({ jwtSecret, secure }) {
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure, path: '/' };
  return {
    write(res, userId, sessionId) {
      const token = jwt.sign({ sub: userId, sid: sessionId }, jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });
      res.cookie(COOKIE, token, { ...cookieOptions, maxAge: SESSION_MS });
    },
    clear(res) { res.clearCookie(COOKIE, cookieOptions); },
    // Devolve { userId, sessionId }, ou null se o cookie faltar, expirar ou tiver outra assinatura.
    read(req) {
      const token = req.cookies?.[COOKIE];
      if (!token) return null;
      try {
        const { sub, sid } = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        return typeof sub === 'string' && typeof sid === 'string' ? { userId: sub, sessionId: sid } : null;
      } catch {
        return null;
      }
    },
  };
}
