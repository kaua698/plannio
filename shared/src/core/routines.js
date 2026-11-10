import { addDays, isDate } from '../dates.js';
import { occurrencesBetween } from '../recurrence.js';
import { invalid, notFound } from './errors.js';
import {
  findOverlaps, loadOwned, normalize, occupies, overlapError, present, recordChange, removeActivityInTx, replaceSteps,
  setDeleteHook, setEnsureOccurrences, setUpdateHook, updateInTx,
} from './activities.js';
import { checkSteps, checkWithinTwoYears, isMinute, requireDate, requireNow } from './validate.js';

const FREQUENCIES = ['DAILY', 'WEEKDAYS', 'SPECIFIC_DAYS', 'CUSTOM'];
const OVERLAP_WINDOW_DAYS = 14;
const TEMPLATE_KEYS = ['name', 'description', 'categoryId', 'priority', 'isFixed', 'startMinutes', 'endMinutes'];
const RULE_KEYS = ['frequency', 'weekdays', 'intervalValue', 'intervalUnit', 'endDate'];

const pub = (r) => ({
  id: r.id, name: r.name, description: r.description ?? null, categoryId: r.categoryId ?? null, priority: r.priority ?? null,
  isFixed: Boolean(r.isFixed), startMinutes: r.startMinutes, endMinutes: r.endMinutes, steps: r.steps || [],
  frequency: r.frequency, weekdays: r.weekdays || [], intervalValue: r.intervalValue ?? null, intervalUnit: r.intervalUnit ?? null,
  startDate: r.startDate, endDate: r.endDate ?? null, cancelledFrom: r.cancelledFrom ?? null,
});

const loadRoutine = async (tx, userId, id) => {
  const r = await tx.routines.findOne({ id, userId });
  if (!r) throw notFound('Esta repetição não foi encontrada.');
  return r;
};

function checkRule(rule) {
  const fields = {};
  if (!FREQUENCIES.includes(rule.frequency)) fields.frequency = 'Escolha como a ação se repete.';
  const wd = rule.weekdays || [];
  if (!Array.isArray(wd) || wd.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) fields.weekdays = 'Dias da semana inválidos.';
  if (rule.frequency === 'SPECIFIC_DAYS' && !wd.length) fields.weekdays = 'Escolha pelo menos um dia.';
  if (rule.frequency === 'CUSTOM') {
    if (!Number.isInteger(rule.intervalValue) || rule.intervalValue < 1 || rule.intervalValue > 52) fields.intervalValue = 'Informe um intervalo entre 1 e 52.';
    if (!['DAY', 'WEEK'].includes(rule.intervalUnit)) fields.intervalUnit = 'Escolha dias ou semanas.';
  }
  if (rule.endDate != null && (!isDate(rule.endDate) || rule.endDate < rule.startDate)) fields.endDate = 'A data final precisa ser depois do início.';
  if (!isMinute(rule.startMinutes) || !isMinute(rule.endMinutes) || rule.endMinutes <= rule.startMinutes) {
    fields.endMinutes = 'O término precisa ser depois do início.';
  }
  if (Object.keys(fields).length) throw invalid(fields);
}

// Gera as ocorrências que faltam até untilDate, como linhas reais em activities.
export async function ensureOccurrences(tx, userId, untilDate) {
  const routines = await tx.routines.findMany({ userId });
  for (const r of routines) {
    if (r.generatedUntil && r.generatedUntil >= untilDate) continue;
    const from = r.generatedUntil ? addDays(r.generatedUntil, 1) : r.startDate;
    const dates = occurrencesBetween(r, from, untilDate);
    if (dates.length) {
      const existing = new Set((await tx.activities.findMany({ userId, routineId: r.id, occurrenceDate: { gte: from, lte: untilDate } }))
        .map((a) => a.occurrenceDate));
      for (const date of dates) {
        if (existing.has(date)) continue;
        const a = await tx.activities.insert({
          userId, name: r.name, description: r.description ?? null, categoryId: r.categoryId ?? null, priority: r.priority ?? null,
          isFixed: Boolean(r.isFixed), date, startMinutes: r.startMinutes, endMinutes: r.endMinutes, estimatedMinutes: null,
          status: 'PENDING', actualStart: null, actualEnd: null, routineId: r.id, occurrenceDate: date, exceptionKind: 'NONE', version: 1,
        });
        await replaceSteps(tx, a.id, r.steps || []);
      }
    }
    await tx.routines.update(r.id, { generatedUntil: untilDate });
  }
}
setEnsureOccurrences(ensureOccurrences);

