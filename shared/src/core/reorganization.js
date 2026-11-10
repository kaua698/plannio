import { addDays } from '../dates.js';
import { suggest, validateOption } from '../reorganizer.js';
import { AppError, MESSAGES, invalid } from './errors.js';
import { ensureOccurrencesIn, loadOwned, present, recordChange, updateInTx } from './activities.js';
import './routines.js';
import { checkWithinTwoYears, requireDate, requireNow } from './validate.js';

const REORGANIZABLE = new Set(['PENDING', 'POSTPONED']);
const DAYS_AHEAD = 7;

const notReorganizable = () => new AppError(409, 'NOT_REORGANIZABLE', 'Esta atividade não pode ser reorganizada.');
const agendaChanged = () => new AppError(409, 'AGENDA_CHANGED', MESSAGES.agendaChanged);

export async function planningOf(tx, userId) {
  const u = await tx.users.findOne({ id: userId });
  return { start: u?.planningStart ?? 360, end: u?.planningEnd ?? 1380 };
}

async function agenda(tx, userId, from, base) {
  const to = addDays(base, DAYS_AHEAD);
  await ensureOccurrencesIn(tx, userId, to);
  return tx.activities.findMany({ userId, date: { gte: from, lte: to } });
}

const baseOf = (a, now) => (a.date && a.date > now.date ? a.date : now.date);

function checkReorganizable(a) {
  if (!a.date || a.isFixed || !REORGANIZABLE.has(a.status) || a.exceptionKind === 'SKIPPED') throw notReorganizable();
}

export async function getSuggestions(store, userId, id, { now }) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const target = await loadOwned(tx, userId, id);
    checkReorganizable(target);
    const activities = await agenda(tx, userId, now.date, baseOf(target, now));
    const byId = new Map(activities.map((a) => [a.id, a]));
    const options = suggest({ target, activities, now, planning: await planningOf(tx, userId), allowMoves: true })
      .map((o) => ({ ...o, moves: o.moves.map((m) => ({ ...m, name: byId.get(m.activityId).name, version: byId.get(m.activityId).version })) }));
    return { targetVersion: target.version, options };
  });
}

export async function applyOption(store, userId, id, { option, targetVersion, requestId, now }) {
  requireNow(now);
  if (typeof requestId !== 'string' || !requestId) throw invalid({ requestId: 'Pedido sem identificação.' });
  if (!option || typeof option.date !== 'string') throw invalid({ option: 'Escolha uma opção.' });
  return store.transaction(async (tx) => {
    const target = await loadOwned(tx, userId, id);
    const done = await tx.changes.findMany({ userId, requestId });
    if (done.length) {
      const moved = await Promise.all(done.filter((c) => c.activityId !== id).map(async (c) => present(tx, await tx.activities.findOne({ id: c.activityId }))));
      return { activity: await present(tx, target), moved };
    }
    checkReorganizable(target);
    if (target.version !== targetVersion) throw agendaChanged();
    const activities = await agenda(tx, userId, now.date, option.date > baseOf(target, now) ? option.date : baseOf(target, now));
    const mine = new Map(activities.map((a) => [a.id, a]));
    for (const m of option.moves || []) {
      const a = mine.get(m.activityId);
      if (!a || a.version !== m.version) throw agendaChanged();
    }
    const planning = await planningOf(tx, userId);
    if (!validateOption({ target, activities, option, now, planning })) throw agendaChanged();

    const move = async (a, date, start, end) => {
      const saved = await tx.activities.update(a.id, {
        date, startMinutes: start, endMinutes: end, status: 'PENDING', version: a.version + 1,
        exceptionKind: a.routineId && a.exceptionKind === 'NONE' ? 'CHANGED' : a.exceptionKind,
      });
      await recordChange(tx, a, saved, 'REORGANIZE', requestId);
      return saved;
    };
    const savedTarget = await move(target, option.date, option.start, option.end);
    const moved = [];
    for (const m of option.moves || []) moved.push(await move(mine.get(m.activityId), option.date, m.toStart, m.toEnd));
    return { activity: await present(tx, savedTarget), moved: await Promise.all(moved.map((a) => present(tx, a))) };
  });
}

export async function inboxSuggestions(store, userId, id, { now }) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const item = await loadOwned(tx, userId, id);
    if (item.date) throw notReorganizable();
    const activities = await agenda(tx, userId, now.date, now.date);
    return { options: suggest({ target: item, activities, now, planning: await planningOf(tx, userId), allowMoves: false }) };
  });
}

export async function scheduleInbox(store, userId, id, { date, startMinutes, endMinutes, allowOverlap = false, now }) {
  requireNow(now);
  return store.transaction(async (tx) => {
    const item = await loadOwned(tx, userId, id);
    if (item.date) throw invalid({ date: 'Esta atividade já tem horário.' });
    if (date != null) { requireDate(date, 'date'); checkWithinTwoYears(date, now.date); }
    await ensureOccurrencesIn(tx, userId, date || now.date);
    const saved = await updateInTx(tx, userId, item, { date, startMinutes, endMinutes, allowOverlap }, now, { record: false });
    return present(tx, saved);
  });
}
