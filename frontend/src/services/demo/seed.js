import { addDays } from '@plannio/shared/dates';
import { ensureOccurrences } from '@plannio/shared/core/routines';

// Rotina de exemplo das telas de referência, com 12 dias de ofensiva até ontem.
const ROUTINES = [
  ['Acordar', 'Pessoal', 390, 420, 'WEEKDAYS'],
  ['Café da manhã', 'Pessoal', 420, 450, 'WEEKDAYS'],
  ['Ir para a faculdade', 'Faculdade', 450, 480, 'WEEKDAYS'],
  ['Faculdade', 'Faculdade', 480, 720, 'WEEKDAYS', { isFixed: true }],
  ['Almoço', 'Pessoal', 720, 780, 'DAILY'],
  ['Hora de estudar', 'Estudos', 840, 930, 'SPECIFIC_DAYS', { weekdays: [1, 3, 5], steps: ['Revisar a aula de hoje', 'Fazer os exercícios'] }],
  ['Inglês', 'Estudos', 930, 990, 'SPECIFIC_DAYS', { weekdays: [2, 3, 4] }],
  ['Academia', 'Saúde', 1020, 1110, 'SPECIFIC_DAYS', { weekdays: [1, 3, 5], isFixed: true }],
  ['Acordar', 'Pessoal', 540, 570, 'SPECIFIC_DAYS', { weekdays: [0, 6] }],
  ['Leitura', 'Pessoal', 600, 660, 'SPECIFIC_DAYS', { weekdays: [0, 6] }],
  ['Jantar', 'Pessoal', 1170, 1200, 'DAILY'],
  ['Dormir', 'Pessoal', 1350, 1380, 'DAILY'],
];
const STREAK_DAYS = 12;

export async function seedDemo(store, userId, now) {
  const start = addDays(now.date, -STREAK_DAYS);
  await store.transaction(async (tx) => {
    const cats = await tx.categories.findMany({ userId });
    const catId = (name) => cats.find((c) => c.name === name)?.id ?? null;
    for (const c of cats) {
      if (c.name === 'Estudos') await tx.categories.update(c.id, { weeklyGoalMinutes: 360 });
      if (c.name === 'Saúde') await tx.categories.update(c.id, { weeklyGoalMinutes: 270 });
    }
    for (const [name, cat, s, e, frequency, extra = {}] of ROUTINES) {
      await tx.routines.insert({
        userId, name, description: null, categoryId: catId(cat), priority: null, isFixed: Boolean(extra.isFixed),
        startMinutes: s, endMinutes: e, steps: extra.steps || [], frequency, weekdays: extra.weekdays || [],
        intervalValue: null, intervalUnit: null, startDate: start, endDate: null, generatedUntil: null, cancelledFrom: null,
      });
    }
    await ensureOccurrences(tx, userId, now.date);
    for (const a of await tx.activities.findMany({ userId, date: { lte: now.date } })) {
      if (a.date < now.date || a.endMinutes <= now.minutes) await tx.activities.update(a.id, { status: 'DONE' });
    }
    for (const [name, cat, minutes] of [['Comprar caderno', 'Pessoal', 30], ['Ligar para o dentista', 'Saúde', 15]]) {
      await tx.activities.insert({
        userId, name, description: null, categoryId: catId(cat), priority: null, isFixed: false, date: null, startMinutes: null,
        endMinutes: null, estimatedMinutes: minutes, status: 'PENDING', actualStart: null, actualEnd: null,
        routineId: null, occurrenceDate: null, exceptionKind: 'NONE', version: 1,
      });
    }
  });
}
