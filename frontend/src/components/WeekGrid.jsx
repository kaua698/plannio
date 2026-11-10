import { addDays, dayOfMonth, weekdayShort } from '../lib/dates.js';
import { categoryStyle } from '../lib/categories.js';
import { formatRange } from '../lib/time.js';

const HOUR_PX = 34;

// Grade semanal plana: das 06h às 23h, estendida se houver atividade fora desse intervalo.
export default function WeekGrid({ weekStart, activities, byDay, today, onOpen }) {
  const timed = activities.filter((a) => a.startMinutes != null);
  const first = Math.min(6, ...timed.map((a) => Math.floor(a.startMinutes / 60)));
  const last = Math.max(23, ...timed.map((a) => Math.ceil(a.endMinutes / 60)));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const height = (last - first) * HOUR_PX + 8;
  const y = (m) => (m / 60 - first) * HOUR_PX + 4;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const summary = (date) => {
    const d = byDay?.find((x) => x.date === date);
    if (!d) return '';
    if (date === today) return d.total ? `${d.done} de ${d.total}` : '';
    if (date < today && d.percent != null) return `${d.percent}%`;
    return '';
  };

  return (
    <div className="wk" role="grid" aria-readonly="true">
      <div role="row" className="wk-row">
        <div className="wh" role="columnheader" aria-label="Horário" />
        {days.map((d) => (
          <div key={d} role="columnheader" className={`wh${d === today ? ' on' : ''}`} aria-current={d === today ? 'date' : undefined}>
            {weekdayShort(d)}<b>{dayOfMonth(d)}</b><span>{summary(d) || ' '}</span>
          </div>
        ))}
      </div>
      <div role="row" className="wk-row">
        <div className="wt" role="gridcell" style={{ height }}>
          {hours.map((h) => <span key={h} style={{ top: y(h * 60) - 7 }}>{String(h).padStart(2, '0')}h</span>)}
        </div>
        {days.map((d) => (
          <div key={d} role="gridcell" className={`wcol${d === today ? ' on' : ''}`} style={{ height }}>
            {timed.filter((a) => a.date === d).map((a) => {
              const mini = a.endMinutes - a.startMinutes < 60;
              return (
                <button key={a.id} type="button" className={`wb${mini ? ' mini' : ''}${a.status === 'DONE' ? ' feito' : ''}`}
                  style={{ ...categoryStyle(a.category?.color), top: y(a.startMinutes), height: Math.max(14, ((a.endMinutes - a.startMinutes) / 60) * HOUR_PX - 2) }}
                  aria-label={`${a.name}, ${formatRange(a.startMinutes, a.endMinutes)}`} onClick={() => onOpen?.(a)}>
                  {a.name}{a.isFixed && !mini && <small>Fixo</small>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
