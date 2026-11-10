import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNow, notifyChanged } from '../lib/useNow.js';
import { addDays, dayOfMonth, mondayOf, weekdayLong, weekdayShort } from '../lib/dates.js';
import { formatMinutes } from '../lib/time.js';
import { categoryStyle } from '../lib/categories.js';
import { shortRuleText } from '../lib/rules.js';
import ActivityForm from '../components/ActivityForm.jsx';

const OCCUPYING = new Set(['PENDING', 'DONE', 'PARTIAL']);
const MIN_SLOT = 30;

// Intervalos livres de pelo menos 30 minutos dentro do horário do dia.
export function freeSlots(activities, planning, minMinutes = MIN_SLOT) {
  const busy = activities.filter((a) => OCCUPYING.has(a.status)).map((a) => [a.startMinutes, a.endMinutes]).sort((x, y) => x[0] - y[0]);
  const out = [];
  let cursor = planning.start;
  for (const [s, e] of busy) {
    if (s - cursor >= minMinutes) out.push({ start: cursor, end: Math.min(s, planning.end) });
    cursor = Math.max(cursor, e);
    if (cursor >= planning.end) break;
  }
  if (planning.end - cursor >= minMinutes) out.push({ start: cursor, end: planning.end });
  return out.filter((x) => x.end - x.start >= minMinutes);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function Plan() {
  const now = useNow();
  const { user } = useAuth();
  const location = useLocation();
  const [date, setDate] = useState(location.state?.date || addDays(now.date, 1));
  const [acts, setActs] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(() => (location.state?.item
    ? { initial: location.state.item.startMinutes != null ? location.state.item
      : { ...location.state.item, startMinutes: 480, endMinutes: 480 + (location.state.item.estimatedMinutes || 30) } }
    : null));
  const [message, setMessage] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const planning = { start: user?.planningStart ?? 360, end: user?.planningEnd ?? 1380 };
  const week = mondayOf(date);

  const load = useCallback(async () => {
    const [a, r, c] = await Promise.all([
      api('/activities', { query: { from: date, to: date, nowDate: now.date } }), api('/routines'), api('/categories'),
    ]);
    setActs(a);
    setRoutines(r);
    setCategories(c);
  }, [date, now.date]);
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);

  const saved = () => { setEditing(null); notifyChanged(); load(); };
  const routineOf = (a) => routines.find((r) => r.id === a.routineId);

  const rows = [
    ...acts.map((a) => ({ kind: 'act', start: a.startMinutes, a })),
    ...freeSlots(acts, planning).map((s) => ({ kind: 'free', start: s.start, s })),
  ].sort((x, y) => x.start - y.start || (x.kind === 'act' ? -1 : 1));

  return (
    <section>
      <div className="head">
        <div><small>Escolha o dia e preencha os horários</small><h1>Planejar</h1></div>
        <button type="button" className="ghost" disabled={date < now.date} title={date < now.date ? 'Só dá para copiar para hoje ou dias futuros.' : undefined} onClick={() => setCopyOpen(true)}>Copiar de outro dia</button>
      </div>
      <div className="days-bar">
        <button type="button" className="ghost small" aria-label="Semana anterior" onClick={() => { setDate(addDays(date, -7)); setEditing(null); }}>‹</button>
        <div className="dias">
          {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d) => (
            <button key={d} type="button" className={`dia${d === date ? ' on' : ''}`} aria-pressed={d === date} onClick={() => { setDate(d); setEditing(null); }}>
              {weekdayShort(d)} <b>{dayOfMonth(d)}</b>
            </button>
          ))}
        </div>
        <button type="button" className="ghost small" aria-label="Próxima semana" onClick={() => { setDate(addDays(date, 7)); setEditing(null); }}>›</button>
      </div>
      {message && <p className="notice" role="status">{message}</p>}
      <div className="plan-grid">
        <section className="card" aria-label="Dia escolhido">
          <h2>{weekdayLong(date)}</h2>
          <ul className="day-list">
            {rows.map((row) => (row.kind === 'act' ? (
              <li key={row.a.id} className="ag">
                <span className="t">{formatMinutes(row.a.startMinutes)}</span>
                <button type="button" className={`ln ln-open-row${editing?.initial?.id === row.a.id ? ' agora' : ''}`} style={categoryStyle(row.a.category?.color)}
                  onClick={() => setEditing({ initial: row.a, routine: routineOf(row.a) })}>
                  <b>{row.a.name}</b>
                  <small>{[row.a.routineId && row.a.exceptionKind !== 'DETACHED' && routineOf(row.a) ? `↻ ${shortRuleText(routineOf(row.a))}` : '', row.a.isFixed ? 'Fixo' : ''].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ) : (
              <li key={`free-${row.s.start}`} className="ag">
                <span className="t">{formatMinutes(row.s.start)}</span>
                <button type="button" className={`vz${editing && !editing.initial?.id && editing.initial?.startMinutes === row.s.start ? ' sel' : ''}`}
                  aria-label={`+ O que vai fazer? às ${formatMinutes(row.s.start)}`}
                  onClick={() => setEditing({ initial: { startMinutes: row.s.start, endMinutes: row.s.start + MIN_SLOT } })}>
                  + O que vai fazer?
                </button>
              </li>
            )))}
          </ul>
        </section>
        {editing ? (
          <ActivityForm key={`${date}-${editing.initial?.id || editing.initial?.startMinutes}`} date={date} initial={editing.initial} routine={editing.routine}
            categories={categories} now={now} onSaved={saved} onCancel={() => setEditing(null)} />
        ) : (
          <div className="card hint"><h2>O que vai fazer?</h2><p className="soft">Clique em um horário livre para adicionar uma atividade, ou em uma atividade para editar.</p></div>
        )}
      </div>
      {copyOpen && (
        <CopyDialog date={date} now={now} onClose={() => setCopyOpen(false)} onDone={(r) => {
          setCopyOpen(false);
          setMessage(`${plural(r.copied, 'copiada', 'copiadas')}.${r.skipped ? ` ${r.skipped} ${r.skipped === 1 ? 'ficou' : 'ficaram'} de fora porque o horário já estava ocupado.` : ''}`);
          notifyChanged();
          load();
        }} />
      )}
    </section>
  );
}

function CopyDialog({ date, now, onClose, onDone }) {
  const ref = useRef(null);
  const [from, setFrom] = useState(addDays(date, -1));
  const [error, setError] = useState('');
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  const copy = async () => {
    try { onDone(await api(`/days/${date}/copy`, { method: 'POST', body: { fromDate: from, now } })); } catch (e) { setError(e.message); }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="copy-title" onClose={onClose}>
      <h2 id="copy-title">Copiar de outro dia</h2>
      <p className="dlg-text">As atividades entram em {weekdayLong(date)} como avulsas.</p>
      <label className="f">Copiar as atividades de<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="foot"><span /><div className="row-gap"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="button" className="btn" onClick={copy}>Copiar</button></div></div>
    </dialog>
  );
}
