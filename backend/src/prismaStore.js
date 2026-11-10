import { Prisma } from '@prisma/client';
import { AppError, MESSAGES } from '@plannio/shared/core/errors';

// Store do PostgreSQL com a mesma interface do store em memória (shared/src/core/memoryStore.js).
const MODELS = {
  users: 'user', categories: 'category', routines: 'routine', activities: 'activity', steps: 'activityStep', changes: 'changeRecord',
  sessions: 'session',
};
const READONLY = new Set(['id', 'createdAt', 'updatedAt']);
const RETRIES = 9;
const pauseAleatoria = (attempt, teto) => new Promise((resolve) => { setTimeout(resolve, Math.random() * teto); });

// Datas de sistema saem como texto ISO, como no store em memória.
function out(row) {
  if (!row) return null;
  const r = { ...row };
  for (const [k, v] of Object.entries(r)) if (v instanceof Date) r[k] = v.toISOString();
  return r;
}

const writable = (data) => Object.fromEntries(Object.entries(data).filter(([k, v]) => !READONLY.has(k) && v !== undefined));

// Converte o filtro do núcleo para o Prisma. No núcleo, `not` mantém valores nulos (como no store em memória);
// em SQL, `campo <> x` descarta os nulos, então eles entram de volta com OR.
function toWhere(where = {}) {
  const and = [];
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (cond === null || typeof cond !== 'object' || Array.isArray(cond)) {
      and.push({ [key]: cond });
      continue;
    }
    const c = {};
    if ('gte' in cond) c.gte = cond.gte;
    if ('lte' in cond) c.lte = cond.lte;
    if ('lt' in cond) c.lt = cond.lt;
    if ('in' in cond) {
      const values = cond.in.filter((v) => v !== null);
      if (values.length !== cond.in.length) and.push({ OR: [{ [key]: { in: values } }, { [key]: null }] });
      else c.in = values;
    }
    if (Object.keys(c).length) and.push({ [key]: c });
    if ('not' in cond) {
      if (cond.not === null) and.push({ [key]: { not: null } });
      else and.push({ OR: [{ [key]: { not: cond.not } }, { [key]: null }] });
    }
  }
  return and.length ? { AND: and } : {};
}

function table(delegate) {
  return {
    async findMany(where) { return (await delegate.findMany({ where: toWhere(where), orderBy: { createdAt: 'asc' } })).map(out); },
    async findOne(where) { return out(await delegate.findFirst({ where: toWhere(where), orderBy: { createdAt: 'asc' } })); },
    async insert(data) { return out(await delegate.create({ data: writable(data) })); },
    async update(id, data) {
      const done = await delegate.updateMany({ where: { id }, data: writable(data) });
      return done.count ? out(await delegate.findUnique({ where: { id } })) : null;
    },
    async remove(id) { await delegate.deleteMany({ where: { id } }); },
    async removeMany(where) { return (await delegate.deleteMany({ where: toWhere(where) })).count; },
  };
}

const isConflict = (e) => (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2034' || e.code === 'P2002'))
  || (e?.name === 'DriverAdapterError' && ['TransactionWriteConflict', 'UniqueConstraintViolation'].includes(e.cause?.kind));

export function createPrismaStore(prisma, { retries = RETRIES, pause = pauseAleatoria } = {}) {
  return {
    kind: 'prisma',
    // Serializable: duas abas mexendo na mesma agenda não deixam a agenda num estado impossível.
    // Conflito de serialização é tentado de novo, com pausas crescentes; se persistir, vira AGENDA_CHANGED.
    async transaction(fn) {
      for (let attempt = 1; ; attempt += 1) {
        try {
          return await prisma.$transaction(
            (tx) => fn(Object.fromEntries(Object.entries(MODELS).map(([t, m]) => [t, table(tx[m])]))),
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 },
          );
        } catch (e) {
          if (!isConflict(e)) throw e;
          if (attempt >= retries) throw new AppError(409, 'AGENDA_CHANGED', MESSAGES.agendaChanged);
          // Pausa curta e aleatória, para as transações em conflito não colidirem de novo.
          await pause(attempt, Math.min(400, 20 * 2 ** attempt));
        }
      }
    },
    async snapshot() {
      const entries = await Promise.all(Object.entries(MODELS).map(async ([t, m]) => [t, (await prisma[m].findMany({ orderBy: { createdAt: 'asc' } })).map(out)]));
      return Object.fromEntries(entries);
    },
  };
}
