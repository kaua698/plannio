import { readFileSync } from 'node:fs';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mockColorScheme } from '../test/setup.js';
import { AuthProvider } from './AuthContext.jsx';
import { ThemeProvider } from './ThemeContext.jsx';

const estado = vi.hoisted(() => ({ me: null }));
vi.mock('../services/api.js', async (original) => ({ ...(await original()), api: (path) => (path === '/auth/session' ? estado.me().then((user) => ({ user })) : estado.me()) }));

const usuario = (theme) => ({ id: 'u', name: 'Ana', email: 'a@x.com', planningStart: 360, planningEnd: 1380, theme });
const abre = () => render(<AuthProvider><ThemeProvider><p>oi</p></ThemeProvider></AuthProvider>);
const scriptInicial = () => new Function(readFileSync('public/theme-init.js', 'utf8'))();

beforeEach(() => { delete document.documentElement.dataset.theme; });

describe('tema salvo', () => {
  test('o tema da conta fica guardado para a próxima abertura', async () => {
    estado.me = () => Promise.resolve(usuario('DARK'));
    abre();
    await waitFor(() => expect(localStorage.getItem('plannio-theme')).toBe('DARK'));
  });

  test('abrir com tema guardado usa esse tema antes de o React carregar', () => {
    mockColorScheme(false);
    localStorage.setItem('plannio-theme', 'DARK');
    scriptInicial();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('sem tema guardado, segue o sistema', () => {
    mockColorScheme(true);
    scriptInicial();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('enquanto a sessão carrega, não troca o tema nem apaga o guardado', () => {
    estado.me = () => new Promise(() => {});
    localStorage.setItem('plannio-theme', 'DARK');
    document.documentElement.dataset.theme = 'dark';
    abre();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('plannio-theme')).toBe('DARK');
  });

  test('voltar para o tema do sistema limpa o guardado', async () => {
    localStorage.setItem('plannio-theme', 'DARK');
    estado.me = () => Promise.resolve(usuario(null));
    abre();
    await waitFor(() => expect(localStorage.getItem('plannio-theme')).toBeNull());
  });
});
