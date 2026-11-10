import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useNow, notifyChanged } from '../lib/useNow.js';
import { longDate, mondayOf, weekdayName } from '../lib/dates.js';
import { formatDuration, formatMinutes } from '../lib/time.js';
import NowCard from '../components/NowCard.jsx';
import DayList from '../components/DayList.jsx';
import StreakCard from '../components/StreakCard.jsx';
import DayStrip from '../components/DayStrip.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DIALOGS } from '../components/dialogs.js';

export default function Today() {
  const now = useNow();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [day, setDay] = useState([]);
  const [streak, setStreak] = useState(null);
  const [goals, setGoals] = useState([]);
  const [week, setWeek] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [acts, st, prog, box] = await Promise.all([
        api('/activities', { query: { from: now.date, to: now.date, nowDate: now.date } }),
        api('/streak', { query: { today: now.date } }),
        api('/progress', { query: { weekStart: mondayOf(now.date), today: now.date, minutes: now.minutes } }),
        api('/inbox'),
      ]);
      setDay(acts);
      setStreak(st);
      setGoals(prog.byCategory.filter((c) => c.goalMinutes));
      setWeek(prog.byDay);
      setInbox(box);
      setLoaded(true);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [now.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('plannio:changed', load);
    return () => window.removeEventListener('plannio:changed', load);
  }, [load]);

  const act = async (fn) => {
    try { await fn(); notifyChanged(); } catch (e) { setError(e.message); }
  };
  // Marca na tela na hora; se o servidor recusar, a lista volta ao que estava salvo.
  const toggle = async (a) => {
    const status = a.status === 'DONE' ? 'PENDING' : 'DONE';
    setDay((list) => list.map((x) => (x.id === a.id ? { ...x, status } : x)));
    try {
      await api(`/activities/${a.id}/status`, { method: 'POST', body: { status } });
      notifyChanged();
    } catch (e) {
      await load();
      setError(e.message);
    }
  };
  const toggleStep = (a, s) => act(() => api(`/activities/${a.id}/steps/${s.id}`, { method: 'PATCH', body: { done: !s.done } }));
  const done = (a) => act(() => api(`/activities/${a.id}/status`, { method: 'POST', body: { status: 'DONE' } }));

  const Dialog = dialog && DIALOGS[dialog.type];

  return (
    <section>
      <div className="head">
        <div><small>{weekdayName(now.date)} · {formatMinutes(now.minutes)}</small><h1>{longDate(now.date)}</h1></div>
        <Link className="btn" to="/planejar" state={{ date: now.date }}>+ Nova atividade</Link>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!loaded && !error && <p className="loading" role="status">Carregando sua rotina…</p>}
      {loaded && (
        <>
          <NowCard activities={day} minutes={now.minutes} onToggleStep={toggleStep} onDone={done} onReorganize={(a) => setDialog({ type: 'reorganize', activity: a })} />
          <DayStrip activities={day} minutes={now.minutes} start={user?.planningStart ?? 360} end={user?.planningEnd ?? 1380} />
          <div className="today-grid">
            <div className="grid">
              <section className="card" aria-label="Sua rotina de hoje">
                <div className="card-head"><h2>Sua rotina de hoje</h2><span className="soft small-text">Marque o que você fez</span></div>
                <DayList activities={day} minutes={now.minutes} onToggle={toggle} onOpen={(a) => setDialog({ type: 'activity', activity: a })} />
              </section>
            </div>
            <div className="grid side-col">
              <StreakCard streak={streak} week={week} today={now.date} />
              {goals.length > 0 && (
                <section className="card" aria-label="Esta semana">
                  <h2>Esta semana</h2>
                  {goals.map((g) => (
                    <div className="goal" key={g.id}>
                      <div className="goal-head"><b>{g.label}</b><span className="soft">{formatDuration(g.actualMinutes)} de {formatDuration(g.goalMinutes)}</span></div>
                      <div className="bar"><i style={{ width: `${Math.min(100, Math.round((g.actualMinutes / g.goalMinutes) * 100))}%` }} /></div>
                    </div>
                  ))}
                </section>
              )}
              <section className="card" aria-label="Inbox">
                <h2>Inbox</h2>
                {inbox.length === 0 && <p className="soft">Nada guardado sem horário.</p>}
                {inbox.slice(0, 3).map((i) => (
                  <div className="item" key={i.id}>
                    <span>{i.name}<small>{formatDuration(i.estimatedMinutes || 30)}</small></span>
                    <button type="button" className="ghost small" onClick={() => navigate('/inbox', { state: { fit: i.id } })}>Encaixar</button>
                  </div>
                ))}
              </section>
              <section className="card close-day">
                <span><b>Terminou por hoje?</b><br /><span className="soft">Marque o que faltou.</span></span>
                <button type="button" className="ghost small" onClick={() => setDialog({ type: 'closeDay' })}>Fechar o dia</button>
              </section>
            </div>
          </div>
        </>
      )}
      {Dialog && <Dialog {...dialog} date={now.date} now={now} onClose={() => setDialog(null)} onChanged={notifyChanged} />}
    </section>
  );
}
