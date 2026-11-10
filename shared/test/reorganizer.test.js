import { describe, expect, test } from 'vitest';
import { suggest, validateOption } from '../src/reorganizer.js';

const act = (id, date, start, end, extra = {}) => ({
  id, name: id, date, startMinutes: start, endMinutes: end, status: 'PENDING', isFixed: false, priority: null, exceptionKind: 'NONE', ...extra,
});
const HOJE = '2026-11-04';
const now = { date: HOJE, minutes: 860 };
const planning = { start: 360, end: 1380 };
const target = act('estudar', HOJE, 840, 930);
const dia = () => [
  act('ingles', HOJE, 930, 990),
  act('organizar', HOJE, 990, 1020),
  act('academia', HOJE, 1020, 1110, { isFixed: true }),
  act('jantar', HOJE, 1170, 1200),
  act('dormir', HOJE, 1350, 1380),
];
const base = { target, activities: dia(), now, planning, allowMoves: true };
const amanha = () => [
  act('acordar', '2026-11-05', 390, 420), act('cafe', '2026-11-05', 420, 450), act('ida', '2026-11-05', 450, 480),
  act('faculdade', '2026-11-05', 480, 720, { isFixed: true }), act('almoco', '2026-11-05', 720, 780),
];
const lotado = (from, n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(2026, 10, Number(from.slice(8)) + i)).toISOString().slice(0, 10);
  return act(`cheio-${d}`, d, 360, 1380, { isFixed: true });
});
const moved = (opts) => opts.flatMap((o) => o.moves.map((m) => m.activityId));

