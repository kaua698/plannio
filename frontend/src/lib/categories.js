export const COLORS = ['BARRO', 'OCRE', 'MUSGO', 'EUCALIPTO', 'AZUL', 'VIOLETA', 'AMEIXA'];
export const COLOR_NAMES = {
  BARRO: 'Barro', OCRE: 'Ocre', MUSGO: 'Musgo', EUCALIPTO: 'Eucalipto', AZUL: 'Azul', VIOLETA: 'Violeta', AMEIXA: 'Ameixa',
};

// Estilo de uma categoria pelas variáveis do tema, que já trazem fundo, borda e texto legíveis.
export function categoryStyle(color) {
  const key = color ? color.toLowerCase() : 'none';
  return {
    '--c-bg': `var(--cat-${key}-bg)`,
    '--c-border': `var(--cat-${key}-border)`,
    '--c-text': `var(--cat-${key}-text)`,
  };
}
