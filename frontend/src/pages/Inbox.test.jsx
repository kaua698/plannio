import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';

const HOJE = '2026-11-04';
let user;
const abre = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const antes = { date: '2026-11-01', minutes: 0 };
const cria = (name, date, s, e, extra = {}) => api('/activities', { method: 'POST', body: { name, date, startMinutes: s, endMinutes: e, now: antes, ...extra } });

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 4, 14, 20));
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
});

describe('tela Inbox', () => {
  test('encaixar mostra horários livres e, ao confirmar, tira o item da lista (CA13)', async () => {
    for (const [n, s, e, x] of [['Hora de estudar', 840, 930], ['Inglês', 930, 990], ['Organizar', 990, 1020], ['Academia', 1020, 1110, { isFixed: true }], ['Jantar', 1170, 1200], ['Dormir', 1350, 1380]]) {
      await cria(n, HOJE, s, e, x);
    }
    await api('/activities', { method: 'POST', body: { name: 'Comprar caderno', now: antes } });
    abre('/inbox');
    const item = await screen.findByRole('listitem', { name: 'Comprar caderno' });
    expect(within(item).getByText('30 min')).toBeInTheDocument();
    await user.click(within(item).getByRole('button', { name: 'Encaixar na rotina' }));
    const painel = await screen.findByRole('region', { name: 'Horários livres' });
    const opcoes = await within(painel).findAllByRole('radio');
    expect(opcoes[0]).toHaveAccessibleName('Hoje, 18:30 às 19:00');
    expect(opcoes[0]).toBeChecked();
    await user.click(within(painel).getByRole('button', { name: 'Colocar na rotina' }));
    await vi.waitFor(() => expect(screen.queryByRole('listitem', { name: 'Comprar caderno' })).not.toBeInTheDocument());
    expect(await api('/inbox')).toEqual([]);
  });

  test('guardar uma atividade nova com duração estimada', async () => {
    abre('/inbox');
    await user.click(await screen.findByRole('button', { name: '+ Guardar atividade' }));
    const dlg = screen.getByRole('dialog', { name: 'Guardar na Inbox' });
    await user.type(within(dlg).getByLabelText('Nome'), 'Ligar para o dentista');
    fireEvent.change(within(dlg).getByLabelText('Duração estimada (min)'), { target: { value: '15' } });
    await user.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('listitem', { name: 'Ligar para o dentista' })).toBeInTheDocument();
  });
});

describe('tela Configurações', () => {
  test('cria categoria com uma das 7 cores e meta opcional', async () => {
    abre('/configuracoes');
    await user.click(await screen.findByRole('button', { name: '+ Nova categoria' }));
    const dlg = screen.getByRole('dialog', { name: 'Nova categoria' });
    await user.type(within(dlg).getByLabelText('Nome'), 'Trabalho');
    expect(within(dlg).getAllByRole('radio')).toHaveLength(7);
    await user.click(within(dlg).getByRole('radio', { name: 'Ameixa' }));
    fireEvent.change(within(dlg).getByLabelText('Meta por semana (horas)'), { target: { value: '6' } });
    await user.click(within(dlg).getByRole('button', { name: 'Salvar' }));
    await vi.waitFor(async () => expect((await api('/categories')).find((c) => c.name === 'Trabalho')).toMatchObject({ color: 'AMEIXA', weeklyGoalMinutes: 360 }));
  });

  test('exclui categoria com confirmação', async () => {
    abre('/configuracoes');
    const lista = await screen.findByRole('list', { name: 'Categorias' });
    await user.click(within(lista).getByRole('button', { name: 'Excluir Saúde' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Excluir categoria' })).getByRole('button', { name: 'Excluir' }));
    await vi.waitFor(async () => expect((await api('/categories')).map((c) => c.name)).not.toContain('Saúde'));
  });

  test('muda o horário do dia e o tema', async () => {
    abre('/configuracoes');
    fireEvent.change(await screen.findByLabelText('Começo do dia'), { target: { value: '05:00' } });
    await user.click(screen.getByRole('button', { name: 'Salvar horário' }));
    await vi.waitFor(async () => expect((await api('/me')).planningStart).toBe(300));
    await user.click(screen.getByRole('radio', { name: 'Escuro' }));
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  test('excluir conta: senha errada mostra erro, a certa leva ao login (CA16)', async () => {
    abre('/configuracoes');
    await user.click(await screen.findByRole('button', { name: 'Excluir conta' }));
    const dlg = screen.getByRole('dialog', { name: 'Excluir conta' });
    await user.type(within(dlg).getByLabelText('Senha'), 'errada00');
    await user.click(within(dlg).getByRole('button', { name: 'Excluir minha conta' }));
    expect(await within(dlg).findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
    await user.clear(within(dlg).getByLabelText('Senha'));
    await user.type(within(dlg).getByLabelText('Senha'), 'Senha-forte-8');
    await user.click(within(dlg).getByRole('button', { name: 'Excluir minha conta' }));
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
