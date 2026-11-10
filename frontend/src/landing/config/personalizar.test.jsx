import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import PaginaInicial from '../PaginaInicial.jsx';
import { Marca } from '../parts.jsx';
import { ANIMACOES, IMAGENS, LINKS, TEXTOS } from './personalizar.js';

const tokens = readFileSync('src/landing/config/personalizar.css', 'utf8');
const estrutura = readFileSync('src/landing/landing.css', 'utf8');
const js = readFileSync('src/landing/config/personalizar.js', 'utf8');
const SEM_COMENTARIOS = estrutura.replace(/\/\*[\s\S]*?\*\//g, '');
const usadas = [...new Set(SEM_COMENTARIOS.match(/--lp-[a-z0-9-]+/g))];
const declaradas = new Set([...tokens.matchAll(/^\s*(--lp-[a-z0-9-]+):/gm)].map((m) => m[1]));

describe('área de personalização em CSS', () => {
  test.each(['CORES', 'TIPOGRAFIA', 'TAMANHOS', 'ESPAÇAMENTOS', 'POSICIONAMENTO', 'IMAGENS', 'ANIMAÇÕES', 'RESPONSIVIDADE'])('tem a seção %s', (secao) => {
    expect(tokens).toMatch(new RegExp(`=+ *\\n?.*\\d+\\. ${secao}`));
  });

  test('toda configuração diz o que alterar na própria linha', () => {
    const linhas = tokens.split(/\r?\n/).filter((l) => /^\s*--lp-[a-z0-9-]+:/.test(l));
    expect(linhas.length).toBeGreaterThan(80);
    expect(linhas.filter((l) => !l.includes('ALTERE AQUI'))).toEqual([]);
  });

  test('a estrutura só usa variáveis que existem na área de personalização', () => {
    expect(usadas.filter((v) => !declaradas.has(v))).toEqual([]);
  });

  test('a estrutura não repete cores, fontes nem pontos de quebra', () => {
    expect(SEM_COMENTARIOS).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(SEM_COMENTARIOS).not.toMatch(/\brgba?\(/i);
    expect(SEM_COMENTARIOS).not.toMatch(/@media/);
    expect(SEM_COMENTARIOS).not.toMatch(/font-family:\s*(?!var\(|\s)/);
  });

  test('os pontos de quebra ficam só na área de personalização', () => {
    expect(tokens).toMatch(/@media \(max-width: \d+px\)/);
  });
});

describe('área de personalização em JavaScript', () => {
  test('separa textos, links, imagens e animações', () => {
    expect(TEXTOS.hero.titulo).toBe('Saiba o que fazer agora.');
    expect(LINKS.cadastro).toBe('/cadastro');
    expect(IMAGENS.logo).toHaveProperty('caminho');
    expect(ANIMACOES.titulo.duracao).toBeGreaterThan(0);
    expect(ANIMACOES.appInclinado.inclinacao).toBeGreaterThan(0);
  });

  test('tem indicações precisas de onde alterar', () => {
    expect((js.match(/ALTERE AQUI/g) || []).length).toBeGreaterThan(50);
  });
});

describe('imagens opcionais', () => {
  test('sem caminho, usa o símbolo desenhado', () => {
    const { container } = render(<Marca />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  test('o texto da página vem da configuração', () => {
    render(<MemoryRouter><PaginaInicial pronto /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TEXTOS.hero.titulo);
    expect(screen.getAllByRole('link', { name: TEXTOS.botoes.criarMenu })[0]).toHaveAttribute('href', LINKS.cadastro);
  });
});
