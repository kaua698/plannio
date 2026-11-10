import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';
import { ruleText } from '../lib/rules.js';

const HOJE = '2026-11-04';
const now = { date: HOJE, minutes: 600 };
const antes = { date: '2026-11-01', minutes: 0 };
let user;
const abre = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const cria = (name, date, s, e, when = antes) => api('/activities', { method: 'POST', body: { name, date, startMinutes: s, endMinutes: e, now: when } });

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
});

describe('ruleText', () => {
  test('escreve a regra em português', () => {
    expect(ruleText({ frequency: 'SPECIFIC_DAYS', weekdays: [5, 1, 3] })).toBe('Segunda, quarta e sexta');
    expect(ruleText({ frequency: 'WEEKDAYS', weekdays: [] })).toBe('Dias úteis');
    expect(ruleText({ frequency: 'CUSTOM', intervalValue: 3, intervalUnit: 'DAY', weekdays: [] })).toBe('A cada 3 dias');
  });
});

describe('tela Semana', () => {
  test('mostra segunda a domingo, destaca hoje e o cumprido de cada dia', async () => {
    await cria('Ontem cedo', '2026-11-02', 600, 630, now);
    await cria('Feito', HOJE, 420, 450);
    await cria('Por fazer', HOJE, 900, 930);
    const feito = (await api('/activities', { query: { from: HOJE, to: HOJE, nowDate: HOJE } }))[0];
    await api(`/activities/${feito.id}/status`, { method: 'POST', body: { status: 'DONE' } });
    abre('/semana');
    const grade = await screen.findByRole('region', { name: 'Semana' });
    const cabecalhos = within(grade).getAllByRole('columnheader').slice(1);
    expect(cabecalhos.map((c) => c.textContent.slice(0, 3))).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']);
    expect(await within(cabecalhos[0]).findByText('100%')).toBeInTheDocument();
    expect(within(cabecalhos[2]).getByText('1 de 2')).toBeInTheDocument();
    expect(cabecalhos[2]).toHaveAttribute('aria-current', 'date');
  });

  test('a grade vai de 06h a 23h e se estende para uma atividade às 05:30', async () => {
    abre('/semana');
    const grade = await screen.findByRole('region', { name: 'Semana' });
    expect(within(grade).getByText('06h')).toBeInTheDocument();
    expect(within(grade).getByText('23h')).toBeInTheDocument();
    expect(within(grade).queryByText('05h')).not.toBeInTheDocument();
    await cria('Acordar cedo', '2026-11-05', 330, 360);
    window.dispatchEvent(new Event('plannio:changed'));
    expect(await within(grade).findByText('05h')).toBeInTheDocument();
  });

  test('blocos de 30 minutos mostram o nome, e a navegação troca a semana', async () => {
    await cria('Organizar', HOJE, 990, 1020);
    abre('/semana');
    expect(await screen.findByRole('button', { name: /Organizar/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByRole('heading', { name: '9 a 15 de novembro' })).toBeInTheDocument();
  });
});

describe('tela Repetições', () => {
  const rotina = () => api('/routines', { method: 'POST', body: { name: 'Academia', startMinutes: 1020, endMinutes: 1110, frequency: 'SPECIFIC_DAYS', weekdays: [1, 3, 5], startDate: HOJE, now } });

  test('lista a regra e o horário em português', async () => {
    await rotina();
    abre('/repeticoes');
    const card = await screen.findByRole('article', { name: 'Academia' });
    expect(within(card).getByText('↻ Segunda, quarta e sexta')).toBeInTheDocument();
    expect(within(card).getByText('17:00 às 18:30')).toBeInTheDocument();
  });

  test('editar muda o horário a partir da data escolhida', async () => {
    await rotina();
    abre('/repeticoes');
    await user.click(within(await screen.findByRole('article', { name: 'Academia' })).getByRole('button', { name: 'Editar' }));
    const dlg = screen.getByRole('dialog', { name: 'Editar repetição' });
    fireEvent.change(within(dlg).getByLabelText('Início'), { target: { value: '18:00' } });
    fireEvent.change(within(dlg).getByLabelText('Término'), { target: { value: '19:30' } });
    await user.click(within(dlg).getByRole('button', { name: 'Salvar' }));
    await vi.waitFor(async () => expect((await api('/routines')).some((r) => r.startMinutes === 1080)).toBe(true));
  });

  test('parar de repetir pede a data e tira a repetição da lista', async () => {
    await rotina();
    abre('/repeticoes');
    await user.click(within(await screen.findByRole('article', { name: 'Academia' })).getByRole('button', { name: 'Parar de repetir' }));
    const dlg = screen.getByRole('dialog', { name: 'Parar de repetir' });
    expect(within(dlg).getByLabelText('A partir de')).toHaveValue(HOJE);
    await user.click(within(dlg).getByRole('button', { name: 'Parar de repetir' }));
    await vi.waitFor(() => expect(screen.queryByRole('article', { name: 'Academia' })).not.toBeInTheDocument());
  });
});
