import { addDays, diffDays, isDate } from '../dates.js';
import { AppError, MESSAGES, invalid, notFound } from './errors.js';
import { LIMITS, checkSteps, checkWithinTwoYears, isMinute, requireDate, requireNow, tooLong } from './validate.js';

export const STATUSES = ['PENDING', 'DONE', 'PARTIAL', 'NOT_DONE', 'POSTPONED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const OCCUPYING = new Set(['PENDING', 'DONE', 'PARTIAL']);
const MAX_RANGE_DAYS = 62;

export const occupies = (a) => Boolean(a.date) && a.startMinutes != null && OCCUPYING.has(a.status) && a.exceptionKind !== 'SKIPPED';
const overlap = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
const byTime = (x, y) => (x.date === y.date ? x.startMinutes - y.startMinutes : x.date < y.date ? -1 : 1);

// Hook preenchido pelo módulo de repetições, para gerar ocorrências antes de ler a agenda.
let ensureHook = async () => {};
export const setEnsureOccurrences = (fn) => { ensureHook = fn; };
export const ensureOccurrencesIn = (tx, userId, until) => ensureHook(tx, userId, until);

export async function present(tx, a) {
  const steps = (await tx.steps.findMany({ activityId: a.id })).sort((x, y) => x.position - y.position)
    .map((s) => ({ id: s.id, text: s.text, done: s.done }));
  const c = a.categoryId ? await tx.categories.findOne({ id: a.categoryId }) : null;
  return {
    id: a.id, name: a.name, description: a.description ?? null, categoryId: a.categoryId ?? null,
    category: c ? { id: c.id, name: c.name, color: c.color } : null,
    priority: a.priority ?? null, isFixed: Boolean(a.isFixed), date: a.date ?? null,
    startMinutes: a.startMinutes ?? null, endMinutes: a.endMinutes ?? null, estimatedMinutes: a.estimatedMinutes ?? null,
    status: a.status, actualStart: a.actualStart ?? null, actualEnd: a.actualEnd ?? null,
    routineId: a.routineId ?? null, occurrenceDate: a.occurrenceDate ?? null, exceptionKind: a.exceptionKind ?? 'NONE',
    version: a.version, createdAt: a.createdAt, steps,
  };
}

export async function loadOwned(tx, userId, id) {
  const a = await tx.activities.findOne({ id, userId });
  if (!a) throw notFound();
  return a;
}

export async function findOverlaps(tx, userId, { date, start, end, excludeIds = [] }) {
  const acts = await tx.activities.findMany({ userId, date });
  return acts.filter((a) => !excludeIds.includes(a.id) && occupies(a) && overlap(start, end, a.startMinutes, a.endMinutes))
    .sort(byTime)
    .map((a) => ({ id: a.id, name: a.name, date: a.date, startMinutes: a.startMinutes, endMinutes: a.endMinutes }));
}

export function overlapError(overlaps) {
  return new AppError(409, 'OVERLAP', MESSAGES.overlap, undefined, { overlaps });
}

export async function recordChange(tx, before, after, reason, requestId = null) {
  return tx.changes.insert({
    userId: before.userId, activityId: before.id, activityName: after.name ?? before.name, reason,
    fromDate: before.date ?? null, fromStart: before.startMinutes ?? null, fromEnd: before.endMinutes ?? null,
    toDate: after.date ?? null, toStart: after.startMinutes ?? null, toEnd: after.endMinutes ?? null, requestId,
  });
}

export async function replaceSteps(tx, activityId, steps) {
  await tx.steps.removeMany({ activityId });
  let position = 0;
  for (const s of steps || []) {
    const text = typeof s === 'string' ? s : s.text;
    if (typeof text !== 'string' || !text.trim()) continue;
    await tx.steps.insert({ activityId, text: text.trim(), done: Boolean(s.done), position: position++ });
  }
}

// Valida os campos de uma atividade (completa ou parcial) e devolve os dados normalizados.
export async function normalize(tx, userId, input, now, current = null) {
  const fields = {};
  const merged = { ...(current || {}), ...input };
  if (!current || 'name' in input) {
    if (typeof input.name !== 'string' || !input.name.trim()) fields.name = MESSAGES.name;
    else if (input.name.trim().length > LIMITS.name) fields.name = tooLong(LIMITS.name);
  }
  if ('description' in input && input.description != null
    && (typeof input.description !== 'string' || input.description.length > LIMITS.description)) {
    fields.description = tooLong(LIMITS.description);
  }
  if ('steps' in input) checkSteps(input.steps, fields);
  const scheduleKeys = ['date', 'startMinutes', 'endMinutes'];
  const touchesSchedule = !current || scheduleKeys.some((k) => k in input);
  if (touchesSchedule) {
    const vals = scheduleKeys.map((k) => merged[k] ?? null);
    const filled = vals.filter((v) => v !== null).length;
    if (filled !== 0 && filled !== 3) fields.date = 'Informe data, início e término juntos.';
    else if (filled === 3) {
      if (!isDate(merged.date)) fields.date = 'Informe uma data válida.';
      else if (merged.date > `${Number(now.date.slice(0, 4)) + 2}${now.date.slice(4)}`) fields.date = 'Escolha uma data em até dois anos.';
      if (!isMinute(merged.startMinutes)) fields.startMinutes = 'Informe um horário válido.';
      if (!isMinute(merged.endMinutes)) fields.endMinutes = 'Informe um horário válido.';
      else if (isMinute(merged.startMinutes) && merged.endMinutes <= merged.startMinutes) fields.endMinutes = MESSAGES.end;
    }
  }
  if ('priority' in input && input.priority != null && !PRIORITIES.includes(input.priority)) fields.priority = 'Prioridade inválida.';
  if ('estimatedMinutes' in input && input.estimatedMinutes != null
    && (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes < 5 || input.estimatedMinutes > 1440)) {
    fields.estimatedMinutes = 'Informe uma duração entre 5 minutos e 24 horas.';
  }
  if ('categoryId' in input && input.categoryId != null) {
    const c = await tx.categories.findOne({ id: input.categoryId, userId });
    if (!c) fields.categoryId = 'Escolha uma categoria válida.';
  }
  if (Object.keys(fields).length) throw invalid(fields);

  const data = {};
  for (const k of ['name', 'description', 'categoryId', 'priority']) {
    if (k in input) data[k] = k === 'name' ? input.name.trim() : input[k] ?? null;
  }
  if (touchesSchedule) for (const k of scheduleKeys) data[k] = merged[k] ?? null;
  const scheduled = (touchesSchedule ? data.date : merged.date) != null;
  if ('isFixed' in input || !current) data.isFixed = scheduled ? Boolean(merged.isFixed) : false;
  if (!scheduled) data.estimatedMinutes = merged.estimatedMinutes ?? 30;
  else if ('estimatedMinutes' in input) data.estimatedMinutes = input.estimatedMinutes ?? null;
  return data;
}

export async function createActivity(store, userId, input, now) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const data = await normalize(tx, userId, input, now);
    data.status = data.date && data.date < now.date ? 'DONE' : 'PENDING';
    if (data.date && !input.allowOverlap && OCCUPYING.has(data.status)) {
      const o = await findOverlaps(tx, userId, { date: data.date, start: data.startMinutes, end: data.endMinutes });
      if (o.length) throw overlapError(o);
    }
    const a = await tx.activities.insert({
      userId, description: null, categoryId: null, priority: null, estimatedMinutes: null, actualStart: null, actualEnd: null,
      routineId: null, occurrenceDate: null, exceptionKind: 'NONE', version: 1, ...data,
    });
    await replaceSteps(tx, a.id, input.steps);
    return present(tx, a);
  });
}

