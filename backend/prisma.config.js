import { defineConfig } from 'prisma/config';

// A conexão vem do ambiente; os scripts db:* carregam o .env da raiz.
// Migrações usam a conexão direta quando ela existe (a integração da Neon na Vercel cria DATABASE_URL_UNPOOLED).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '' },
});
