import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createMemoryStore } from '@plannio/shared/core/index';
import { createPrismaStore } from './prismaStore.js';

// Escolhe onde os dados ficam. Sem DATABASE_URL, em memória: tudo some ao reiniciar.
export async function createStore(config) {
  if (!config.databaseUrl) {
    console.warn('DATABASE_URL não definida: usando banco em memória. Os dados somem ao reiniciar.');
    return createMemoryStore();
  }
  // Na Vercel, cada função abre as próprias conexões: poucas, e fechadas logo quando ficam paradas.
  const pool = process.env.VERCEL ? { max: 3, idleTimeoutMillis: 5000 } : {};
  return createPrismaStore(new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl, ...pool }) }));
}
