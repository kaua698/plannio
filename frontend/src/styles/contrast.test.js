import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const app = readFileSync('src/styles/app.css', 'utf8');
const [claro, escuro] = tokens.split(":root[data-theme='dark']");

const valor = (bloco, nome) => bloco.match(new RegExp(`${nome}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
const luz = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('letras dos dias cumpridos na Ofensiva', () => {
  test.each([['claro', claro], ['escuro', escuro]])('tema %s tem pelo menos 4,5:1', (_, bloco) => {
    expect(contraste(valor(bloco, '--on-seg-done'), valor(bloco, '--seg-done'))).toBeGreaterThanOrEqual(4.5);
  });

  test('o estilo usa esse token', () => {
    expect(app).toMatch(/\.wd\.full \{[^}]*color: var\(--on-seg-done\)/);
  });
});
