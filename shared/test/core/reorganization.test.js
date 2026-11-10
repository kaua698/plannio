import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../src/core/memoryStore.js';
import { createActivity, listInbox, setStatus, updateActivity } from '../../src/core/activities.js';
import { createRoutine, sendToInbox } from '../../src/core/routines.js';
import { applyOption, getSuggestions, inboxSuggestions, scheduleInbox } from '../../src/core/reorganization.js';
import { getStreak } from '../../src/core/streakQuery.js';
import { getProgress } from '../../src/core/progressQuery.js';
import { deleteHistory, listHistory } from '../../src/core/history.js';

const HOJE = '2026-11-04';
const now = { date: HOJE, minutes: 860 };
const U = 'u1';
let store;
let ids;
const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };
const cria = (name, date, s, e, extra = {}) => createActivity(store, U, { name, date, startMinutes: s, endMinutes: e, ...extra }, { date: '2026-11-01', minutes: 0 });
const tabela = (t) => store.transaction((tx) => tx[t].findMany({ userId: U }));

beforeEach(async () => {
  store = createMemoryStore();
  ids = {};
  for (const [k, n, s, e, x] of [
    ['estudar', 'Hora de estudar', 840, 930], ['ingles', 'Inglês', 930, 990], ['organizar', 'Organizar o quarto', 990, 1020],
    ['academia', 'Academia', 1020, 1110, { isFixed: true }], ['jantar', 'Jantar', 1170, 1200], ['dormir', 'Dormir', 1350, 1380],
  ]) ids[k] = (await cria(n, HOJE, s, e, x)).id;
});

