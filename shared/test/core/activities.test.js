import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../src/core/memoryStore.js';
import { AppError } from '../../src/core/errors.js';
import { createCategory, insertDefaultCategories, deleteCategory, listCategories, updateCategory } from '../../src/core/categories.js';
import {
  copyDay, createActivity, deleteActivity, getActivity, listActivities, listInbox, setStatus, setStep, updateActivity,
} from '../../src/core/activities.js';

const now = { date: '2026-11-04', minutes: 860 };
const U = 'u1';
const OUTRO = 'u2';
let store;

const erro = async (p) => { try { await p; } catch (e) { return e; } throw new Error('esperava erro'); };
const nova = (extra = {}) => createActivity(store, U, { name: 'Estudar', date: '2026-11-04', startMinutes: 840, endMinutes: 930, ...extra }, now);

beforeEach(() => { store = createMemoryStore(); });

describe('memoryStore', () => {
  test('transaction desfaz tudo se a função lançar erro', async () => {
    await store.transaction(async (tx) => tx.categories.insert({ userId: U, name: 'A', color: 'OCRE' }));
    await erro(store.transaction(async (tx) => {
      await tx.categories.insert({ userId: U, name: 'B', color: 'OCRE' });
      throw new Error('falhou');
    }));
    const todas = await store.transaction((tx) => tx.categories.findMany({ userId: U }));
    expect(todas.map((c) => c.name)).toEqual(['A']);
  });
});

describe('categorias', () => {
  test('cria as 4 categorias iniciais', async () => {
    await store.transaction((tx) => insertDefaultCategories(tx, U));
    expect((await listCategories(store, U)).map((c) => [c.name, c.color])).toEqual([
      ['Pessoal', 'BARRO'], ['Faculdade', 'AZUL'], ['Estudos', 'OCRE'], ['Saúde', 'EUCALIPTO'],
    ]);
  });
  test('CRUD com meta semanal', async () => {
    const c = await createCategory(store, U, { name: 'Trabalho', color: 'AMEIXA', weeklyGoalMinutes: 360 });
    expect(c).toMatchObject({ name: 'Trabalho', color: 'AMEIXA', weeklyGoalMinutes: 360 });
    expect(await updateCategory(store, U, c.id, { weeklyGoalMinutes: null })).toMatchObject({ weeklyGoalMinutes: null });
  });
  test('nome duplicado responde NAME_TAKEN', async () => {
    await createCategory(store, U, { name: 'Trabalho', color: 'AMEIXA' });
    expect((await erro(createCategory(store, U, { name: 'Trabalho', color: 'OCRE' }))).code).toBe('NAME_TAKEN');
  });
  test('cor fora da biblioteca e meta inválida respondem VALIDATION_ERROR', async () => {
    expect((await erro(createCategory(store, U, { name: 'X', color: '#123456' }))).code).toBe('VALIDATION_ERROR');
    expect((await erro(createCategory(store, U, { name: 'Y', color: 'OCRE', weeklyGoalMinutes: 0 }))).code).toBe('VALIDATION_ERROR');
  });
  test('outro usuário recebe NOT_FOUND', async () => {
    const c = await createCategory(store, U, { name: 'Trabalho', color: 'AMEIXA' });
    expect((await erro(updateCategory(store, OUTRO, c.id, { name: 'X' }))).code).toBe('NOT_FOUND');
    expect((await erro(deleteCategory(store, OUTRO, c.id))).code).toBe('NOT_FOUND');
  });
  test('excluir categoria mantém as atividades, sem categoria', async () => {
    const c = await createCategory(store, U, { name: 'Trabalho', color: 'AMEIXA' });
    const a = await nova({ categoryId: c.id });
    await deleteCategory(store, U, c.id);
    expect((await getActivity(store, U, a.id)).categoryId).toBeNull();
  });
});

