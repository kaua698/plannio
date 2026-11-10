import { SESSION_MS } from '../lib/session.js';

const iso = (ms) => new Date(ms).toISOString();

// Abre a sessão e aproveita para apagar as sessões vencidas da mesma conta.
export function openSession(store, userId, clock) {
  return store.transaction(async (tx) => {
    await tx.sessions.removeMany({ userId, expiresAt: { lt: iso(clock()) } });
    return tx.sessions.insert({ userId, expiresAt: iso(clock() + SESSION_MS), revokedAt: null });
  });
}

export async function isSessionActive(store, { userId, sessionId }, clock) {
  const s = await store.transaction((tx) => tx.sessions.findOne({ id: sessionId, userId }));
  return Boolean(s) && !s.revokedAt && s.expiresAt > iso(clock());
}

export function revokeSession(store, { userId, sessionId }, clock) {
  return store.transaction(async (tx) => {
    const s = await tx.sessions.findOne({ id: sessionId, userId });
    if (s && !s.revokedAt) await tx.sessions.update(s.id, { revokedAt: iso(clock()) });
  });
}
