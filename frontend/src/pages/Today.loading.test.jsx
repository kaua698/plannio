import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import Today from './Today.jsx';

// A sessão responde na hora, e os dados da tela nunca chegam: é o momento do carregamento.
vi.mock('../services/api.js', async (original) => ({
  ...(await original()),
  api: (path) => (path === '/me'
    ? Promise.resolve({ id: 'u', name: 'Ana', email: 'a@x.com', planningStart: 360, planningEnd: 1380, theme: null })
    : new Promise(() => {})),
}));

test('enquanto carrega, a tela Hoje não afirma que o dia está vazio', async () => {
  render(<MemoryRouter><AuthProvider><Today /></AuthProvider></MemoryRouter>);
  expect(await screen.findByRole('status')).toHaveTextContent('Carregando sua rotina');
  expect(screen.queryByText('Nada planejado para agora.')).not.toBeInTheDocument();
  expect(screen.queryByText('Nada planejado para este dia.')).not.toBeInTheDocument();
});
