import { formatDuration, formatMinutes, formatRange } from '../lib/time.js';

const byStart = (x, y) => x.startMinutes - y.startMinutes || (x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0);

export function currentActivity(activities, minutes) {
  const now = activities.filter((a) => a.startMinutes <= minutes && minutes < a.endMinutes).sort(byStart);
  return now[0] || null;
}

export function nextActivity(activities, minutes) {
  return activities.filter((a) => a.startMinutes > minutes && ['PENDING', 'POSTPONED'].includes(a.status)).sort(byStart)[0] || null;
}

export default function NowCard({ activities, minutes, onToggleStep, onDone, onReorganize }) {
  const current = currentActivity(activities, minutes);
  if (!current) {
    const next = nextActivity(activities, minutes);
    return (
      <section className="now-hero empty" aria-label="Agora">
        <span className="lab">Agora</span>
        <p className="now-empty">{next ? `Próxima: ${next.name} às ${formatMinutes(next.startMinutes)}` : 'Nada planejado para agora.'}</p>
      </section>
    );
  }
  const left = current.endMinutes - minutes;
  const done = current.status === 'DONE';
  const canReorganize = !current.isFixed && ['PENDING', 'POSTPONED'].includes(current.status);
  return (
    <section className="now-hero" aria-label="Agora">
      <div className="now-body">
        <span className="lab">Agora, das {formatRange(current.startMinutes, current.endMinutes)}</span>
        <h2 className="now-title">{current.name}</h2>
      </div>
      <div className="now-clock" role="timer" aria-label={`Restam ${formatDuration(left)}`}>
        <b>{formatMinutes(left)}</b>
        <span>restam</span>
      </div>
      {current.steps.length > 0 && (
        <ul className="steps">
          {current.steps.map((s) => (
            <li key={s.id}>
              <label className="step">
                <input type="checkbox" checked={s.done} onChange={() => onToggleStep(current, s)} />
                <span>{s.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="now-actions">
        {!done && <button type="button" className="btn" onClick={() => onDone(current)}>Concluir</button>}
        {canReorganize && <button type="button" className="ghost" onClick={() => onReorganize(current)}>Preciso reorganizar</button>}
      </div>
    </section>
  );
}
