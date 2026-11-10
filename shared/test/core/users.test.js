import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../src/core/memoryStore.js';
import { createActivity } from '../../src/core/activities.js';
import { listCategories } from '../../src/core/categories.js';
import { deleteUser, getUser, loginUser, registerUser, updateUser } from '../../src/core/users.js';

// Hasher de teste: o servidor usa bcrypt, e a demonstração usa SHA-256.
const hasher = { hash: async (p) => `h:${p}`, verify: async (p, h) => h === `h:${p}` };
const now = { date: '2026-11-04', minutes: 600 };
let store;
const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };

beforeEach(() => { store = createMemoryStore(); });

describe('usuários', () => {
  test('cadastro cria as categorias iniciais e nunca devolve o hash', async () => {
    const u = await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher);
    expect(u).not.toHaveProperty('passwordHash');
    expect(u).toMatchObject({ name: 'Ana', email: 'ana@x.com', planningStart: 360, planningEnd: 1380, theme: null });
    expect(await listCategories(store, u.id)).toHaveLength(4);
  });
  test('normaliza o e-mail e recusa cadastro duplicado', async () => {
    await registerUser(store, { name: 'Ana', email: ' Ana@X.com ', password: 'Senha-forte-8' }, hasher);
    expect((await loginUser(store, { email: 'ana@x.com', password: 'Senha-forte-8' }, hasher)).email).toBe('ana@x.com');
    expect((await erro(registerUser(store, { name: 'A', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher))).code).toBe('EMAIL_TAKEN');
  });
  test('senha curta e e-mail inválido são recusados', async () => {
    const e = await erro(registerUser(store, { name: 'Ana', email: 'ana', password: '123' }, hasher));
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(e.fields).sort()).toEqual(['email', 'password']);
  });
  test('login inválido responde a mesma mensagem para e-mail e senha', async () => {
    await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher);
    const a = await erro(loginUser(store, { email: 'ana@x.com', password: 'errada00' }, hasher));
    const b = await erro(loginUser(store, { email: 'nao@x.com', password: 'Senha-forte-8' }, hasher));
    expect([a.code, a.message, a.status]).toEqual(['INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', 401]);
    expect(b.message).toBe(a.message);
  });
  test('atualiza tema e horário do dia, recusando início depois do fim', async () => {
    const u = await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher);
    expect(await updateUser(store, u.id, { theme: 'DARK', planningStart: 300 })).toMatchObject({ theme: 'DARK', planningStart: 300 });
    expect(await updateUser(store, u.id, { theme: null })).toMatchObject({ theme: null });
    expect((await erro(updateUser(store, u.id, { planningStart: 1400 }))).code).toBe('VALIDATION_ERROR');
  });
  test('excluir exige a senha certa e remove tudo do usuário', async () => {
    const u = await registerUser(store, { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' }, hasher);
    await createActivity(store, u.id, { name: 'Estudar', date: '2026-11-05', startMinutes: 600, endMinutes: 660 }, now);
    expect((await erro(deleteUser(store, u.id, { password: 'errada00' }, hasher))).code).toBe('INVALID_CREDENTIALS');
    await deleteUser(store, u.id, { password: 'Senha-forte-8' }, hasher);
    expect((await erro(getUser(store, u.id))).code).toBe('UNAUTHENTICATED');
    const restos = await store.transaction(async (tx) => [
      ...(await tx.activities.findMany({ userId: u.id })), ...(await tx.categories.findMany({ userId: u.id })),
    ]);
    expect(restos).toEqual([]);
  });
});
