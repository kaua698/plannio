import { isDate } from '../dates.js';
import { invalid } from './errors.js';

// Tamanhos máximos dos textos; o formulário usa os mesmos valores.
export const LIMITS = { name: 120, description: 2000, stepText: 200, steps: 30, category: 40, userName: 80, email: 254, passwordBytes: 72 };
export const tooLong = (n) => `Use até ${n} caracteres.`;

// Confere a lista de etapas e anota o problema em fields.
export function checkSteps(steps, fields) {
  if (steps == null) return;
  if (!Array.isArray(steps)) { fields.steps = 'Informe as etapas em uma lista.'; return; }
  const texts = steps.map((s) => (typeof s === 'string' ? s : s?.text)).filter((t) => typeof t === 'string' && t.trim());
  if (texts.length > LIMITS.steps) fields.steps = `Use até ${LIMITS.steps} etapas.`;
  else if (texts.some((t) => t.trim().length > LIMITS.stepText)) fields.steps = `Cada etapa pode ter até ${LIMITS.stepText} caracteres.`;
}

export const isMinute = (v) => Number.isInteger(v) && v >= 0 && v <= 1440;

// Data máxima aceita: o mesmo dia, dois anos à frente de hoje.
export const maxDateFrom = (today) => `${Number(today.slice(0, 4)) + 2}${today.slice(4)}`;

export function requireDate(value, field) {
  if (!isDate(value)) throw invalid({ [field]: 'Informe uma data válida.' });
  return value;
}

export function requireNow(now) {
  if (!now || !isDate(now.date) || !isMinute(now.minutes)) throw invalid({ now: 'Informe a data e o horário atuais.' });
  return now;
}

export function checkWithinTwoYears(date, today, field = 'date') {
  if (date > maxDateFrom(today)) throw invalid({ [field]: 'Escolha uma data em até dois anos.' });
}
