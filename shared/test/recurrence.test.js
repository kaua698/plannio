import { describe, expect, test } from 'vitest';
import { addDays, mondayOf, weekday } from '../src/dates.js';
import { occurrencesBetween } from '../src/recurrence.js';

const rule = (extra) => ({ frequency: 'DAILY', weekdays: [], startDate: '2026-11-02', endDate: null, cancelledFrom: null, ...extra });

describe('datas', () => {
  test('addDays atravessa a virada do ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  test('weekday usa 0 para domingo', () => {
    expect(weekday('2026-11-02')).toBe(1);
    expect(weekday('2026-11-08')).toBe(0);
  });
  test('mondayOf devolve a segunda-feira da semana', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
  });
});

describe('occurrencesBetween', () => {
  test('DAILY gera todos os dias do intervalo', () => {
    expect(occurrencesBetween(rule(), '2026-11-02', '2026-11-04')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });
  test('WEEKDAYS pula o fim de semana', () => {
    expect(occurrencesBetween(rule({ frequency: 'WEEKDAYS' }), '2026-11-06', '2026-11-09')).toEqual(['2026-11-06', '2026-11-09']);
  });
  test('SPECIFIC_DAYS usa os dias escolhidos', () => {
    expect(occurrencesBetween(rule({ frequency: 'SPECIFIC_DAYS', weekdays: [1, 3, 5] }), '2026-11-02', '2026-11-08'))
      .toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
  });
  test('CUSTOM a cada 3 dias conta a partir do início', () => {
    expect(occurrencesBetween(rule({ frequency: 'CUSTOM', intervalValue: 3, intervalUnit: 'DAY' }), '2026-11-02', '2026-11-08'))
      .toEqual(['2026-11-02', '2026-11-05', '2026-11-08']);
  });
  test('CUSTOM a cada 2 semanas nas segundas', () => {
    expect(occurrencesBetween(rule({ frequency: 'CUSTOM', intervalValue: 2, intervalUnit: 'WEEK', weekdays: [1] }), '2026-11-02', '2026-11-16'))
      .toEqual(['2026-11-02', '2026-11-16']);
  });
  test('respeita início, fim e cancelamento', () => {
    expect(occurrencesBetween(rule({ startDate: '2026-11-03' }), '2026-11-01', '2026-11-04')).toEqual(['2026-11-03', '2026-11-04']);
    expect(occurrencesBetween(rule({ endDate: '2026-11-03' }), '2026-11-02', '2026-11-06')).toEqual(['2026-11-02', '2026-11-03']);
    expect(occurrencesBetween(rule({ cancelledFrom: '2026-11-04' }), '2026-11-02', '2026-11-06')).toEqual(['2026-11-02', '2026-11-03']);
  });
});
