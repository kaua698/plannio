import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useNow, notifyChanged } from '../lib/useNow.js';
import { addDays, mondayOf, rangeLabel } from '../lib/dates.js';
import WeekGrid from '../components/WeekGrid.jsx';
import { DIALOGS } from '../components/dialogs.js';

export default function Week() {
  const now = useNow();
  const [weekStart, setWeekStart] = useState(mondayOf(now.date));
  const [acts, setActs] = useState([]);
  const [byDay, setByDay] = useState([]);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const end = addDays(weekStart, 6);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api('/activities', { query: { from: weekStart, to: end, nowDate: now.date } }),
        api('/progress', { query: { weekStart, today: now.date, minutes: now.minutes } }),
      ]);
      setActs(a);
      setByDay(p.byDay);
      setError('');
    } catch (e) { setError(e.message); }
  }, [weekStart, now.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('plannio:changed', load);
    return () => window.removeEventListener('plannio:changed', load);
  }, [load]);

  const Dialog = dialog && DIALOGS[dialog.type];
  return (
    <section>
      <div className="head">
        <div><small>Semana</small><h1>{rangeLabel(weekStart, end)}</h1></div>
        <div className="row-gap">
          <button type="button" className="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>Anterior</button>
          <button type="button" className="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>Próxima</button>
          <Link className="btn" to="/planejar">Planejar um dia</Link>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="card week-card" aria-label="Semana">
        <WeekGrid weekStart={weekStart} activities={acts} byDay={byDay} today={now.date}
          onOpen={(a) => DIALOGS.activity && setDialog({ type: 'activity', activity: a })} />
      </section>
      {Dialog && <Dialog {...dialog} date={now.date} now={now} onClose={() => setDialog(null)} onChanged={notifyChanged} />}
    </section>
  );
}
