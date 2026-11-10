import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import Today from './Today.jsx';

const estado = vi.hoisted(() => ({ salvar: null }));

vi.mock('../services/api.js', async (original) => ({
  ...(await original()),
  api: (path, opts = {}) => {
    if (path === '/me') return Promise.resolve({ id: 'u', name: 'Ana', email: 'a@x.com', planningStart: 360, planningEnd: 1380, theme: null });
    if (path === '/activities') return Promise.resolve([{ id: 'a', name: 'Ler', startMinutes: 400, endMinutes: 430, status: 'PENDING', steps: [], createdAt: '1' }]);
    if (path === '/streak') return Promise.resolve({ current: 0, best: 0, today: { total: 1, done: 0 } });
    if (path === '/progress') return Promise.resolve({ byCategory: [], byDay: [] });
    if (path === '/inbox') return Promise.resolve([]);
    if (opts.method === 'POST') return estado.salvar();
    return Promise.resolve(null);
  },
}));

const caixa = () => screen.findByRole('checkbox', { name: 'Marcar Ler como feita' });
const abre = () => render(<MemoryRouter><AuthProvider><Today /></AuthProvider></MemoryRouter>);

beforeEach(() => { estado.salvar = null; });

test('a caixa marca na hora, sem esperar o servidor responder', async () => {
  estado.salvar = () => new Promise(() => {});
  abre();
  await userEvent.click(await caixa());
  expect(await caixa()).toBeChecked();
});

test('se o servidor recusar, a caixa volta e o erro aparece', async () => {
  estado.salvar = () => Promise.reject(new Error('Não foi possível salvar.'));
  abre();
  await userEvent.click(await caixa());
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar.');
  await waitFor(async () => expect(await caixa()).not.toBeChecked());
});
