import { addDays, weekday } from '../dates.js';
import { buildProgress } from '../progress.js';
import { ensureOccurrencesIn } from './activities.js';
import { invalid } from './errors.js';
import { streakInTx } from './streakQuery.js';
import { checkWithinTwoYears, isMinute, requireDate } from './validate.js';

export async function getProgress(store, userId, { weekStart, today, minutes }) {
  requireDate(weekStart, 'weekStart');
  requireDate(today, 'today');
  checkWithinTwoYears(weekStart, today, 'weekStart');
  if (weekday(weekStart) !== 1) throw invalid({ weekStart: 'A semana começa na segunda-feira.' });
  if (!isMinute(minutes)) throw invalid({ minutes: 'Horário inválido.' });
  return store.transaction(async (tx) => {
    const end = addDays(weekStart, 6);
    await ensureOccurrencesIn(tx, userId, end > today ? end : today);
    const activities = await tx.activities.findMany({ userId, date: { gte: weekStart, lte: end } });
    const previousWeek = await tx.activities.findMany({ userId, date: { gte: addDays(weekStart, -7), lte: addDays(weekStart, -1) } });
    const categories = await tx.categories.findMany({ userId });
    const { current, best } = await streakInTx(tx, userId, today);
    return { streak: { current, best }, ...buildProgress({ activities, previousWeek, categories, weekStart, today, minutes }) };
  });
}