async function checkRoutineOverlaps(tx, userId, rule, now, excludeIds = []) {
  const from = rule.startDate > now.date ? rule.startDate : now.date;
  const to = addDays(from, OVERLAP_WINDOW_DAYS - 1);
  await ensureOccurrences(tx, userId, to);
  const found = [];
  for (const date of occurrencesBetween(rule, from, to)) {
    const o = await findOverlaps(tx, userId, { date, start: rule.startMinutes, end: rule.endMinutes, excludeIds });
    found.push(...o.filter((x) => !excludeIds.includes(x.id)));
  }
  if (found.length) throw overlapError(found);
}

async function insertRoutine(tx, userId, template, rule) {
  return tx.routines.insert({
    userId, ...template, frequency: rule.frequency, weekdays: rule.weekdays || [], intervalValue: rule.intervalValue ?? null,
    intervalUnit: rule.intervalUnit ?? null, startDate: rule.startDate, endDate: rule.endDate ?? null, generatedUntil: null, cancelledFrom: null,
  });
}

export async function createRoutine(store, userId, input, now) {
  requireNow(now);
  return store.transaction(async (tx) => {
    let template;
    let startDate = input.startDate;
    let source = null;
    if (input.fromActivityId) {
      source = await loadOwned(tx, userId, input.fromActivityId);
      if (source.routineId || !source.date) throw invalid({ fromActivityId: 'Escolha uma atividade avulsa com horário.' });
      template = {
        name: source.name, description: source.description ?? null, categoryId: source.categoryId ?? null, priority: source.priority ?? null,
        isFixed: Boolean(source.isFixed), startMinutes: source.startMinutes, endMinutes: source.endMinutes,
        steps: (await tx.steps.findMany({ activityId: source.id })).sort((x, y) => x.position - y.position).map((s) => s.text),
      };
      startDate = source.date;
    } else {
      const data = await normalize(tx, userId, { ...input, date: input.startDate }, now);
      template = { ...Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, data[k] ?? null])), isFixed: Boolean(input.isFixed),
        steps: (input.steps || []).map((s) => (typeof s === 'string' ? s : s.text)).filter((s) => s && s.trim()) };
    }
    requireDate(startDate, 'startDate');
    if (startDate < now.date) throw invalid({ startDate: 'A repetição precisa começar hoje ou depois.' });
    checkWithinTwoYears(startDate, now.date, 'startDate');
    const rule = { ...template, ...Object.fromEntries(RULE_KEYS.map((k) => [k, input[k] ?? null])), startDate };
    checkRule(rule);
    if (!input.allowOverlap) await checkRoutineOverlaps(tx, userId, rule, now, source ? [source.id] : []);
    const r = await insertRoutine(tx, userId, template, rule);
    if (source) await tx.activities.update(source.id, { routineId: r.id, occurrenceDate: source.date, exceptionKind: 'NONE', version: source.version + 1 });
    return pub(r);
  });
}

export async function listRoutines(store, userId) {
  return store.transaction(async (tx) => (await tx.routines.findMany({ userId }))
    .sort((x, y) => x.startMinutes - y.startMinutes).map(pub));
}

export async function getRoutine(store, userId, id) {
  return store.transaction(async (tx) => pub(await loadRoutine(tx, userId, id)));
}

// "Este e os próximos": encerra a regra antiga na véspera e cria uma nova a partir de fromDate.
async function splitInTx(tx, userId, r, fromDate, input, now) {
  requireDate(fromDate, 'fromDate');
  if (fromDate < now.date) throw invalid({ fromDate: 'Mudanças valem de hoje em diante.' });
  if (fromDate < r.startDate) throw invalid({ fromDate: 'Escolha uma data a partir do início da repetição.' });
  const stepErrors = {};
  if ('steps' in input) checkSteps(input.steps, stepErrors);
  if (Object.keys(stepErrors).length) throw invalid(stepErrors);
  const cleaned = Object.fromEntries(Object.entries(input).filter(([k]) => TEMPLATE_KEYS.includes(k) || k === 'steps'));
  const data = Object.keys(cleaned).some((k) => k !== 'steps' && k !== 'isFixed')
    ? await normalize(tx, userId, { name: r.name, ...cleaned, date: fromDate, startMinutes: cleaned.startMinutes ?? r.startMinutes, endMinutes: cleaned.endMinutes ?? r.endMinutes }, now)
    : {};
  const template = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, k in data ? data[k] : r[k] ?? null]));
  if ('isFixed' in input) template.isFixed = Boolean(input.isFixed);
  template.steps = 'steps' in input ? (input.steps || []).map((s) => (typeof s === 'string' ? s : s.text)).filter(Boolean) : r.steps || [];
  const rule = { ...template, frequency: r.frequency, weekdays: r.weekdays, intervalValue: r.intervalValue, intervalUnit: r.intervalUnit,
    endDate: r.endDate, ...Object.fromEntries(RULE_KEYS.filter((k) => k in input).map((k) => [k, input[k] ?? null])), startDate: fromDate };
  checkRule(rule);

  const dayBefore = addDays(fromDate, -1);
  await ensureOccurrences(tx, userId, dayBefore);
  const future = await tx.activities.findMany({ userId, routineId: r.id, occurrenceDate: { gte: fromDate } });
  const keep = future.filter((a) => a.exceptionKind !== 'NONE' || a.status !== 'PENDING');
  for (const a of future) if (!keep.includes(a)) await removeActivityInTx(tx, a);
  if (fromDate <= r.startDate) await tx.routines.update(r.id, { endDate: r.startDate, cancelledFrom: r.startDate });
  else await tx.routines.update(r.id, { endDate: dayBefore, generatedUntil: dayBefore });
  if (!input.allowOverlap) await checkRoutineOverlaps(tx, userId, rule, now, keep.map((a) => a.id));
  const next = await insertRoutine(tx, userId, template, rule);
  for (const a of keep) await tx.activities.update(a.id, { routineId: next.id });
  return next;
}

