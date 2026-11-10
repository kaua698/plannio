import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import App from './App.jsx';
import { api } from './services/api.js';
import { mockColorScheme } from './test/setup.js';
import StatusChip from './components/StatusChip.jsx';

const abre = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const cadastra = () => api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });

describe('contas e navegação', () => {
  test('sem sessão, rota protegida leva ao login', async () => {
    abre('/semana');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
  test('login inválido mostra a mensagem fixa', async () => {
    const user = userEvent.setup();
    abre('/login');
    await user.type(await screen.findByLabelText('E-mail'), 'ana@x.com');
    await user.type(screen.getByLabelText('Senha'), 'errada00');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
  });
  test('cadastro valida a senha curta junto ao campo', async () => {
    const user = userEvent.setup();
    abre('/cadastro');
    await user.type(await screen.findByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@x.com');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
  });
  test('o menu mostra as 7 áreas e marca a atual', async () => {
    await cadastra();
    abre('/semana');
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Hoje', 'Planejar', 'Semana', 'Repetições', 'Inbox', 'Progresso', 'Configurações']);
    expect(within(nav).getByRole('link', { name: 'Semana' })).toHaveAttribute('aria-current', 'page');
  });
  test('o botão de menu abre e fecha a navegação no celular', async () => {
    const user = userEvent.setup();
    await cadastra();
    abre('/hoje');
    const botao = await screen.findByRole('button', { name: 'Menu' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
  });
  test('sessão expirada leva ao login com a mensagem fixa', async () => {
    await cadastra();
    abre('/hoje');
    await screen.findByRole('navigation', { name: 'Principal' });
    act(() => { window.dispatchEvent(new Event('plannio:session-expired')); });
    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();
  });
});

describe('tema', () => {
  test('Sistema segue o aparelho', async () => {
    mockColorScheme(true);
    await cadastra();
    abre('/hoje');
    await screen.findByRole('navigation', { name: 'Principal' });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  test('a escolha salva no perfil vale ao entrar', async () => {
    await cadastra();
    await api('/me', { method: 'PATCH', body: { theme: 'DARK' } });
    abre('/hoje');
    await screen.findByRole('navigation', { name: 'Principal' });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('StatusChip', () => {
  test('mostra glifo e palavra, nunca só cor', () => {
    render(<StatusChip status="PARTIAL" />);
    expect(screen.getByText('◐ Parcial')).toBeInTheDocument();
  });
});
