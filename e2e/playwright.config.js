import { defineConfig, devices } from '@playwright/test';

const PORT = 3101;
const NAVEGADORES = { chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' };
const LARGURAS = [[1280, 800], [360, 740]];

// Sobe o servidor de verdade com as telas prontas. Com E2E_DATABASE_URL, roda no PostgreSQL; sem ela, em memória.
export default defineConfig({
  testDir: '.',
  workers: 2,
  timeout: 45000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: Object.entries(NAVEGADORES).flatMap(([nome, device]) => LARGURAS.map(([width, height]) => ({
    name: `${nome}-${width}`,
    use: { ...devices[device], viewport: { width, height } },
  }))),
  webServer: {
    command: 'npm run build -w frontend && node backend/src/index.js',
    cwd: '..',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      E2E: '1',
      PORT: String(PORT),
      VITE_API_MODE: 'http',
      JWT_SECRET: 'chave-usada-somente-nos-testes-de-ponta-a-ponta',
      DATABASE_URL: process.env.E2E_DATABASE_URL || '',
      APP_URL: `http://localhost:${PORT}`,
    },
  },
});
