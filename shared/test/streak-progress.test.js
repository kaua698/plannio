import { describe, expect, test } from 'vitest';
import { computeStreak } from '../src/streak.js';
import { actualMinutes, buildProgress } from '../src/progress.js';

const HOJE = '2026-11-04';
const dia = (date, total, done) => ({ date, total, done });

describe('computeStreak (exemplos da seção 6 da spec)', () => {
  test('dois dias cumpridos e hoje em andamento', () => {
    expect(computeStreak([dia('2026-11-02', 9, 9), dia('2026-11-03', 8, 8), dia(HOJE, 11, 5)], HOJE)).toEqual({ current: 2, best: 2 });
  });
  test('hoje cumprido soma um', () => {
    expect(computeStreak([dia('2026-11-02', 9, 9), dia('2026-11-03', 8, 8), dia(HOJE, 11, 11)], HOJE)).toEqual({ current: 3, best: 3 });
  });
  test('dia vazio não soma nem quebra', () => {
    expect(computeStreak([dia('2026-11-02', 9, 9), dia('2026-11-03', 0, 0), dia(HOJE, 4, 0)], HOJE)).toEqual({ current: 1, best: 1 });
  });
  test('um dia incompleto quebra a sequência', () => {
    expect(computeStreak([dia('2026-11-01', 3, 3), dia('2026-11-02', 9, 8), dia('2026-11-03', 8, 8)], HOJE)).toEqual({ current: 1, best: 1 });
  });
  test('maior ofensiva guarda uma sequência antiga', () => {
    const antigos = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((d) => dia(d, 2, 2));
    expect(computeStreak([...antigos, dia('2026-10-24', 2, 1), dia('2026-11-03', 2, 2)], HOJE)).toEqual({ current: 1, best: 4 });
  });
  test('sem histórico, tudo zero, e dias futuros são ignorados', () => {
    expect(computeStreak([], HOJE)).toEqual({ current: 0, best: 0 });
    expect(computeStreak([dia('2026-11-05', 3, 3)], HOJE)).toEqual({ current: 0, best: 0 });
  });
});

const act = (id, date, start, end, extra = {}) => ({ id, date, startMinutes: start, endMinutes: end, status: 'PENDING', categoryId: null, exceptionKind: 'NONE', ...extra });

describe('actualMinutes (RN05)', () => {
  test('horário real tem prioridade, DONE sem horário conta o planejado e os demais contam zero', () => {
    expect(actualMinutes(act('a', HOJE, 600, 660, { status: 'PARTIAL', actualStart: 600, actualEnd: 630 }))).toBe(30);
    expect(actualMinutes(act('b', HOJE, 600, 690, { status: 'DONE' }))).toBe(90);
    expect(actualMinutes(act('c', HOJE, 600, 690, { status: 'PARTIAL' }))).toBe(0);
    expect(actualMinutes(act('d', HOJE, 600, 690, { status: 'NOT_DONE' }))).toBe(0);
  });
});

describe('buildProgress', () => {
  const categories = [
    { id: 'est', name: 'Estudos', color: 'OCRE', weeklyGoalMinutes: 360 },
    { id: 'sau', name: 'Saúde', color: 'EUCALIPTO', weeklyGoalMinutes: 270 },
  ];
  const semana = [
    act('seg', '2026-11-02', 840, 930, { status: 'DONE', categoryId: 'est' }),
    act('ter', '2026-11-03', 930, 990, { status: 'DONE', categoryId: 'est' }),
    act('qua1', HOJE, 600, 630, { status: 'DONE' }),
    act('qua2', HOJE, 840, 930, { status: 'PENDING', categoryId: 'est' }),
    act('qua3', HOJE, 700, 720, { status: 'PENDING' }),
    act('qua4', HOJE, 1020, 1110, { status: 'NOT_DONE', categoryId: 'sau' }),
    act('qua5', HOJE, 500, 520, { status: 'POSTPONED' }),
    act('qua6', HOJE, 520, 540, { status: 'PARTIAL' }),
    act('pulada', HOJE, 540, 560, { status: 'PENDING', exceptionKind: 'SKIPPED' }),
    act('sex', '2026-11-06', 840, 930, { status: 'PENDING', categoryId: 'est' }),
  ];
  const p = () => buildProgress({ activities: semana, previousWeek: [act('ant', '2026-10-28', 600, 720, { status: 'DONE' })], categories, weekStart: '2026-11-02', today: HOJE, minutes: 860 });

  test('conta status, sem registro e por vir, ignorando puladas', () => {
    expect(p().counts).toEqual({ planned: 9, done: 3, partial: 1, notDone: 1, postponed: 1, noRecord: 1, upcoming: 2 });
  });
  test('cumprido por dia, nulo nos dias futuros e nos vazios', () => {
    expect(p().byDay.map((d) => [d.date, d.total, d.done, d.percent])).toEqual([
      ['2026-11-02', 1, 1, 100], ['2026-11-03', 1, 1, 100], [HOJE, 6, 1, 17],
      ['2026-11-05', 0, 0, null], ['2026-11-06', 1, 0, null], ['2026-11-07', 0, 0, null], ['2026-11-08', 0, 0, null],
    ]);
  });
  test('tempo por categoria com metas e Sem categoria', () => {
    expect(p().byCategory).toEqual([
      { id: 'est', label: 'Estudos', color: 'OCRE', plannedMinutes: 330, actualMinutes: 150, goalMinutes: 360 },
      { id: 'sau', label: 'Saúde', color: 'EUCALIPTO', plannedMinutes: 90, actualMinutes: 0, goalMinutes: 270 },
      { id: null, label: 'Sem categoria', color: null, plannedMinutes: 90, actualMinutes: 30, goalMinutes: null },
    ]);
  });
  test('realizado da semana anterior', () => {
    expect(p().previousActualMinutes).toBe(120);
  });
});
