import { addDays, weekdayLong } from './dates.js';
import { formatRange } from './time.js';

// "Hoje", "Amanhã" ou o dia por extenso, para opções de horário.
export function dayLabel(date, today) {
  if (date === today) return 'Hoje';
  if (date === addDays(today, 1)) return 'Amanhã';
  return weekdayLong(date);
}

export const optionLabel = (o, today) => `${dayLabel(o.date, today)}, ${formatRange(o.start, o.end)}`;
