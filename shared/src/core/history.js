import { notFound } from './errors.js';

const PAGE = 50;
const newestFirst = (x, y) => (x.createdAt === y.createdAt ? (x.id < y.id ? 1 : -1) : x.createdAt < y.createdAt ? 1 : -1);

const pub = (c) => ({
  id: c.id, activityId: c.activityId, activityName: c.activityName, reason: c.reason,
  fromDate: c.fromDate, fromStart: c.fromStart, fromEnd: c.fromEnd, toDate: c.toDate, toStart: c.toStart, toEnd: c.toEnd, createdAt: c.createdAt,
});

// Lista do mais novo ao mais antigo; "before" é o id do último item da página anterior.
export async function listHistory(store, userId, { before } = {}) {
  return store.transaction(async (tx) => {
    const all = (await tx.changes.findMany({ userId })).sort(newestFirst);
    const start = before ? all.findIndex((c) => c.id === before) + 1 : 0;
    const items = all.slice(start, start + PAGE);
    const next = start + PAGE < all.length ? items[items.length - 1].id : null;
    return { items: items.map(pub), next };
  });
}

export async function deleteHistory(store, userId, id) {
  return store.transaction(async (tx) => {
    const c = await tx.changes.findOne({ id, userId });
    if (!c) throw notFound('Este registro não foi encontrado.');
    await tx.changes.remove(id);
  });
}
