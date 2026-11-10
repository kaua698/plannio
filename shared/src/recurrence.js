import { addDays, diffDays, maxDate, minDate, mondayOf, weekday } from './dates.js';

// Diz se a regra de repetição acontece em uma data, sem olhar início e fim.
function matches(rule, date) {
  const wd = weekday(date);
  switch (rule.frequency) {
    case 'DAILY':
      return true;
    case 'WEEKDAYS':
      return wd >= 1 && wd <= 5;
    case 'SPECIFIC_DAYS':
      return (rule.weekdays || []).includes(wd);
    case 'CUSTOM': {
      const n = rule.intervalValue || 1;
      if (rule.intervalUnit === 'WEEK') {
        const days = rule.weekdays && rule.weekdays.length ? rule.weekdays : [weekday(rule.startDate)];
        const weeks = diffDays(mondayOf(rule.startDate), mondayOf(date)) / 7;
        return weeks % n === 0 && days.includes(wd);
      }
      return diffDays(rule.startDate, date) % n === 0;
    }
    default:
      return false;
  }
}

// Lista as datas em que a regra acontece entre from e to, inclusive.
export function occurrencesBetween(rule, from, to) {
  let start = maxDate(from, rule.startDate);
  let end = to;
  if (rule.endDate) end = minDate(end, rule.endDate);
  if (rule.cancelledFrom) end = minDate(end, addDays(rule.cancelledFrom, -1));
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (matches(rule, d)) out.push(d);
  }
  return out;
}
