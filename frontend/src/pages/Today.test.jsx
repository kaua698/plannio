import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';
import { currentActivity, nextActivity } from '../components/NowCard.jsx';

const HOJE = '2026-11-04';
const relogio = (h, m) => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 4, h, m));
};
const abre = () => render(<MemoryRouter initialEntries={['/hoje']}><App /></MemoryRouter>);
const exemplo = () => api('/auth/demo', { method: 'POST', body: { now: { date: HOJE, minutes: 860 } } });
const a = (id, s, e, extra = {}) => ({ id, startMinutes: s, endMinutes: e, status: 'PENDING', createdAt: id, ...extra });

describe('regras do cartão Agora', () => {
  test('atividade em andamento e empate pelo início e pela criação', () => {
    const lista = [a('b', 840, 930), a('a', 840, 900), a('c', 830, 900)];
    expect(currentActivity(lista, 860).id).toBe('c');
    expect(currentActivity([a('2', 840, 930), a('1', 840, 930)], 860).id).toBe('1');
    expect(currentActivity(lista, 950)).toBeNull();
  });
  test('próxima atividade depois de agora', () => {
    expect(nextActivity([a('x', 930, 990), a('y', 1020, 1110)], 860).id).toBe('x');
    expect(nextActivity([a('x', 600, 660)], 860)).toBeNull();
  });
});

describe('tela Hoje', () => {
  test('mostra a atividade de agora, o tempo restante e as etapas (CA04)', async () => {
    relogio(14, 20);
    await exemplo();
    abre();
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByRole('heading', { name: 'Hora de estudar' })).toBeInTheDocument();
    expect(within(agora).getByText('01:10')).toBeInTheDocument();
    expect(within(agora).getByRole('timer', { name: 'Restam 1h10' })).toBeInTheDocument();
    expect(within(agora).getByText('Revisar a aula de hoje')).toBeInTheDocument();
    expect(within(agora).getByRole('button', { name: 'Preciso reorganizar' })).toBeInTheDocument();
  });

  test('ofensiva e barra do dia, e marcar a caixa atualiza tudo (CA11)', async () => {
    relogio(14, 20);
    await exemplo();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    abre();
    const ofensiva = await screen.findByRole('region', { name: 'Ofensiva' });
    expect(await within(ofensiva).findByText('12')).toBeInTheDocument();
    expect(within(ofensiva).getByText('5 de 10')).toBeInTheDocument();
    expect(within(ofensiva).getByText('Conclua tudo o que está no dia para chegar a 13.')).toBeInTheDocument();
    const rotina = screen.getByRole('region', { name: 'Sua rotina de hoje' });
    await user.click(within(rotina).getByRole('checkbox', { name: 'Marcar Inglês como feita' }));
    expect(await within(ofensiva).findByText('6 de 10')).toBeInTheDocument();
    expect(within(rotina).getByRole('checkbox', { name: 'Marcar Inglês como feita' })).toBeChecked();
    await user.click(within(rotina).getByRole('checkbox', { name: 'Marcar Inglês como feita' }));
    expect(await within(ofensiva).findByText('5 de 10')).toBeInTheDocument();
  });

  test('sem atividade agora mostra a próxima, e sem nada mostra o texto fixo', async () => {
    relogio(16, 40);
    await exemplo();
    abre();
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByText('Próxima: Academia às 17:00')).toBeInTheDocument();
  });

  test('dia vazio mostra “Nada planejado para agora.” e a ofensiva recomeçou', async () => {
    relogio(10, 0);
    await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
    await api('/activities', { method: 'POST', body: { name: 'Ontem', date: '2026-11-03', startMinutes: 600, endMinutes: 630, now: { date: '2026-11-01', minutes: 0 } } });
    await api('/activities', { method: 'POST', body: { name: 'Anteontem', date: '2026-11-02', startMinutes: 600, endMinutes: 630, now: { date: HOJE, minutes: 0 } } });
    abre();
    expect(await screen.findByText('Nada planejado para agora.')).toBeInTheDocument();
    expect(screen.getByText('Sua ofensiva recomeçou.')).toBeInTheDocument();
  });

  test('o tempo restante muda a cada minuto e a tela passa para o novo dia à meia-noite', async () => {
    relogio(14, 20);
    await exemplo();
    abre();
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByText('01:10')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(await within(agora).findByText('01:09')).toBeInTheDocument();
    await act(async () => { vi.setSystemTime(new Date(2026, 10, 4, 23, 59, 30)); vi.advanceTimersByTime(60_000); });
    expect(await screen.findByRole('heading', { level: 1, name: '5 de novembro' })).toBeInTheDocument();
  });
});
