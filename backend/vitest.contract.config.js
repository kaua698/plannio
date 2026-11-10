import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Testes de contrato: os mesmos testes do núcleo (shared/test/core), rodando sobre o store do Prisma.
// Precisa do PostgreSQL de infra/docker-compose.yml (npm run db:up).
export default defineConfig({
  root: here('..'),
  resolve: {
    alias: [{ find: /^\.\.\/\.\.\/src\/core\/memoryStore\.js$/, replacement: here('./test/contract/prismaTestStore.js') }],
  },
  test: {
    include: ['shared/test/core/**/*.test.js'],
    globalSetup: [here('./test/contract/globalSetup.js')],
    fileParallelism: false,
    pool: 'threads',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