describe('atividades', () => {
  test('sem nome e término antes do início mostram os textos fixos (CA03)', async () => {
    const e = await erro(nova({ name: '  ', startMinutes: 900, endMinutes: 840 }));
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.fields).toEqual({ name: 'Informe o nome da atividade.', endMinutes: 'O término precisa ser depois do início.' });
  });
  test('data sem horário é recusada', async () => {
    expect((await erro(nova({ startMinutes: null, endMinutes: null }))).code).toBe('VALIDATION_ERROR');
  });
  test('sem data vai para a Inbox, com 30 min estimados e flexível', async () => {
    const a = await createActivity(store, U, { name: 'Comprar caderno', isFixed: true }, now);
    expect(a).toMatchObject({ date: null, estimatedMinutes: 30, isFixed: false });
    expect((await listInbox(store, U)).map((x) => x.id)).toEqual([a.id]);
    expect(await listActivities(store, U, { from: '2026-11-01', to: '2026-11-30', nowDate: now.date })).toEqual([]);
  });
  test('dia passado nasce DONE; hoje e futuro nascem PENDING', async () => {
    expect((await nova({ date: '2026-11-03' })).status).toBe('DONE');
    expect((await nova({ date: '2026-11-04', startMinutes: 1000, endMinutes: 1030 })).status).toBe('PENDING');
  });
  test('sobreposição responde OVERLAP e allowOverlap salva', async () => {
    await nova();
    const e = await erro(nova({ name: 'Outra', startMinutes: 900, endMinutes: 960 }));
    expect(e.code).toBe('OVERLAP');
    expect(e.overlaps.map((o) => o.name)).toEqual(['Estudar']);
    expect((await nova({ name: 'Outra', startMinutes: 900, endMinutes: 960, allowOverlap: true })).name).toBe('Outra');
  });
  test('aceita horário fora do horário do dia', async () => {
    expect((await nova({ name: 'Acordar', startMinutes: 330, endMinutes: 360 })).startMinutes).toBe(330);
  });
  test('intervalo maior que 62 dias e datas além de 2 anos são recusados', async () => {
    expect((await erro(listActivities(store, U, { from: '2026-11-01', to: '2027-01-15', nowDate: now.date }))).code).toBe('VALIDATION_ERROR');
    expect((await erro(nova({ date: '2028-11-05' }))).code).toBe('VALIDATION_ERROR');
    expect((await nova({ date: '2028-11-04' })).date).toBe('2028-11-04');
  });
  test('etapas: cria e marca sem mudar o status da atividade', async () => {
    const a = await nova({ steps: ['Revisar a aula', 'Fazer exercícios'] });
    expect(a.steps.map((s) => [s.text, s.done])).toEqual([['Revisar a aula', false], ['Fazer exercícios', false]]);
    const depois = await setStep(store, U, a.id, a.steps[0].id, { done: true });
    expect(depois.steps[0].done).toBe(true);
    expect(depois.status).toBe('PENDING');
  });
  test('status com horário real e validação do horário real', async () => {
    const a = await nova();
    expect(await setStatus(store, U, a.id, { status: 'PARTIAL', actualStart: 840, actualEnd: 900 })).toMatchObject({ status: 'PARTIAL', actualStart: 840, actualEnd: 900 });
    expect((await erro(setStatus(store, U, a.id, { status: 'DONE', actualStart: 900, actualEnd: 900 }))).code).toBe('VALIDATION_ERROR');
  });
  test('mudar data ou horário registra MANUAL_EDIT; mudar só o nome não registra', async () => {
    const a = await nova();
    await updateActivity(store, U, a.id, { name: 'Estudar mais' }, now);
    expect(await store.transaction((tx) => tx.changes.findMany({ userId: U }))).toHaveLength(0);
    await updateActivity(store, U, a.id, { startMinutes: 900, endMinutes: 990 }, now);
    const ch = await store.transaction((tx) => tx.changes.findMany({ userId: U }));
    expect(ch).toHaveLength(1);
    expect(ch[0]).toMatchObject({ reason: 'MANUAL_EDIT', fromStart: 840, toStart: 900, activityName: 'Estudar mais' });
  });
  test('excluir remove os registros do histórico', async () => {
    const a = await nova();
    await updateActivity(store, U, a.id, { startMinutes: 900, endMinutes: 990 }, now);
    await deleteActivity(store, U, a.id, {});
    expect(await store.transaction((tx) => tx.changes.findMany({ userId: U }))).toHaveLength(0);
  });
  test('outro usuário recebe NOT_FOUND (CA02)', async () => {
    const a = await nova();
    for (const chamada of [
      () => getActivity(store, OUTRO, a.id), () => updateActivity(store, OUTRO, a.id, { name: 'x' }, now),
      () => deleteActivity(store, OUTRO, a.id, {}), () => setStatus(store, OUTRO, a.id, { status: 'DONE' }),
    ]) expect((await erro(chamada())).code).toBe('NOT_FOUND');
  });
});

describe('copiar dia', () => {
  test('copia como avulsas e pendentes, pulando o que se sobrepõe', async () => {
    await nova({ date: '2026-11-03', name: 'Acordar', startMinutes: 390, endMinutes: 420 });
    await nova({ date: '2026-11-03', name: 'Estudar', startMinutes: 840, endMinutes: 930 });
    await nova({ date: '2026-11-05', name: 'Médico', startMinutes: 840, endMinutes: 900 });
    const r = await copyDay(store, U, '2026-11-05', { fromDate: '2026-11-03' }, now);
    expect(r).toEqual({ copied: 1, skipped: 1 });
    const dia = await listActivities(store, U, { from: '2026-11-05', to: '2026-11-05', nowDate: now.date });
    expect(dia.map((a) => [a.name, a.status, a.routineId ?? null])).toEqual([['Acordar', 'PENDING', null], ['Médico', 'PENDING', null]]);
  });
  test('destino no passado é recusado', async () => {
    expect((await erro(copyDay(store, U, '2026-11-03', { fromDate: '2026-11-02' }, now))).code).toBe('VALIDATION_ERROR');
  });
});
