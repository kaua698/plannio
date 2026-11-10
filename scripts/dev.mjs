// Sobe o servidor e as telas juntos: npm run dev. O banco precisa estar no ar (npm run db:up).
import { spawn } from 'node:child_process';

const comandos = ['npm run dev -w backend', 'npm run dev -w frontend'];
const processos = comandos.map((c) => spawn(c, { stdio: 'inherit', shell: true }));

const encerrar = () => processos.forEach((p) => p.kill());
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
processos.forEach((p) => p.on('exit', (codigo) => { if (codigo) { encerrar(); process.exitCode = codigo; } }));
