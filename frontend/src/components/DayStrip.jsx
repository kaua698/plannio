import { currentActivity } from './NowCard.jsx';

const pad = (h) => String(h).padStart(2, '0');

// Faixa com o dia inteiro em escala: o que já foi feito, o que está acontecendo e o que vem depois.
export default function DayStrip({ activities, minutes, start, end }) {
  if (!activities.length) return null;
  const firstHour = Math.floor(Math.min(start, ...activities.map((a) => a.startMinutes)) / 60);
  const lastHour = Math.ceil(Math.max(end, ...activities.map((a) => a.endMinutes)) / 60);
  const from = firstHour * 60;
  const span = lastHour * 60 - from;
  const at = (m) => ((m - from) / span) * 100;

  const current = currentActivity(activities, minutes);
  const done = activities.filter((a) => a.status === 'DONE').length;
  const ticks = [];
  for (let h = firstHour; h <= lastHour - 3; h += 4) ticks.push(h);
  ticks.push(lastHour);

  return (
    <div className="strip-box">
      <div className="strip" role="img" aria-label={`Seu dia: ${done} de ${activities.length} feitas.`}>
        {activities.map((a) => {
          const kind = a.status === 'DONE' ? ' done' : a.id === current?.id ? ' now' : '';
          return <i key={a.id} className={`strip-seg${kind}`} title={a.name} style={{ left: `${at(a.startMinutes)}%`, width: `${at(a.endMinutes) - at(a.startMinutes)}%` }} />;
        })}
        {minutes >= from && minutes <= lastHour * 60 && <u className="strip-now" style={{ left: `${at(minutes)}%` }} />}
      </div>
      <div className="strip-ticks" aria-hidden="true">
        {ticks.map((h) => <span key={h} style={{ left: `${at(h * 60)}%` }}>{pad(h)}</span>)}
      </div>
    </div>
  );
}
