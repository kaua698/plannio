import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from '../../src/core/memoryStore.js';
import { copyDay, createActivity } from '../../src/core/activities.js';
import { createCategory, updateCategory } from '../../src/core/categories.js';
import { getProgress } from '../../src/core/progressQuery.js';
import { scheduleInbox } from '../../src/core/reorganization.js';
import { createRoutine, updateRoutine } from '../../src/core/routines.js';
import { loginUser, registerUser, updateUser } from '../../src/core/users.js';

const now = { date: '2026-11-04', minutes: 600 };
const U = 'u1';
const LONGE = '2036-11-03';
// Como o bcrypt, este hasher só considera os primeiros 72 caracteres.
const hasher = { hash: async (p) => `h:${p.slice(0, 72)}`, verify: async (p, h) => h === `h:${p.slice(0, 72)}` };
let store;
const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };
const base = (extra = {}) => ({ name: 'Ler', date: '2026-11-05', startMinutes: 600, endMinutes: 630, ...extra });
const rotina = (extra = {}) => ({ name: 'Ler', startMinutes: 600, endMinutes: 630, frequency: 'DAILY', startDate: '2026-11-05', ...extra });
const etapas = (n) => Array.from({ length: n }, (_, i) => `Etapa ${i}`);

// Conta as linhas de atividade criadas, inclusive as desfeitas depois por erro.
function contaInserts(s) {
  let n = 0;
  return {
    total: () => n,
    store: {
      ...s,
      transaction: (fn) => s.transaction((tx) => fn({
        ...tx,
        activities: { ...tx.activities, insert: (d) => { n += 1; return tx.activities.insert(d); } },
      })),
    },
  };
}

beforeEach(async () => { store = createMemoryStore(); });

describe('datas distantes não geram linhas', () => {
  beforeEach(async () => { await createRoutine(store, U, rotina(), now); });

  test('progresso além de dois anos é recusado antes de gerar ocorrências', async () => {
    const c = contaInserts(store);
    const e = await erro(getProgress(c.store, U, { weekStart: LONGE, today: now.date, minutes: 600 }));
    expect(e.fields).toHaveProperty('weekStart');
    expect(c.total()).toBe(0);
  });

  test('copiar de um dia além de dois anos é recusado antes de gerar ocorrências', async () => {
    const c = contaInserts(store);
    const e = await erro(copyDay(c.store, U, '2026-11-06', { fromDate: LONGE }, now));
    expect(e.fields).toHaveProperty('fromDate');
    expect(c.total()).toBe(0);
  });

  test('encaixar item da Inbox além de dois anos é recusado antes de gerar ocorrências', async () => {
    const item = await createActivity(store, U, { name: 'Ler artigo' }, now);
    const c = contaInserts(store);
    const e = await erro(scheduleInbox(c.store, U, item.id, { date: LONGE, startMinutes: 600, endMinutes: 630, now }));
    expect(e.fields).toHaveProperty('date');
    expect(c.total()).toBe(0);
  });
});

describe('limites de tamanho', () => {
  test('nome da atividade aceita até 120 caracteres', async () => {
    expect((await createActivity(store, U, base({ name: 'x'.repeat(120) }), now)).name).toHaveLength(120);
    expect((await erro(createActivity(store, U, base({ name: 'x'.repeat(121), date: '2026-11-06' }), now))).fields.name).toBe('Use até 120 caracteres.');
  });

  test('descrição precisa ser texto de até 2000 caracteres', async () => {
    expect((await erro(createActivity(store, U, base({ description: 'x'.repeat(2001) }), now))).fields).toHaveProperty('description');
    expect((await erro(createActivity(store, U, base({ description: 42 }), now))).fields).toHaveProperty('description');
  });

  test('atividade aceita até 30 etapas de até 200 caracteres', async () => {
    expect((await createActivity(store, U, base({ steps: etapas(30) }), now)).steps).toHaveLength(30);
    expect((await erro(createActivity(store, U, base({ date: '2026-11-06', steps: etapas(31) }), now))).fields.steps).toBe('Use até 30 etapas.');
    expect((await erro(createActivity(store, U, base({ date: '2026-11-06', steps: ['x'.repeat(201)] }), now))).fields.steps).toBe('Cada etapa pode ter até 200 caracteres.');
    expect((await erro(createActivity(store, U, base({ date: '2026-11-06', steps: 'lista' }), now))).fields).toHaveProperty('steps');
  });

  test('repetição segue os mesmos limites, ao criar e ao mudar as etapas', async () => {
    expect((await erro(createRoutine(store, U, rotina({ name: 'x'.repeat(121) }), now))).fields).toHaveProperty('name');
    expect((await erro(createRoutine(store, U, rotina({ steps: etapas(31) }), now))).fields).toHaveProperty('steps');
    const r = await createRoutine(store, U, rotina(), now);
    expect((await erro(updateRoutine(store, U, r.id, { fromDate: '2026-11-06', steps: etapas(31) }, now))).fields).toHaveProperty('steps');
  });

  test('categoria aceita nome de até 40 caracteres, ao criar e editar', async () => {
    expect((await erro(createCategory(store, U, { name: 'x'.repeat(41), color: 'AZUL' }))).fields).toHaveProperty('name');
    const c = await createCategory(store, U, { name: 'Leitura', color: 'AZUL' });
    expect((await erro(updateCategory(store, U, c.id, { name: 'x'.repeat(41) }))).fields).toHaveProperty('name');
  });

  test('usuário: nome de até 80 e e-mail de até 254 caracteres', async () => {
    const e = await erro(registerUser(store, { name: 'x'.repeat(81), email: `${'x'.repeat(250)}@x.com`, password: 'Senha-forte-8' }, hasher));
    expect(Object.keys(e.fields).sort()).toEqual(['email', 'name']);
    const u = await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher);
    expect((await erro(updateUser(store, u.id, { name: 'x'.repeat(81) }))).fields).toHaveProperty('name');
  });
});

describe('senha e login', () => {
  test('senha acima de 72 bytes é recusada, contando acentos', async () => {
    const longa = await erro(registerUser(store, { name: 'Ana', email: 'ana@x.com', password: `x${'a'.repeat(72)}` }, hasher));
    expect(longa.fields.password).toBe('A senha pode ter até 72 caracteres.');
    const acentos = await erro(registerUser(store, { name: 'Ana', email: 'ana@x.com', password: `x${'ç'.repeat(36)}` }, hasher));
    expect(acentos.fields).toHaveProperty('password');
    expect((await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: `x${'a'.repeat(71)}` }, hasher)).email).toBe('ana@x.com');
  });

  test('login com senha acima do limite não entra pelo começo igual', async () => {
    await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: `x${'a'.repeat(71)}` }, hasher);
    expect((await erro(loginUser(store, { email: 'ana@x.com', password: `x${'a'.repeat(71)}b` }, hasher))).code).toBe('INVALID_CREDENTIALS');
  });

  test('e-mail inexistente também passa pela verificação de senha, para levar o mesmo tempo', async () => {
    const espiao = { hash: hasher.hash, verify: vi.fn(hasher.verify) };
    const e = await erro(loginUser(store, { email: 'nao@x.com', password: 'Senha-forte-8' }, espiao));
    expect(e.code).toBe('INVALID_CREDENTIALS');
    expect(espiao.verify).toHaveBeenCalledTimes(1);
  });
});