describe('sugestões e confirmação', () => {
  test('sugestões não salvam nada e reproduzem o exemplo', async () => {
    const antes = await store.snapshot();
    const r = await getSuggestions(store, U, ids.estudar, { now });
    expect(await store.snapshot()).toEqual(antes);
    expect(r.options.map((o) => [o.kind, o.date, o.start])).toEqual([
      ['FREE_SAME_DAY', HOJE, 1200], ['MOVE_SAME_DAY', HOJE, 870], ['NEXT_DAYS', '2026-11-05', 840],
    ]);
    expect(r.options[1].moves.map((m) => [m.name, m.version])).toEqual([['Inglês', 1], ['Organizar o quarto', 1]]);
    expect(r.targetVersion).toBe(1);
  });

  test('aplica tudo junto e registra o histórico, sem mexer no fixo (CA09)', async () => {
    const { options, targetVersion } = await getSuggestions(store, U, ids.estudar, { now });
    const r = await applyOption(store, U, ids.estudar, { option: options[1], targetVersion, requestId: 'req-1', now });
    expect([r.activity.startMinutes, ...r.moved.map((m) => m.startMinutes)]).toEqual([870, 960, 1110]);
    const acts = await tabela('activities');
    expect(acts.find((a) => a.id === ids.academia)).toMatchObject({ startMinutes: 1020, version: 1 });
    const ch = await tabela('changes');
    expect(ch.map((c) => [c.reason, c.fromStart, c.toStart])).toEqual([['REORGANIZE', 840, 870], ['REORGANIZE', 930, 960], ['REORGANIZE', 990, 1110]]);
  });

  test('agenda mudou antes de confirmar: AGENDA_CHANGED e nada muda (E2)', async () => {
    const { options, targetVersion } = await getSuggestions(store, U, ids.estudar, { now });
    await cria('Ligação', HOJE, 1200, 1230);
    const antes = await store.snapshot();
    expect((await erro(applyOption(store, U, ids.estudar, { option: options[0], targetVersion, requestId: 'r', now }))).code).toBe('AGENDA_CHANGED');
    expect(await store.snapshot()).toEqual(antes);
  });

  test('versão antiga de uma atividade movida: AGENDA_CHANGED', async () => {
    const { options, targetVersion } = await getSuggestions(store, U, ids.estudar, { now });
    await updateActivity(store, U, ids.ingles, { name: 'Inglês 2' }, now);
    expect((await erro(applyOption(store, U, ids.estudar, { option: options[1], targetVersion, requestId: 'r', now }))).code).toBe('AGENDA_CHANGED');
  });

  test('repetir com o mesmo requestId altera uma vez só (E3)', async () => {
    const { options, targetVersion } = await getSuggestions(store, U, ids.estudar, { now });
    await applyOption(store, U, ids.estudar, { option: options[1], targetVersion, requestId: 'req-x', now });
    const r2 = await applyOption(store, U, ids.estudar, { option: options[1], targetVersion, requestId: 'req-x', now });
    expect(r2.activity.startMinutes).toBe(870);
    expect(await tabela('changes')).toHaveLength(3);
  });

  test('erro no meio da gravação não salva nada (atomicidade)', async () => {
    const { options, targetVersion } = await getSuggestions(store, U, ids.estudar, { now });
    const antes = await store.snapshot();
    let n = 0;
    const falho = { ...store, transaction: (fn) => store.transaction((tx) => fn({ ...tx, activities: { ...tx.activities,
      update: async (...a) => { n += 1; if (n === 2) throw new Error('falha'); return tx.activities.update(...a); } } })) };
    await erro(applyOption(falho, U, ids.estudar, { option: options[1], targetVersion, requestId: 'r', now }));
    expect(await store.snapshot()).toEqual(antes);
  });

  test('o relógio local decide hoje: 23:30 segue para amanhã', async () => {
    const r = await getSuggestions(store, U, ids.estudar, { now: { date: HOJE, minutes: 1410 } });
    expect(r.options[0].date).toBe('2026-11-05');
  });

  test('fixa, concluída e item da Inbox respondem NOT_REORGANIZABLE', async () => {
    await setStatus(store, U, ids.jantar, { status: 'DONE' });
    const inbox = await createActivity(store, U, { name: 'Caderno' }, now);
    for (const id of [ids.academia, ids.jantar, inbox.id]) {
      expect((await erro(getSuggestions(store, U, id, { now }))).code).toBe('NOT_REORGANIZABLE');
    }
  });

  test('adiada volta a pendente ao receber novo horário', async () => {
    await setStatus(store, U, ids.organizar, { status: 'POSTPONED' });
    const { options, targetVersion } = await getSuggestions(store, U, ids.organizar, { now });
    expect((await applyOption(store, U, ids.organizar, { option: options[0], targetVersion, requestId: 'r', now })).activity.status).toBe('PENDING');
  });

  test('ocorrência reorganizada vira CHANGED', async () => {
    await createRoutine(store, U, { name: 'Leitura', startMinutes: 1260, endMinutes: 1290, frequency: 'DAILY', startDate: HOJE }, now);
    await getStreak(store, U, { today: HOJE });
    const leitura = (await tabela('activities')).find((a) => a.name === 'Leitura' && a.date === HOJE);
    const { options, targetVersion } = await getSuggestions(store, U, leitura.id, { now });
    const r = await applyOption(store, U, leitura.id, { option: options[0], targetVersion, requestId: 'r', now });
    expect(r.activity.exceptionKind).toBe('CHANGED');
  });

  test('outro usuário recebe NOT_FOUND; mover atividade alheia responde AGENDA_CHANGED', async () => {
    expect((await erro(getSuggestions(store, 'u2', ids.estudar, { now }))).code).toBe('NOT_FOUND');
    const alheia = await createActivity(store, 'u2', { name: 'X', date: HOJE, startMinutes: 1440 - 60, endMinutes: 1440 }, now);
    const option = { kind: 'MOVE_SAME_DAY', date: HOJE, start: 870, end: 960, moves: [{ activityId: alheia.id, fromStart: 1380, fromEnd: 1440, toStart: 1400, toEnd: 1460, version: 1 }] };
    expect((await erro(applyOption(store, U, ids.estudar, { option, targetVersion: 1, requestId: 'r', now }))).code).toBe('AGENDA_CHANGED');
  });
});

describe('encaixe da Inbox', () => {
  test('sugere sem mover e, ao agendar, tira da Inbox (CA13)', async () => {
    for (const [n, s, e] of [['Acordar', 390, 420], ['Café', 420, 450], ['Ida', 450, 480], ['Faculdade', 480, 720], ['Almoço', 720, 780]]) {
      await cria(n, '2026-11-05', s, e);
    }
    const item = await createActivity(store, U, { name: 'Comprar caderno' }, now);
    const { options } = await inboxSuggestions(store, U, item.id, { now });
    expect(options.slice(0, 2).map((o) => [o.date, o.start, o.end])).toEqual([[HOJE, 1110, 1140], ['2026-11-05', 780, 810]]);
    expect(options.every((o) => o.moves.length === 0)).toBe(true);
    const ag = await scheduleInbox(store, U, item.id, { date: HOJE, startMinutes: 1110, endMinutes: 1140, now });
    expect(ag).toMatchObject({ date: HOJE, startMinutes: 1110, status: 'PENDING' });
    expect(await listInbox(store, U)).toEqual([]);
  });
});

