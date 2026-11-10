import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createPrismaStore } from '../../src/prismaStore.js';
import { TEST_DATABASE_URL } from './url.js';

// Substitui createMemoryStore nos testes do núcleo: mesmo nome, mas os dados vão para o plannio_test.
// Cada chamada zera o banco e recria os usuários fixos que os testes usam ('u1' e 'u2').
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
const TABLES = '"ChangeRecord", "ActivityStep", "Activity", "Routine", "Category", "User"';

async function reset() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES} CASCADE`);
  await prisma.user.createMany({ data: ['u1', 'u2'].map((id) => ({ id, name: id, email: `${id}@teste.local`, passwordHash: 'x' })) });
}

// Em fila: dois beforeEach seguidos não podem zerar o banco ao mesmo tempo.
let fila = Promise.resolve();

export function createMemoryStore() {
  fila = fila.catch(() => {}).then(reset);
  const ready = fila;
  const store = createPrismaStore(prisma);
  return {
    kind: 'prisma',
    async transaction(fn) { await ready; return store.transaction(fn); },
    async snapshot() { await ready; return store.snapshot(); },
  };
}