// Atualiza uma atividade dentro de uma transação já aberta (usado também por repetições).
export async function updateInTx(tx, userId, a, input, now, { record = true } = {}) {
  const data = await normalize(tx, userId, input, now, a);
  const next = { ...a, ...data };
  if (!a.date && next.date) next.status = next.date < now.date ? 'DONE' : 'PENDING';
  const moved = ['date', 'startMinutes', 'endMinutes'].some((k) => (a[k] ?? null) !== (next[k] ?? null));
  if (moved && next.date && !input.allowOverlap && occupies(next)) {
    const o = await findOverlaps(tx, userId, { date: next.date, start: next.startMinutes, end: next.endMinutes, excludeIds: [a.id] });
    if (o.length) throw overlapError(o);
  }
  if (!next.date) Object.assign(next, { date: null, startMinutes: null, endMinutes: null, isFixed: false });
  const saved = await tx.activities.update(a.id, {
    ...data, status: next.status, date: next.date, startMinutes: next.startMinutes, endMinutes: next.endMinutes,
    isFixed: next.isFixed, version: a.version + 1,
  });
  if (record && moved && a.date) await recordChange(tx, a, saved, 'MANUAL_EDIT');
  if ('steps' in input) await replaceSteps(tx, a.id, input.steps);
  return saved;
}

let updateHook = null;
export const setUpdateHook = (fn) => { updateHook = fn; };
let deleteHook = null;
export const setDeleteHook = (fn) => { deleteHook = fn; };

export async function updateActivity(store, userId, id, input, now) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const a = await loadOwned(tx, userId, id);
    const saved = updateHook ? await updateHook(tx, userId, a, input, now) : await updateInTx(tx, userId, a, input, now);
    return present(tx, saved);
  });
}

export async function removeActivityInTx(tx, a) {
  await tx.steps.removeMany({ activityId: a.id });
  await tx.changes.removeMany({ activityId: a.id });
  await tx.activities.remove(a.id);
}