describe('ofensiva pelo núcleo', () => {
  const marca = async (date, status = 'DONE') => {
    for (const a of (await tabela('activities')).filter((x) => x.date === date)) await setStatus(store, U, a.id, { status });
  };
  beforeEach(async () => {
    await createActivity(store, U, { name: 'Seg', date: '2026-11-02', startMinutes: 600, endMinutes: 630 }, now);
    await createActivity(store, U, { name: 'Ter', date: '2026-11-03', startMinutes: 600, endMinutes: 630 }, now);
  });

  test('dias passados cumpridos e hoje em andamento', async () => {
    expect(await getStreak(store, U, { today: HOJE })).toEqual({ current: 2, best: 2, today: { total: 6, done: 0 } });
  });
  test('mover uma atividade para outro dia ou para a Inbox tira ela do dia original', async () => {
    const extra = await cria('Extra', '2026-11-03', 700, 730, { allowOverlap: true });
    await store.transaction((tx) => tx.activities.update(extra.id, { status: 'PENDING' }));
    expect((await getStreak(store, U, { today: HOJE })).current).toBe(0);
    await sendToInbox(store, U, extra.id, now);
    expect((await getStreak(store, U, { today: HOJE })).current).toBe(2);
  });
  test('ocorrência pulada não conta, e marcar um dia passado recalcula', async () => {
    const ter = (await tabela('activities')).find((a) => a.name === 'Ter');
    await setStatus(store, U, ter.id, { status: 'NOT_DONE' });
    expect((await getStreak(store, U, { today: HOJE })).current).toBe(0);
    await setStatus(store, U, ter.id, { status: 'DONE' });
    expect((await getStreak(store, U, { today: HOJE })).current).toBe(2);
  });
  test('dias sem acesso com repetições ficam pendentes e quebram a sequência', async () => {
    await createRoutine(store, U, { name: 'Ler', startMinutes: 1300, endMinutes: 1320, frequency: 'DAILY', startDate: HOJE }, now);
    expect((await getStreak(store, U, { today: '2026-11-07' })).current).toBe(0);
  });
  test('hoje cumprido soma um, usando o today do navegador', async () => {
    await marca(HOJE);
    expect((await getStreak(store, U, { today: HOJE })).current).toBe(3);
  });
});

describe('progresso e histórico', () => {
  test('weekStart precisa ser segunda-feira', async () => {
    expect((await erro(getProgress(store, U, { weekStart: '2026-11-03', today: HOJE, minutes: 860 }))).code).toBe('VALIDATION_ERROR');
  });
  test('progresso traz ofensiva, dias e categorias', async () => {
    const p = await getProgress(store, U, { weekStart: '2026-11-02', today: HOJE, minutes: 860 });
    expect(p.streak).toEqual({ current: 0, best: 0 });
    expect(p.byDay[2]).toMatchObject({ date: HOJE, total: 6, done: 0, percent: 0 });
  });
  test('histórico do mais novo ao mais antigo, 50 por página, e exclusão', async () => {
    for (let i = 0; i < 55; i += 1) await updateActivity(store, U, ids.dormir, { startMinutes: i % 2 === 0 ? 1320 : 1350, endMinutes: i % 2 === 0 ? 1350 : 1380 }, now);
    const p1 = await listHistory(store, U, {});
    expect(p1.items).toHaveLength(50);
    expect(p1.items[0].createdAt >= p1.items[49].createdAt).toBe(true);
    const p2 = await listHistory(store, U, { before: p1.next });
    expect(p2.items).toHaveLength(5);
    expect((await erro(deleteHistory(store, 'u2', p1.items[0].id))).code).toBe('NOT_FOUND');
    await deleteHistory(store, U, p1.items[0].id);
    expect((await listHistory(store, U, {})).items).toHaveLength(50);
  });
});
