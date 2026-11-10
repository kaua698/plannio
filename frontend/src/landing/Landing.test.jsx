import './Landing.jsx'; // já carregada: o teste não depende do tempo de importar as animações
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';

const abre = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const conta = () => api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });

describe('fluxo landing, login, cadastro e aplicativo', () => {
  test('a landing tem título, caminhos para entrar e criar conta, e o conteúdo visível', async () => {
    abre('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Entrar' })[0]).toHaveAttribute('href', '/login');
    expect(screen.getAllByRole('link', { name: /Criar (minha )?conta/ })[0]).toHaveAttribute('href', '/cadastro');
  });

  test('visitante em / vê a landing page, não o login', async () => {
    abre('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  test('da landing vai para o cadastro, e o cadastro leva ao aplicativo', async () => {
    const user = userEvent.setup();
    abre('/');
    await user.click((await screen.findAllByRole('link', { name: /Criar (minha )?conta/ }))[0]);
    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@x.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha-forte-8');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('region', { name: 'Agora' })).toBeInTheDocument();
  });

  test('quem já está logado vai direto para Hoje', async () => {
    await conta();
    abre('/');
    expect(await screen.findByRole('region', { name: 'Agora' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Hoje' })).toHaveAttribute('href', '/hoje');
  });

  test('área do aplicativo sem sessão pede login', async () => {
    abre('/hoje');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  test('login e cadastro têm caminho de volta para a landing', async () => {
    abre('/login');
    await waitFor(() => expect(screen.getByRole('link', { name: 'Plannio, página inicial' })).toHaveAttribute('href', '/'));
  });
});