export async function updateRoutine(store, userId, id, input, now) {
  requireNow(now);
  return store.transaction(async (tx) => pub(await splitInTx(tx, userId, await loadRoutine(tx, userId, id), input.fromDate, input, now)));
}

async function cancelInTx(tx, userId, r, fromDate) {
  requireDate(fromDate, 'fromDate');
  await ensureOccurrences(tx, userId, addDays(fromDate, -1));
  await tx.routines.update(r.id, { cancelledFrom: fromDate });
  const future = await tx.activities.findMany({ userId, routineId: r.id, occurrenceDate: { gte: fromDate } });
  for (const a of future) if (a.status === 'PENDING' && a.exceptionKind !== 'DETACHED') await removeActivityInTx(tx, a);
}

export async function cancelRoutine(store, userId, id, { fromDate }, now) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const r = await loadRoutine(tx, userId, id);
    if (fromDate < now.date) throw invalid({ fromDate: 'Escolha hoje ou um dia futuro.' });
    await cancelInTx(tx, userId, r, fromDate);
    return pub(await tx.routines.findOne({ id }));
  });
}

export async function sendToInbox(store, userId, id, now) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const a = await loadOwned(tx, userId, id);
    const minutes = a.startMinutes != null ? a.endMinutes - a.startMinutes : a.estimatedMinutes ?? 30;
    const saved = await tx.activities.update(a.id, {
      date: null, startMinutes: null, endMinutes: null, isFixed: false, status: 'PENDING', estimatedMinutes: minutes,
      exceptionKind: a.routineId ? 'DETACHED' : a.exceptionKind, version: a.version + 1,
    });
    if (a.date) await recordChange(tx, a, saved, 'MANUAL_EDIT');
    return present(tx, saved);
  });
}

const isOccurrence = (a) => a.routineId && a.exceptionKind !== 'DETACHED';
const requireScope = (scope) => {
  if (!['this', 'future'].includes(scope)) throw invalid({ scope: 'Escolha se a mudança vale só para este dia ou para os próximos.' });
};

setUpdateHook(async (tx, userId, a, input, now) => {
  if (!isOccurrence(a)) return updateInTx(tx, userId, a, input, now);
  requireScope(input.scope);
  if (input.scope === 'this') {
    const saved = await updateInTx(tx, userId, a, input, now);
    return tx.activities.update(saved.id, { exceptionKind: 'CHANGED' });
  }
  const r = await loadRoutine(tx, userId, a.routineId);
  const next = await splitInTx(tx, userId, r, a.occurrenceDate, input, now);
  await ensureOccurrences(tx, userId, a.occurrenceDate);
  return tx.activities.findOne({ userId, routineId: next.id, occurrenceDate: a.occurrenceDate })
    || tx.activities.findOne({ id: a.id });
});

setDeleteHook(async (tx, userId, a, scope) => {
  if (!isOccurrence(a)) return removeActivityInTx(tx, a);
  requireScope(scope);
  if (scope === 'this') return tx.activities.update(a.id, { exceptionKind: 'SKIPPED', version: a.version + 1 });
  const r = await loadRoutine(tx, userId, a.routineId);
  return cancelInTx(tx, userId, r, a.occurrenceDate);
});

export { occupies };
