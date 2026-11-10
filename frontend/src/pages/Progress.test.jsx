import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';

const HOJE = '2026-11-04';
let user;
const abre = () => render(<MemoryRouter initialEntries={['/progresso']}><App /></MemoryRouter>);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 4, 14, 20));
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});

describe('tela Progresso', () => {
  test('mostra ofensiva atual e maior, cumprido por dia e tempo por categoria (CA14)', async () => {
    await api('/auth/demo', { method: 'POST', body: { now: { date: HOJE, minutes: 860 } } });
    abre();
    const topo = await screen.findByRole('region', { name: 'Resumo' });
    expect(topo).toHaveTextContent('Ofensiva atual12 dias');
    expect(topo).toHaveTextContent('Maior ofensiva12 dias');
    const dias = screen.getByRole('region', { name: 'Cumprido por dia' });
    const linhas = within(dias).getAllByRole('listitem');
    expect(linhas.map((l) => l.textContent)).toEqual(['Seg100%', 'Ter100%', 'Qua50%', 'Qui–', 'Sex–', 'Sáb–', 'Dom–']);
    const cat = screen.getByRole('region', { name: 'Tempo por categoria' });
    expect(within(cat).getByText('Estudos').closest('.goal')).toHaveTextContent(/planejado · .* realizado · meta 6h$/);
  });

  test('navega entre semanas sempre a partir da segunda-feira', async () => {
    await api('/auth/demo', { method: 'POST', body: { now: { date: HOJE, minutes: 860 } } });
    abre();
    expect(await screen.findByRole('heading', { name: '2 a 8 de novembro' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByRole('heading', { name: '26 de outubro a 1 de novembro' })).toBeInTheDocument();
  });

  test('histórico fica recolhido, mostra plano anterior e novo, e excluir pede confirmação (CA15)', async () => {
    await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
    const a = await api('/activities', { method: 'POST', body: { name: 'Estudar', date: '2026-11-05', startMinutes: 840, endMinutes: 930, now: { date: HOJE, minutes: 0 } } });
    await api(`/activities/${a.id}`, { method: 'PATCH', body: { startMinutes: 900, endMinutes: 990, now: { date: HOJE, minutes: 0 } } });
    abre();
    const resumo = await screen.findByText('Ver histórico de alterações');
    expect(screen.queryByText(/14:00.*15:00/)).not.toBeVisible();
    await user.click(resumo);
    const item = await screen.findByRole('listitem', { name: 'Estudar' });
    expect(within(item).getByText(/14:00–15:30 → 15:00–16:30/)).toBeVisible();
    await user.click(within(item).getByRole('button', { name: 'Excluir registro' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Excluir registro' })).getByRole('button', { name: 'Excluir' }));
    await vi.waitFor(async () => expect((await api('/history')).items).toEqual([]));
  });

  test('semana vazia mostra texto neutro', async () => {
    await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
    abre();
    expect(await screen.findByText('Nada planejado nesta semana ainda.')).toBeInTheDocument();
  });
});
