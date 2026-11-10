import { defineConfig } from 'vitest/config';

// threads: o pool padrão (forks) às vezes derruba o processo filho no Windows com Node 24.
export default defineConfig({ test: { pool: 'threads' } });
