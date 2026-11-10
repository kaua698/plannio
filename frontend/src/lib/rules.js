const NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const listPt = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`);
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Escreve a regra de repetição em português, como na tela Repetições.
export function ruleText(r) {
  switch (r.frequency) {
    case 'DAILY': return 'Todos os dias';
    case 'WEEKDAYS': return 'Dias úteis';
    case 'SPECIFIC_DAYS': {
      const days = [...r.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => NAMES[d]);
      return capital(listPt(days));
    }
    case 'CUSTOM': {
      const n = r.intervalValue || 1;
      if (r.intervalUnit === 'WEEK') {
        const days = (r.weekdays || []).map((d) => NAMES[d]);
        const base = n === 1 ? 'Toda semana' : `A cada ${n} semanas`;
        return days.length ? `${base}: ${listPt(days)}` : base;
      }
      return n === 1 ? 'Todos os dias' : `A cada ${n} dias`;
    }
    default: return '';
  }
}

export function shortRuleText(r) {
  if (r.frequency === 'SPECIFIC_DAYS') return listPt([...r.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_SHORT[d].toLowerCase())).replace(/^./, (c) => c.toUpperCase());
  return ruleText(r);
}
