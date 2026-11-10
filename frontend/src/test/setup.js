import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetDemo } from '../services/demo/router.js';

// O jsdom não implementa showModal; o suficiente para os testes é abrir e fechar.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
}

export const mockColorScheme = (dark) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: dark && query.includes('dark'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
};

// Já na importação: o GSAP consulta matchMedia ao carregar.
mockColorScheme(false);

beforeEach(() => {
  localStorage.clear();
  resetDemo();
  mockColorScheme(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
