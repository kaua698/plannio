import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import App from '../App.jsx';

const abre = (rota) => render(<MemoryRouter initialEntries={[rota]}><App /></MemoryRouter>);

describe('telas de entrar e criar conta', () => {
  test.each([['/login', 'Entrar'], ['/cadastro', 'Criar conta']])('%s tem as abas de acesso e marca a atual', async (rota, atual) => {
    abre(rota);
    await screen.findByRole('heading', { level: 1, name: atual });
    const abas = screen.getByRole('navigation', { name: 'Acesso' });
    expect(within(abas).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(within(abas).getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro');
    expect(within(abas).getByRole('link', { name: atual })).toHaveAttribute('aria-current', 'page');
  });

  test('o desenho do dia não tem mais as barras', async () => {
    const { container } = abre('/login');
    await screen.findByRole('heading', { level: 1, name: 'Entrar' });
    expect(container.querySelector('.auth-dial')).not.toBeNull();
    expect(container.querySelector('.auth-strip, .auth-rows')).toBeNull();
  });

  test('não oferece recuperação de senha', async () => {
    abre('/login');
    await screen.findByRole('heading', { level: 1, name: 'Entrar' });
    expect(screen.queryByRole('link', { name: /esqueci/i })).toBeNull();
  });
});
