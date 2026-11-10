import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { PRIORITIES, STATUSES } from '@plannio/shared/core/activities';
import { COLORS } from '@plannio/shared/core/categories';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const bloco = (tipo, nome) => schema.split(`${tipo} ${nome} {`)[1].split('}')[0];
const valores = (nome) => bloco('enum', nome).trim().split(/\s+/);
const tipoDe = (modelo, nome) => bloco('model', modelo).split(/\r?\n/).find((l) => l.trim().startsWith(`${nome} `)).trim().split(/\s+/)[1];

// O schema e o núcleo precisam aceitar os mesmos valores; roda sem banco de dados.
describe('schema do banco e regras do núcleo', () => {
  test('prioridade é a mesma lista nas atividades e nas repetições', () => {
    expect(valores('Priority')).toEqual(PRIORITIES);
    expect(tipoDe('Activity', 'priority')).toBe('Priority?');
    expect(tipoDe('Routine', 'priority')).toBe('Priority?');
  });

  test('status e cores são os mesmos', () => {
    expect(valores('Status')).toEqual(STATUSES);
    expect(valores('Color')).toEqual(COLORS);
  });
});
