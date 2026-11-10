// Datas como texto YYYY-MM-DD, calculadas em UTC para não depender do fuso da máquina.
const DAY = 86400000;

const toMs = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);

export const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromMs(toMs(value)) === value;

export const addDays = (date, n) => fromMs(toMs(date) + n * DAY);

export const diffDays = (from, to) => Math.round((toMs(to) - toMs(from)) / DAY);

export const weekday = (date) => new Date(toMs(date)).getUTCDay();

export const mondayOf = (date) => addDays(date, -((weekday(date) + 6) % 7));

export const minDate = (a, b) => (a <= b ? a : b);

export const maxDate = (a, b) => (a >= b ? a : b);
