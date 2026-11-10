// Store em memória com a mesma interface que o store do Prisma terá na fase 3.
const TABLES = ['users', 'categories', 'routines', 'activities', 'steps', 'changes', 'sessions'];

const empty = () => Object.fromEntries(TABLES.map((t) => [t, []]));
const clone = (v) => structuredClone(v);
const newId = () => globalThis.crypto.randomUUID();

function matches(row, where = {}) {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key] ?? null;
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('not' in cond && value === (cond.not ?? null)) return false;
      if ('gte' in cond && !(value !== null && value >= cond.gte)) return false;
      if ('lte' in cond && !(value !== null && value <= cond.lte)) return false;
      if ('lt' in cond && !(value !== null && value < cond.lt)) return false;
      return true;
    }
    return value === (cond ?? null);
  });
}

function table(rows) {
  return {
    async findMany(where) { return rows.filter((r) => matches(r, where)).map(clone); },
    async findOne(where) { const r = rows.find((x) => matches(x, where)); return r ? clone(r) : null; },
    async insert(data) {
      const row = { id: newId(), createdAt: new Date().toISOString(), ...clone(data) };
      rows.push(row);
      return clone(row);
    },
    async update(id, data) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, clone(data), { updatedAt: new Date().toISOString() });
      return clone(row);
    },
    async remove(id) {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
    async removeMany(where) {
      let n = 0;
      for (let i = rows.length - 1; i >= 0; i -= 1) if (matches(rows[i], where)) { rows.splice(i, 1); n += 1; }
      return n;
    },
  };
}

export function createMemoryStore(snapshot) {
  let state = snapshot ? clone(snapshot) : empty();
  for (const t of TABLES) state[t] ||= [];
  let queue = Promise.resolve();

  return {
    kind: 'memory',
    snapshot: () => clone(state),
    transaction(fn) {
      const run = async () => {
        const work = clone(state);
        const tx = Object.fromEntries(TABLES.map((t) => [t, table(work[t])]));
        const result = await fn(tx);
        state = work;
        return result;
      };
      const p = queue.then(run, run);
      queue = p.catch(() => {});
      return p;
    },
  };
}
