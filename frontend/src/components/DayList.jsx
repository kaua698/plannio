import { categoryStyle } from '../lib/categories.js';
import { formatMinutes } from '../lib/time.js';
import { currentActivity } from './NowCard.jsx';
import StatusChip from './StatusChip.jsx';

// Lista do dia em ordem de horário, com a caixa de marcar o que foi feito.
export default function DayList({ activities, minutes, onToggle, onOpen }) {
  const current = minutes == null ? null : currentActivity(activities, minutes);
  if (!activities.length) return <p className="soft">Nada planejado para este dia.</p>;
  return (
    <ul className="day-list">
      {activities.map((a) => {
        const done = a.status === 'DONE';
        const isNow = current?.id === a.id;
        return (
          <li key={a.id} className={`row${done ? ' feito' : ''}${isNow ? ' agora' : ''}`} style={categoryStyle(a.category?.color)}>
            <input
              type="checkbox"
              className="chk"
              aria-label={`Marcar ${a.name} como feita`}
              checked={done}
              onChange={() => onToggle(a)}
            />
            <span className="t">{formatMinutes(a.startMinutes)}–{formatMinutes(a.endMinutes)}</span>
            <button type="button" className="row-open" onClick={() => onOpen?.(a)}>{a.name}</button>
            <span className="row-end">
              {isNow && <span className="tag">Agora</span>}
              {!['PENDING', 'DONE'].includes(a.status) && <StatusChip status={a.status} />}
              {a.category && <span className="cat-dot">{a.category.name}</span>}
              {a.isFixed && <small>Fixo</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
