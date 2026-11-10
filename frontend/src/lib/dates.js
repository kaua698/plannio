export { addDays, diffDays, mondayOf, weekday } from '@plannio/shared/dates';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const parts = (date) => date.split('-').map(Number);
const dow = (date) => { const [y, m, d] = parts(date); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

export const weekdayName = (date) => WEEKDAYS[dow(date)];
export const weekdayShort = (date) => SHORT[dow(date)];
export const dayOfMonth = (date) => parts(date)[2];
export const longDate = (date) => { const [, m, d] = parts(date); return `${d} de ${MONTHS[m - 1]}`; };
export const weekdayLong = (date) => `${weekdayName(date).replace('-feira', '')}, ${longDate(date)}`;
export const rangeLabel = (from, to) => {
  const [, m1, d1] = parts(from);
  const [, m2, d2] = parts(to);
  return m1 === m2 ? `${d1} a ${d2} de ${MONTHS[m2 - 1]}` : `${d1} de ${MONTHS[m1 - 1]} a ${d2} de ${MONTHS[m2 - 1]}`;
};
