import { describe, expect, test } from 'vitest';
import { nextActivity } from './NowCard.jsx';

const a = (name, startMinutes, status = 'PENDING') => ({ name, startMinutes, endMinutes: startMinutes + 30, status, createdAt: name });

describe('nextActivity', () => {
  test('ignora o que já foi concluído ou marcado como não feito', () => {
    const lista = [a('Feita', 1000, 'DONE'), a('Não feita', 1010, 'NOT_DONE'), a('Parcial', 1020, 'PARTIAL'), a('Pendente', 1030)];
    expect(nextActivity(lista, 900).name).toBe('Pendente');
  });

  test('considera a adiada que ainda vai acontecer', () => {
    expect(nextActivity([a('Adiada', 1000, 'POSTPONED'), a('Pendente', 1100)], 900).name).toBe('Adiada');
  });

  test('sem nada por fazer, não há próxima', () => {
    expect(nextActivity([a('Feita', 1000, 'DONE')], 900)).toBeNull();
  });
});