export async function deleteActivity(store, userId, id, { scope } = {}, now) {
  return store.transaction(async (tx) => {
    const a = await loadOwned(tx, userId, id);
    if (deleteHook) await deleteHook(tx, userId, a, scope, now);
    else await removeActivityInTx(tx, a);
  });
}

export async function getActivity(store, userId, id) {
  return store.transaction(async (tx) => present(tx, await loadOwned(tx, userId, id)));
}

export async function setStatus(store, userId, id, { status, actualStart = null, actualEnd = null }) {
  const fields = {};
  if (!STATUSES.includes(status)) fields.status = 'Status inválido.';
  if ((actualStart == null) !== (actualEnd == null)) fields.actualEnd = 'Informe início e término reais juntos.';
  else if (actualStart != null) {
    if (!isMinute(actualStart)) fields.actualStart = 'Informe um horário válido.';
    if (!isMinute(actualEnd) || actualEnd <= actualStart) fields.actualEnd = MESSAGES.end;
  }
  if (Object.keys(fields).length) throw invalid(fields);
  return store.transaction(async (tx) => {
    const a = await loadOwned(tx, userId, id);
    if (!a.date) throw invalid({ status: 'Agende a atividade antes de registrar o status.' });
    const saved = await tx.activities.update(a.id, { status, actualStart, actualEnd, version: a.version + 1 });
    return present(tx, saved);
  });
}

export async function setStep(store, userId, id, stepId, { done }) {
  return store.transaction(async (tx) => {
    const a = await loadOwned(tx, userId, id);
    const s = await tx.steps.findOne({ id: stepId, activityId: a.id });
    if (!s) throw notFound('Esta etapa não foi encontrada.');
    await tx.steps.update(stepId, { done: Boolean(done) });
    return present(tx, a);
  });
}

export async function listActivities(store, userId, { from, to, nowDate }) {
  requireDate(from, 'from');
  requireDate(to, 'to');
  requireDate(nowDate, 'nowDate');
  if (to < from || diffDays(from, to) > MAX_RANGE_DAYS) throw invalid({ to: `Escolha um intervalo de até ${MAX_RANGE_DAYS} dias.` });
  checkWithinTwoYears(to, nowDate, 'to');
  return store.transaction(async (tx) => {
    await ensureOccurrencesIn(tx, userId, to);
    const acts = (await tx.activities.findMany({ userId, date: { gte: from, lte: to } }))
      .filter((a) => a.exceptionKind !== 'SKIPPED').sort(byTime);
    return Promise.all(acts.map((a) => present(tx, a)));
  });
}

export async function listInbox(store, userId) {
  return store.transaction(async (tx) => {
    const acts = (await tx.activities.findMany({ userId, date: null })).filter((a) => a.exceptionKind !== 'SKIPPED')
      .sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1));
    return Promise.all(acts.map((a) => present(tx, a)));
  });
}

export async function copyDay(store, userId, date, { fromDate }, now) {
  requireNow(now);
  requireDate(date, 'date');
  requireDate(fromDate, 'fromDate');
  if (date < now.date) throw invalid({ date: 'Escolha hoje ou um dia futuro para receber a cópia.' });
  checkWithinTwoYears(date, now.date);
  checkWithinTwoYears(fromDate, now.date, 'fromDate');
  return store.transaction(async (tx) => {
    await ensureOccurrencesIn(tx, userId, date > fromDate ? date : fromDate);
    const source = (await tx.activities.findMany({ userId, date: fromDate }))
      .filter((a) => a.exceptionKind !== 'SKIPPED' && a.startMinutes != null).sort(byTime);
    const taken = (await tx.activities.findMany({ userId, date })).filter(occupies)
      .map((a) => [a.startMinutes, a.endMinutes]);
    let copied = 0;
    let skipped = 0;
    for (const s of source) {
      if (taken.some(([b0, b1]) => overlap(s.startMinutes, s.endMinutes, b0, b1))) { skipped += 1; continue; }
      const c = await tx.activities.insert({
        userId, name: s.name, description: s.description ?? null, categoryId: s.categoryId ?? null, priority: s.priority ?? null,
        isFixed: Boolean(s.isFixed), date, startMinutes: s.startMinutes, endMinutes: s.endMinutes, estimatedMinutes: null,
        status: 'PENDING', actualStart: null, actualEnd: null, routineId: null, occurrenceDate: null, exceptionKind: 'NONE', version: 1,
      });
      const steps = (await tx.steps.findMany({ activityId: s.id })).sort((x, y) => x.position - y.position);
      await replaceSteps(tx, c.id, steps.map((st) => st.text));
      taken.push([s.startMinutes, s.endMinutes]);
      copied += 1;
    }
    return { copied, skipped };
  });
}

export { addDays };
