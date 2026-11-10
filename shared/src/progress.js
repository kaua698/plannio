import { addDays } from './dates.js';

// Tempo realizado (RN05): horário real, se houver; senão, DONE conta o planejado.
export function actualMinutes(a) {
  if (a.actualStart != null && a.actualEnd != null) return a.actualEnd - a.actualStart;
  if (a.status === 'DONE') return a.endMinutes - a.startMinutes;
  return 0;
}

const counted = (a) => Boolean(a.date) && a.startMinutes != null && a.exceptionKind !== 'SKIPPED';

export function buildProgress({ activities, previousWeek = [], categories = [], weekStart, today, minutes }) {
  const acts = activities.filter(counted);
  const counts = { planned: acts.length, done: 0, partial: 0, notDone: 0, postponed: 0, noRecord: 0, upcoming: 0 };
  for (const a of acts) {
    if (a.status === 'DONE') counts.done += 1;
    else if (a.status === 'PARTIAL') counts.partial += 1;
    else if (a.status === 'NOT_DONE') counts.notDone += 1;
    else if (a.status === 'POSTPONED') counts.postponed += 1;
    else if (a.date < today || (a.date === today && a.endMinutes <= minutes)) counts.noRecord += 1;
    else counts.upcoming += 1;
  }

  const byDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const day = acts.filter((a) => a.date === date);
    const done = day.filter((a) => a.status === 'DONE').length;
    const percent = date > today || day.length === 0 ? null : Math.round((done / day.length) * 100);
    return { date, total: day.length, done, percent };
  });

  const groups = new Map(categories.map((c) => [c.id, {
    id: c.id, label: c.name, color: c.color, plannedMinutes: 0, actualMinutes: 0, goalMinutes: c.weeklyGoalMinutes ?? null,
  }]));
  const none = { id: null, label: 'Sem categoria', color: null, plannedMinutes: 0, actualMinutes: 0, goalMinutes: null };
  for (const a of acts) {
    const g = (a.categoryId && groups.get(a.categoryId)) || none;
    g.plannedMinutes += a.endMinutes - a.startMinutes;
    g.actualMinutes += actualMinutes(a);
  }
  const byCategory = [...groups.values()]
    .filter((g) => g.plannedMinutes > 0 || g.goalMinutes != null)
    .sort((x, y) => y.plannedMinutes - x.plannedMinutes);
  if (none.plannedMinutes > 0) byCategory.push(none);

  const previousActualMinutes = previousWeek.filter(counted).reduce((s, a) => s + actualMinutes(a), 0);
  return { counts, byDay, byCategory, previousActualMinutes };
}
