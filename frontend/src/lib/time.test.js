import { describe, expect, test, vi } from 'vitest';
import { formatDuration, formatMinutes, nowLocal, parseTime } from './time.js';

describe('horários', () => {
  test('formatMinutes e parseTime convertem nos dois sentidos', () => {
    expect(formatMinutes(870)).toBe('14:30');
    expect(formatMinutes(390)).toBe('06:30');
    expect(parseTime('14:30')).toBe(870);
    expect(parseTime('25:00')).toBeNull();
  });
  test('formatDuration escreve horas e minutos', () => {
    expect(formatDuration(70)).toBe('1h10');
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(1110)).toBe('18h30');
    expect(formatDuration(120)).toBe('2h');
  });
  test('nowLocal usa o relógio local, inclusive perto da meia-noite', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 4, 23, 30));
    expect(nowLocal()).toEqual({ date: '2026-11-04', minutes: 1410 });
  });
});
