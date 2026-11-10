import { AppError, invalid } from './errors.js';
import { insertDefaultCategories } from './categories.js';
import { LIMITS, isMinute, tooLong } from './validate.js';

const THEMES = ['LIGHT', 'DARK'];
const USER_TABLES = ['categories', 'routines', 'changes', 'sessions'];

export const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.');

const passwordTooLong = (p) => new TextEncoder().encode(p).length > LIMITS.passwordBytes;
// Devolve o motivo de a senha ser recusada, ou null.
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (passwordTooLong(password)) return `A senha pode ter até ${LIMITS.passwordBytes} caracteres.`;
  return null;
}

// Hash descartável: e-mail inexistente também passa pela verificação e leva o mesmo tempo.
const decoys = new WeakMap();
function decoyHash(hasher) {
  if (!decoys.has(hasher)) decoys.set(hasher, hasher.hash('plannio-sem-conta'));
  return decoys.get(hasher);
}

export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, planningStart: u.planningStart, planningEnd: u.planningEnd, theme: u.theme ?? null,
});

// hasher: { hash(password), verify(password, hash) }, injetado por quem usa (bcrypt no servidor).
export async function registerUser(store, { name, email, password }, hasher) {
  const fields = {};
  const mail = normalizeEmail(email);
  if (typeof name !== 'string' || !name.trim()) fields.name = 'Informe seu nome.';
  else if (name.trim().length > LIMITS.userName) fields.name = tooLong(LIMITS.userName);
  if (mail.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) fields.email = 'Informe um e-mail válido.';
  const problema = passwordProblem(password);
  if (problema) fields.password = problema;
  if (Object.keys(fields).length) throw invalid(fields);
  const passwordHash = await hasher.hash(password);
  const user = await store.transaction(async (tx) => {
    if (await tx.users.findOne({ email: mail })) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Este e-mail já tem uma conta.', { email: 'Este e-mail já tem uma conta.' });
    }
    const novo = await tx.users.insert({ name: name.trim(), email: mail, passwordHash, planningStart: 360, planningEnd: 1380, theme: null });
    await insertDefaultCategories(tx, novo.id);
    return novo;
  });
  return publicUser(user);
}

export async function loginUser(store, { email, password }, hasher) {
  if (typeof password !== 'string') throw invalidCredentials();
  const u = await store.transaction((tx) => tx.users.findOne({ email: normalizeEmail(email) }));
  const matches = await hasher.verify(password, u ? u.passwordHash : await decoyHash(hasher));
  if (!u || !matches || passwordTooLong(password)) throw invalidCredentials();
  return publicUser(u);
}

export async function getUser(store, id) {
  const u = await store.transaction((tx) => tx.users.findOne({ id }));
  if (!u) throw unauthenticated();
  return publicUser(u);
}

export async function updateUser(store, id, input) {
  return store.transaction(async (tx) => {
    const u = await tx.users.findOne({ id });
    if (!u) throw unauthenticated();
    const fields = {};
    const data = {};
    if ('name' in input) {
      if (typeof input.name !== 'string' || !input.name.trim()) fields.name = 'Informe seu nome.';
      else if (input.name.trim().length > LIMITS.userName) fields.name = tooLong(LIMITS.userName);
      else data.name = input.name.trim();
    }
    if ('theme' in input) {
      if (input.theme !== null && !THEMES.includes(input.theme)) fields.theme = 'Tema inválido.';
      else data.theme = input.theme;
    }
    for (const k of ['planningStart', 'planningEnd']) {
      if (k in input) {
        if (!isMinute(input[k])) fields[k] = 'Informe um horário válido.';
        else data[k] = input[k];
      }
    }
    const start = data.planningStart ?? u.planningStart;
    const end = data.planningEnd ?? u.planningEnd;
    if (!fields.planningStart && !fields.planningEnd && start >= end) fields.planningEnd = 'O fim do dia precisa ser depois do começo.';
    if (Object.keys(fields).length) throw invalid(fields);
    return publicUser(await tx.users.update(id, data));
  });
}

export async function deleteUser(store, id, { password }, hasher) {
  const u = await store.transaction((tx) => tx.users.findOne({ id }));
  if (!u) throw unauthenticated();
  if (typeof password !== 'string' || passwordTooLong(password) || !(await hasher.verify(password, u.passwordHash))) throw invalidCredentials();
  await store.transaction(async (tx) => {
    for (const a of await tx.activities.findMany({ userId: id })) await tx.steps.removeMany({ activityId: a.id });
    await tx.activities.removeMany({ userId: id });
    for (const t of USER_TABLES) await tx[t].removeMany({ userId: id });
    await tx.users.remove(id);
  });
}
