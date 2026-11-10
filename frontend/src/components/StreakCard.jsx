import { weekdayName, weekdayShort } from '../lib/dates.js';

const dayTitle = (d, full) => `${weekdayName(d.date)}: ${full ? 'dia cumprido' : d.total ? `${d.done} de ${d.total}` : 'nada planejado'}`;

export default function StreakCard({ streak, week = [], today }) {
  if (!streak) return null;
  const { current, best, today: now } = streak;
  const fulfilled = now.total > 0 && now.done === now.total;
  const pct = now.total ? Math.round((now.done / now.total) * 100) : 0;
  let message = `Conclua tudo o que está no dia para chegar a ${current + 1}.`;
  if (fulfilled) message = 'Dia cumprido.';
  else if (!now.total) message = 'Nada planejado hoje. A ofensiva fica como está.';
  return (
    <section className="card streak" aria-label="Ofensiva">
      <div className="card-head"><h2>Ofensiva</h2><span className="soft small-text">Maior: {best}</span></div>
      <div className="num"><span>{current}</span><em>{current === 1 ? 'dia' : 'dias'}</em></div>
      {week.length > 0 && (
        <div className="wds">
          {week.map((d) => {
            const full = d.total > 0 && d.done === d.total;
            return <span key={d.date} className={`wd${full ? ' full' : ''}${d.date === today ? ' today' : ''}`} title={dayTitle(d, full)}>{weekdayShort(d.date)[0]}</span>;
          })}
        </div>
      )}
      {current === 0 && best > 0 && <p className="soft streak-reset">Sua ofensiva recomeçou.</p>}
      <div className="goal">
        <div className="goal-head"><b>Hoje</b><span className="soft">{`${now.done} de ${now.total}`}</span></div>
        <div className="bar" role="progressbar" aria-label="Cumprido hoje" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      </div>
      <p className="soft small-text">{message}</p>
    </section>
  );
}
