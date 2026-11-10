import { AppError, invalid, notFound } from './errors.js';
import { LIMITS, tooLong } from './validate.js';

export const COLORS = ['BARRO', 'OCRE', 'MUSGO', 'EUCALIPTO', 'AZUL', 'VIOLETA', 'AMEIXA'];
const DEFAULTS = [['Pessoal', 'BARRO'], ['Faculdade', 'AZUL'], ['Estudos', 'OCRE'], ['Saúde', 'EUCALIPTO']];

const pub = (c) => ({ id: c.id, name: c.name, color: c.color, weeklyGoalMinutes: c.weeklyGoalMinutes ?? null });

function check(input, partial) {
  const fields = {};
  if (!partial || 'name' in input) {
    if (typeof input.name !== 'string' || !input.name.trim()) fields.name = 'Informe o nome da categoria.';
    else if (input.name.trim().length > LIMITS.category) fields.name = tooLong(LIMITS.category);
  }
  if (!partial || 'color' in input) {
    if (!COLORS.includes(input.color)) fields.color = 'Escolha uma das cores da lista.';
  }
  if ('weeklyGoalMinutes' in input && input.weeklyGoalMinutes != null) {
    if (!Number.isInteger(input.weeklyGoalMinutes) || input.weeklyGoalMinutes <= 0 || input.weeklyGoalMinutes > 10080) {
      fields.weeklyGoalMinutes = 'Informe uma meta em minutos maior que zero.';
    }
  }
  if (Object.keys(fields).length) throw invalid(fields);
}

async function ensureUniqueName(tx, userId, name, exceptId) {
  const same = (await tx.categories.findMany({ userId })).find((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (same) throw new AppError(409, 'NAME_TAKEN', 'Já existe uma categoria com esse nome.', { name: 'Já existe uma categoria com esse nome.' });
}

export async function insertDefaultCategories(tx, userId) {
  for (const [name, color] of DEFAULTS) await tx.categories.insert({ userId, name, color, weeklyGoalMinutes: null });
}

export async function listCategories(store, userId) {
  return store.transaction(async (tx) => (await tx.categories.findMany({ userId })).map(pub));
}

export async function createCategory(store, userId, input) {
  check(input, false);
  return store.transaction(async (tx) => {
    await ensureUniqueName(tx, userId, input.name);
    return pub(await tx.categories.insert({ userId, name: input.name.trim(), color: input.color, weeklyGoalMinutes: input.weeklyGoalMinutes ?? null }));
  });
}

export async function updateCategory(store, userId, id, input) {
  check(input, true);
  return store.transaction(async (tx) => {
    const c = await tx.categories.findOne({ id, userId });
    if (!c) throw notFound('Esta categoria não foi encontrada.');
    if ('name' in input) await ensureUniqueName(tx, userId, input.name, id);
    const data = {};
    for (const k of ['color', 'weeklyGoalMinutes']) if (k in input) data[k] = input[k] ?? null;
    if ('name' in input) data.name = input.name.trim();
    return pub(await tx.categories.update(id, data));
  });
}

export async function deleteCategory(store, userId, id) {
  return store.transaction(async (tx) => {
    const c = await tx.categories.findOne({ id, userId });
    if (!c) throw notFound('Esta categoria não foi encontrada.');
    for (const t of ['activities', 'routines']) {
      for (const row of await tx[t].findMany({ userId, categoryId: id })) await tx[t].update(row.id, { categoryId: null });
    }
    await tx.categories.remove(id);
  });
}
