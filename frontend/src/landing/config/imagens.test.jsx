import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import PaginaInicial from '../PaginaInicial.jsx';
import { Marca } from '../parts.jsx';

vi.mock('./personalizar.js', async (original) => {
  const real = await original();
  return {
    ...real,
    IMAGENS: {
      ...real.IMAGENS,
      logo: { caminho: '/imagens/logo.png', descricao: 'Plannio' },
      fundoHero: { caminho: '/imagens/fundo.jpg' },
    },
  };
});

test('com caminho preenchido, o logo vira imagem', () => {
  const { container } = render(<Marca />);
  const img = container.querySelector('img');
  expect(img).toHaveAttribute('src', '/imagens/logo.png');
  expect(img).toHaveAttribute('alt', 'Plannio');
  expect(container.querySelector('svg')).toBeNull();
});

test('com caminho preenchido, a imagem de fundo aparece no topo da página', () => {
  const { container } = render(<MemoryRouter><PaginaInicial pronto /></MemoryRouter>);
  expect(container.querySelector('.lp-hero-img')).toHaveAttribute('src', '/imagens/fundo.jpg');
});
