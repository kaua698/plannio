import { Prisma } from '@prisma/client';
import { describe, expect, test, vi } from 'vitest';
import { createPrismaStore } from '../src/prismaStore.js';

const conflito = () => new Prisma.PrismaClientKnownRequestError('conflito', { code: 'P2034', clientVersion: 'teste' });

function falsoPrisma(falhas) {
  let n = 0;
  return {
    tentativas: () => n,
    $transaction: async (fn) => {
      n += 1;
      if (n <= falhas) throw conflito();
      return fn(new Proxy({}, { get: () => ({}) }));
    },
  };
}

describe('conflitos entre transações simultâneas', () => {
  test('tenta de novo até dar certo, sem mostrar erro a quem só abriu a tela', async () => {
    const prisma = falsoPrisma(5);
    await expect(createPrismaStore(prisma, { pause: () => Promise.resolve() }).transaction(async () => 'ok')).resolves.toBe('ok');
    expect(prisma.tentativas()).toBe(6);
  });

  test('espera um pouco entre as tentativas, cada vez mais', async () => {
    const pause = vi.fn(() => Promise.resolve());
    await createPrismaStore(falsoPrisma(3), { pause }).transaction(async () => 'ok');
    const limites = pause.mock.calls.map(([, teto]) => teto);
    expect(limites).toHaveLength(3);
    expect(limites[2]).toBeGreaterThan(limites[0]);
  });

  test('se o conflito não passar, responde AGENDA_CHANGED', async () => {
    const prisma = falsoPrisma(100);
    await expect(createPrismaStore(prisma, { pause: () => Promise.resolve() }).transaction(async () => 'ok')).rejects.toMatchObject({ code: 'AGENDA_CHANGED', status: 409 });
    expect(prisma.tentativas()).toBeLessThan(100);
  });

  test('reconhece o conflito no formato do adaptador do PostgreSQL', async () => {
    const erro = Object.assign(new Error('TransactionWriteConflict'), { name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } });
    let n = 0;
    const prisma = { $transaction: async (fn) => { n += 1; if (n === 1) throw erro; return fn(new Proxy({}, { get: () => ({}) })); } };
    await expect(createPrismaStore(prisma, { pause: () => Promise.resolve() }).transaction(async () => 'ok')).resolves.toBe('ok');
    expect(n).toBe(2);
  });

  test('outros erros não são repetidos', async () => {
    let n = 0;
    const prisma = { $transaction: async () => { n += 1; throw new Error('quebrou'); } };
    await expect(createPrismaStore(prisma).transaction(async () => 'ok')).rejects.toThrow('quebrou');
    expect(n).toBe(1);
  });
});
