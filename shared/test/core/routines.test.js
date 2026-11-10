import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../src/core/memoryStore.js';
import { createActivity, deleteActivity, listActivities, listInbox, updateActivity } from '../../src/core/activities.js';
import { cancelRoutine, createRoutine, ensureOccurrences, listRoutines, sendToInbox, updateRoutine } from '../../src/core/routines.js';

const now = { date: '2026-11-02', minutes: 480 };
const U = 'u1';
let store;
const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };
const semana = (from = '2026-11-02', to = '2026-11-08') => listActivities(store, U, { from, to, nowDate: now.date });
const dias = async (from, to) => (await semana(from, to)).map((a) => [a.date, a.name, a.startMinutes]);
const uteis = (extra = {}) => createRoutine(store, U, {
  name: 'Acordar', startMinutes: 390, endMinutes: 420, frequency: 'WEEKDAYS', startDate: '2026-11-02', steps: ['Beber água'], ...extra,
}, now);

beforeEach(() => { store = createMemoryStore(); });

describe('ensureOccurrences', () => {
  test('cria as linhas até a data, copiando o modelo e as etapas, sem duplicar', async () => {
    const r = await uteis();
    await store.transaction((tx) => ensureOccurrences(tx, U, '2026-11-04'));
    await store.transaction((tx) => ensureOccurrences(tx, U, '2026-11-04'));
    const acts = await store.transaction((tx) => tx.activities.findMany({ userId: U, routineId: r.id }));
    expect(acts.map((a) => a.occurrenceDate).sort()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    const lista = await semana('2026-11-02', '2026-11-02');
    expect(lista[0].steps.map((s) => s.text)).toEqual(['Beber água']);
  });
});

describe('repetições', () => {
  test('dias úteis aparecem de segunda a sexta (CA06)', async () => {
    await uteis();
    expect((await semana()).map((a) => a.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });
  test('não pode começar antes de hoje', async () => {
    expect((await erro(uteis({ startDate: '2026-11-01' }))).code).toBe('VALIDATION_ERROR');
  });
  test('alterar só este dia marca CHANGED e não muda os outros; sem scope é recusado', async () => {
    await uteis();
    const quarta = (await semana()).find((a) => a.date === '2026-11-04');
    expect((await erro(updateActivity(store, U, quarta.id, { startMinutes: 360, endMinutes: 390 }, now))).code).toBe('VALIDATION_ERROR');
    const r = await updateActivity(store, U, quarta.id, { startMinutes: 360, endMinutes: 390, scope: 'this' }, now);
    expect(r.exceptionKind).toBe('CHANGED');
    expect((await dias()).map((d) => d[2])).toEqual([390, 390, 360, 390, 390]);
  });
  test('excluir só este dia marca SKIPPED, some da agenda e não volta', async () => {
    await uteis();
    const terca = (await semana()).find((a) => a.date === '2026-11-03');
    await deleteActivity(store, U, terca.id, { scope: 'this' }, now);
    await store.transaction((tx) => ensureOccurrences(tx, U, '2026-11-30'));
    expect((await semana()).map((a) => a.date)).not.toContain('2026-11-03');
  });
  test('este e os próximos não muda o passado nem perde alteração futura (CA07)', async () => {
    await uteis();
    let lista = await semana('2026-11-02', '2026-11-13');
    const seg9 = lista.find((a) => a.date === '2026-11-09');
    await updateActivity(store, U, seg9.id, { name: 'Acordar cedo', scope: 'this' }, now);
    const sexta = lista.find((a) => a.date === '2026-11-06');
    await updateActivity(store, U, sexta.id, { startMinutes: 420, endMinutes: 450, scope: 'future' }, { date: '2026-11-04', minutes: 600 });
    lista = await semana('2026-11-02', '2026-11-13');
    const at = (d) => lista.find((a) => a.date === d);
    expect(at('2026-11-04').startMinutes).toBe(390);
    expect(at('2026-11-06').startMinutes).toBe(420);
    expect(at('2026-11-10').startMinutes).toBe(420);
    expect(at('2026-11-09').name).toBe('Acordar cedo');
    expect(lista.filter((a) => a.date === '2026-11-06')).toHaveLength(1);
  });
  test('mudar os dias troca as ocorrências futuras', async () => {
    const r = await uteis();
    await updateRoutine(store, U, r.id, { fromDate: '2026-11-05', frequency: 'SPECIFIC_DAYS', weekdays: [2] }, now);
    expect((await semana('2026-11-02', '2026-11-12')).map((a) => a.date))
      .toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10']);
  });
  test('parar de repetir remove pendentes a partir da data e mantém as com status', async () => {
    const r = await uteis();
    const lista = await semana();
    await store.transaction((tx) => tx.activities.update(lista.find((a) => a.date === '2026-11-05').id, { status: 'DONE' }));
    await cancelRoutine(store, U, r.id, { fromDate: '2026-11-04' }, now);
    expect((await semana('2026-11-02', '2026-11-20')).map((a) => a.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-05']);
  });
  test('enviar à Inbox vira DETACHED, aparece na Inbox e não é recriada', async () => {
    await uteis();
    const quinta = (await semana()).find((a) => a.date === '2026-11-05');
    const r = await sendToInbox(store, U, quinta.id, now);
    expect(r).toMatchObject({ date: null, exceptionKind: 'DETACHED', estimatedMinutes: 30 });
    expect((await listInbox(store, U)).map((a) => a.id)).toEqual([quinta.id]);
    expect((await semana()).map((a) => a.date)).not.toContain('2026-11-05');
  });
  test('transformar uma atividade avulsa na primeira ocorrência, sem duplicar o dia', async () => {
    const a = await createActivity(store, U, { name: 'Estudar', date: '2026-11-05', startMinutes: 840, endMinutes: 930 }, now);
    const r = await createRoutine(store, U, { fromActivityId: a.id, frequency: 'DAILY' }, now);
    const lista = await semana('2026-11-05', '2026-11-06');
    expect(lista.map((x) => [x.date, x.routineId === r.id])).toEqual([['2026-11-05', true], ['2026-11-06', true]]);
    expect(lista[0].id).toBe(a.id);
  });
  test('avisa sobreposição nos próximos 14 dias e permite manter; depois disso não bloqueia', async () => {
    await createActivity(store, U, { name: 'Médico', date: '2026-11-10', startMinutes: 400, endMinutes: 430 }, now);
    const e = await erro(uteis());
    expect(e.code).toBe('OVERLAP');
    expect((await uteis({ allowOverlap: true })).name).toBe('Acordar');
    await createActivity(store, U, { name: 'Viagem', date: '2026-12-01', startMinutes: 1000, endMinutes: 1080 }, now);
    expect((await uteis({ name: 'Outra', startMinutes: 1000, endMinutes: 1020, startDate: '2026-11-17', frequency: 'DAILY' })).name).toBe('Outra');
  });
  test('outro usuário recebe NOT_FOUND', async () => {
    const r = await uteis();
    expect((await erro(updateRoutine(store, 'u2', r.id, { fromDate: '2026-11-05', name: 'x' }, now))).code).toBe('NOT_FOUND');
    expect((await erro(cancelRoutine(store, 'u2', r.id, { fromDate: '2026-11-05' }, now))).code).toBe('NOT_FOUND');
  });
  test('lista as repetições com a regra', async () => {
    await uteis();
    expect((await listRoutines(store, U)).map((r) => [r.name, r.frequency])).toEqual([['Acordar', 'WEEKDAYS']]);
  });
});
