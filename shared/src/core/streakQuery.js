import { computeStreak } from '../streak.js';
import { ensureOccurrencesIn } from './activities.js';
import './routines.js';
import { requireDate } from './validate.js';

// Resume, por dia, quantas atividades ficaram em cada data e quantas foram concluídas.
export async function daySummaries(tx, userId, until) {
  const acts = await tx.activities.findMany({ userId, date: { lte: until } });
  const map = new Map();
  for (const a of acts) {
    if (a.exceptionKind === 'SKIPPED' || a.startMinutes == null) continue;
    const d = map.get(a.date) || { date: a.date, total: 0, done: 0 };
    d.total += 1;
    if (a.status === 'DONE') d.done += 1;
    map.set(a.date, d);
  }
  return [...map.values()];
}

export async function streakInTx(tx, userId, today) {
  await ensureOccurrencesIn(tx, userId, today);
  const days = await daySummaries(tx, userId, today);
  const t = days.find((d) => d.date === today) || { total: 0, done: 0 };
  return { ...computeStreak(days, today), today: { total: t.total, done: t.done } };
}

export async function getStreak(store, userId, { today }) {
  requireDate(today, 'today');
  return store.transaction((tx) => streakInTx(tx, userId, today));
}
