import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import './Landing.jsx';
import App from '../App.jsx';
import { TEXTOS } from './config/personalizar.js';

const abre = (rota = '/') => render(<MemoryRouter initialEntries={[rota]}><App /></MemoryRouter>);
const fontes = ['src/landing/parts.jsx', 'src/landing/PaginaInicial.jsx', 'src/landing/Landing.jsx', 'src/landing/landing.css', 'src/landing/config/personalizar.css', 'src/landing/config/personalizar.js', 'src/landing/motion.js'].map((f) => readFileSync(f, 'utf8')).join('\n');

describe('página inicial', () => {
  test('mantém o título e não mostra a identificação antiga', async () => {
    const { container } = abre();
    expect(await screen.findByRole('heading', { level: 1, name: 'Saiba o que fazer agora.' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent('Organizador de rotina');
  });

  test('a bolinha do mouse não existe mais no código', async () => {
    const { container } = abre();
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('.lp-cursor')).toBeNull();
    expect(fontes).not.toMatch(/lp-cursor|data-cursor|function Cursor|ANIMACOES\.cursor/);
  });

  test('o parâmetro antigo de proposta não muda nada', async () => {
    const { container } = abre('/?proposta=b');
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('[data-proposta]')).toBeNull();
    expect(fontes).not.toMatch(/proposta/i);
  });

  test.each(['O dia a dia no Plannio.', 'Cada área do aplicativo.', 'Como o Plannio decide.'])('tem a seção "%s"', async (titulo) => {
    abre();
    expect(await screen.findByRole('heading', { level: 2, name: titulo })).toBeInTheDocument();
  });

  test('a seção de dúvidas fica oculta, mas continua na configuração', async () => {
    abre();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { level: 2, name: 'Dúvidas' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Dúvidas' })).toBeNull();
    expect(TEXTOS.duvidas.mostrar).toBe(false);
    expect(TEXTOS.duvidas.itens.length).toBeGreaterThan(0);
  });

  test('explica, em vez de vender', async () => {
    const { container } = abre();
    await screen.findByRole('heading', { level: 1 });
    for (const texto of ['Criar minha conta', 'Preciso pagar', 'Sua rotina merece', 'O problema', 'A solução', 'Menos decisão na hora', 'Tudo o que uma rotina real pede']) {
      expect(container).not.toHaveTextContent(texto);
    }
  });

  test('o topo leva à explicação, e o menu mantém entrar e criar conta', async () => {
    abre();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('link', { name: 'Ver como funciona' })[0]).toHaveAttribute('href', '#como');
    expect(screen.getAllByRole('link', { name: 'Entrar' })[0]).toHaveAttribute('href', '/login');
    expect(screen.getAllByRole('link', { name: 'Criar conta' })[0]).toHaveAttribute('href', '/cadastro');
  });

  test('explica cada área com a tela real e o texto correspondente', async () => {
    abre();
    const lista = await screen.findByRole('tablist', { name: 'Telas do Plannio' });
    expect(within(lista).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hoje', 'Planejar', 'Semana', 'Repetições', 'Inbox', 'Progresso', 'Configurações']);
    expect(screen.getByRole('tabpanel').querySelector('img')).toHaveAttribute('src', '/imagens/demo-hoje.jpg');
    await userEvent.click(within(lista).getByRole('tab', { name: 'Inbox' }));
    const painel = screen.getByRole('tabpanel');
    expect(painel.querySelector('img')).toHaveAttribute('src', '/imagens/demo-inbox.jpg');
    expect(painel).toHaveTextContent('ainda não tem horário');
    expect(within(lista).getByRole('tab', { name: 'Inbox' })).toHaveAttribute('aria-selected', 'true');
  });

  test('o rodapé leva a privacidade e termos, e essas páginas abrem', async () => {
    abre();
    const rodape = await screen.findByRole('contentinfo');
    expect(within(rodape).getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(within(rodape).getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos');
    await userEvent.click(within(rodape).getByRole('link', { name: 'Privacidade' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacidade' })).toBeInTheDocument();
  });

  test('não promete o que o produto não tem', () => {
    expect(fontes).not.toMatch(/depoimento|avaliaç|milhares de|\d+\s?%\s+(de|dos)/i);
  });
});