describe('suggest', () => {
  test('reproduz o exemplo da spec (CA08)', () => {
    expect(suggest(base)).toEqual([
      { kind: 'FREE_SAME_DAY', date: HOJE, start: 1200, end: 1290, moves: [] },
      { kind: 'MOVE_SAME_DAY', date: HOJE, start: 870, end: 960, moves: [
        { activityId: 'ingles', fromStart: 930, fromEnd: 990, toStart: 960, toEnd: 1020 },
        { activityId: 'organizar', fromStart: 990, fromEnd: 1020, toStart: 1110, toEnd: 1140 },
      ] },
      { kind: 'NEXT_DAYS', date: '2026-11-05', start: 840, end: 930, moves: [] },
    ]);
  });

  test('Encaixar da Inbox sugere primeiro os horários do exemplo, sem mover', () => {
    const item = { id: 'caderno', date: null, startMinutes: null, endMinutes: null, estimatedMinutes: 30, status: 'PENDING', isFixed: false };
    const opts = suggest({ target: item, activities: [target, ...dia(), ...amanha()], now, planning, allowMoves: false });
    expect(opts[0]).toEqual({ kind: 'FREE_SAME_DAY', date: HOJE, start: 1110, end: 1140, moves: [] });
    expect(opts[1]).toEqual({ kind: 'NEXT_DAYS', date: '2026-11-05', start: 780, end: 810, moves: [] });
    expect(moved(opts)).toEqual([]);
  });

  test('nunca move compromisso fixo', () => {
    expect(moved(suggest(base))).not.toContain('academia');
  });

  test('não move atividade de prioridade alta', () => {
    const acts = dia().map((a) => (a.id === 'ingles' ? { ...a, priority: 'HIGH' } : a));
    expect(moved(suggest({ ...base, activities: acts }))).not.toContain('ingles');
  });

  test('descarta o início que exigiria mover mais de duas atividades', () => {
    const acts = [act('a', HOJE, 930, 960), act('b', HOJE, 960, 990), act('c', HOJE, 990, 1020), act('fixo', HOJE, 1020, 1380, { isFixed: true })];
    for (const o of suggest({ ...base, activities: acts })) expect(o.moves.length).toBeLessThanOrEqual(2);
    expect(suggest({ ...base, activities: acts }).find((o) => o.kind === 'MOVE_SAME_DAY' && o.start === 870)).toBeUndefined();
  });

  test('não sugere horário antes da primeira atividade de outro dia', () => {
    const futuro = act('futuro', '2026-11-06', 840, 930);
    const acts = [act('acordar6', '2026-11-06', 390, 420), act('bloco6', '2026-11-06', 420, 1380, { isFixed: true })];
    const opts = suggest({ target: futuro, activities: [...acts, ...amanha()], now, planning, allowMoves: true });
    for (const o of opts.filter((x) => x.date === '2026-11-05')) expect(o.start).toBeGreaterThanOrEqual(390);
  });

  test('descarta mudança que empurraria uma atividade para fora do horário do dia', () => {
    const acts = [act('longa', HOJE, 930, 1180)];
    const opts = suggest({ ...base, planning: { start: 360, end: 1200 }, activities: acts });
    expect(moved(opts)).not.toContain('longa');
  });

  test('NOT_DONE, POSTPONED e SKIPPED não ocupam a agenda; DONE e PARTIAL ocupam', () => {
    const livre = (status, extra = {}) => dia().map((a) => (a.id === 'jantar' ? { ...a, status, ...extra } : a));
    expect(suggest({ ...base, activities: livre('NOT_DONE') })[0].start).toBe(1110);
    expect(suggest({ ...base, activities: livre('POSTPONED') })[0].start).toBe(1110);
    expect(suggest({ ...base, activities: livre('PENDING', { exceptionKind: 'SKIPPED' }) })[0].start).toBe(1110);
    expect(suggest({ ...base, activities: livre('DONE') })[0].start).toBe(1200);
    expect(suggest({ ...base, activities: livre('PARTIAL') })[0].start).toBe(1200);
  });

  test('não move atividade que começou antes do início mais cedo', () => {
    const alvo = act('ingles', HOJE, 930, 990);
    const acts = [act('estudar', HOJE, 840, 930), act('fixo', HOJE, 990, 1380, { isFixed: true })];
    expect(moved(suggest({ ...base, target: alvo, activities: acts }))).not.toContain('estudar');
  });

  test('alvo de dia passado é sugerido a partir de hoje', () => {
    const passado = act('ontem', '2026-11-03', 840, 930);
    expect(suggest({ ...base, target: passado })[0].date).toBe(HOJE);
  });

  test('alvo em dia futuro usa o próprio dia e não repete o horário atual', () => {
    const futuro = act('futuro', '2026-11-06', 840, 930);
    const opts = suggest({ ...base, target: futuro, activities: [] });
    expect(opts[0].date).toBe('2026-11-06');
    expect(opts.find((o) => o.date === '2026-11-06' && o.start === 840)).toBeUndefined();
  });

  test('completa com outros dias quando hoje não tem horário', () => {
    const opts = suggest({ ...base, now: { date: HOJE, minutes: 1300 }, activities: [] });
    expect(opts.map((o) => [o.kind, o.date, o.start])).toEqual([
      ['NEXT_DAYS', '2026-11-05', 840], ['NEXT_DAYS', '2026-11-06', 840], ['NEXT_DAYS', '2026-11-07', 840],
    ]);
  });

  test('completa com outros horários de hoje quando os próximos dias estão cheios', () => {
    const opts = suggest({ ...base, activities: lotado('2026-11-05', 7) });
    expect(opts.map((o) => [o.kind, o.date, o.start])).toEqual([
      ['FREE_SAME_DAY', HOJE, 870], ['FREE_SAME_DAY', HOJE, 960], ['FREE_SAME_DAY', HOJE, 1050],
    ]);
  });

  test('sem saída devolve lista vazia (E1)', () => {
    const acts = [act('hoje-cheio', HOJE, 360, 1380, { isFixed: true }), ...lotado('2026-11-05', 7)];
    expect(suggest({ ...base, activities: acts })).toEqual([]);
  });

  test('atividade maior que o horário do dia devolve lista vazia, sem erro', () => {
    expect(suggest({ ...base, target: act('enorme', HOJE, 0, 1100), activities: [] })).toEqual([]);
  });

  test('grade de 30 minutos: 14:30 em ponto continua 870, e 23:40 segue para amanhã', () => {
    expect(suggest({ ...base, now: { date: HOJE, minutes: 870 }, activities: [] })[0].start).toBe(870);
    const tarde = suggest({ ...base, now: { date: HOJE, minutes: 1420 }, activities: [] });
    expect(tarde[0].date).toBe('2026-11-05');
  });

  test('responde em menos de 200 ms com 500 atividades', () => {
    const acts = [];
    for (let d = 0; d < 8; d += 1) {
      const date = new Date(Date.UTC(2026, 10, 4 + d)).toISOString().slice(0, 10);
      for (let i = 0; i < 62; i += 1) acts.push(act(`x${d}-${i}`, date, 360 + i * 16, 360 + i * 16 + 10));
    }
    const t0 = performance.now();
    suggest({ ...base, activities: acts.slice(0, 500) });
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('validateOption', () => {
  test('aceita a opção correta', () => {
    const [, opcao2] = suggest(base);
    expect(validateOption({ target, activities: dia(), option: opcao2, now, planning })).toBe(true);
  });
  test('recusa quando surgiu uma atividade no horário escolhido', () => {
    const [opcao1] = suggest(base);
    const acts = [...dia(), act('nova', HOJE, 1200, 1230)];
    expect(validateOption({ target, activities: acts, option: opcao1, now, planning })).toBe(false);
  });
  test('recusa opção que move um compromisso fixo', () => {
    const option = { kind: 'MOVE_SAME_DAY', date: HOJE, start: 870, end: 960, moves: [
      { activityId: 'academia', fromStart: 1020, fromEnd: 1110, toStart: 1200, toEnd: 1290 },
    ] };
    expect(validateOption({ target, activities: dia(), option, now, planning })).toBe(false);
  });
});
