import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useNow } from '../lib/useNow.js';
import { addDays, longDate, mondayOf, rangeLabel, weekdayShort } from '../lib/dates.js';
import { formatDuration, formatMinutes } from '../lib/time.js';
import { categoryStyle } from '../lib/categories.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const REASON = { MANUAL_EDIT: 'Editada', REORGANIZE: 'Reorganizada' };
const days = (n) => (n === 1 ? '1 dia' : `${n} dias`);

function changeText(c) {
  const from = c.fromStart != null ? `${formatMinutes(c.fromStart)}–${formatMinutes(c.fromEnd)}` : 'Inbox';
  const to = c.toStart != null ? `${formatMinutes(c.toStart)}–${formatMinutes(c.toEnd)}` : 'Inbox';
  const sameDay = c.fromDate === c.toDate;
  const left = c.fromDate && !sameDay ? `${longDate(c.fromDate)}, ${from}` : from;
  const right = c.toDate && !sameDay ? `${longDate(c.toDate)}, ${to}` : to;
  return `${left} → ${right}`;
}

function History() {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try { const r = await api('/history'); setItems(r.items); setNext(r.next); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('plannio:changed', load);
    return () => window.removeEventListener('plannio:changed', load);
  }, [load]);

  const more = async () => {
    try { const r = await api('/history', { query: { before: next } }); setItems([...items, ...r.items]); setNext(r.next); } catch (e) { setError(e.message); }
  };
  const remove = async () => {
    try { await api(`/history/${confirm.id}`, { method: 'DELETE' }); setItems(items.filter((i) => i.id !== confirm.id)); } catch (e) { setError(e.message); }
    setConfirm(null);
  };

  return (
    <details className="card history">
      <summary>Ver histórico de alterações</summary>
      {error && <p className="error" role="alert">{error}</p>}
      {items.length === 0 && <p className="soft">Nenhuma alteração registrada.</p>}
      <ul className="plain-list">
        {items.map((c) => (
          <li key={c.id} className="item" aria-label={c.activityName}>
            <span>
              <b>{c.activityName}</b>
              <small>{REASON[c.reason] || 'Alterada'} · {c.fromDate ? longDate(c.fromDate) : 'sem data'}</small>
              <small>{changeText(c)}</small>
            </span>
            <button type="button" className="ghost small" onClick={() => setConfirm(c)}>Excluir registro</button>
          </li>
        ))}
      </ul>
      {next && <button type="button" className="ghost small" onClick={more}>Ver mais</button>}
      {confirm && (
        <ConfirmDialog title="Excluir registro" confirmLabel="Excluir" danger onClose={() => setConfirm(null)} onConfirm={remove}>
          O registro de {confirm.activityName} sai do histórico. A atividade não muda.
        </ConfirmDialog>
      )}
    </details>
  );
}

export default function Progress() {
  const now = useNow();
  const [weekStart, setWeekStart] = useState(mondayOf(now.date));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const end = addDays(weekStart, 6);

  const load = useCallback(async () => {
    try { setData(await api('/progress', { query: { weekStart, today: now.date, minutes: now.minutes } })); setError(''); } catch (e) { setError(e.message); }
  }, [weekStart, now.date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('plannio:changed', load);
    return () => window.removeEventListener('plannio:changed', load);
  }, [load]);

  const empty = data && data.counts.planned === 0;
  return (
    <section>
      <div className="head">
        <div><small>Progresso</small><h1>{rangeLabel(weekStart, end)}</h1></div>
        <div className="row-gap">
          <button type="button" className="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>Anterior</button>
          <button type="button" className="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>Próxima</button>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {data && (
        <div className="progress-grid">
          <section className="card stats" aria-label="Resumo">
            <div><small>Ofensiva atual</small><b className="big">{days(data.streak.current)}</b></div>
            <div><small>Maior ofensiva</small><b className="big">{days(data.streak.best)}</b></div>
            <div><small>Concluídas na semana</small><b className="big">{data.counts.done} de {data.counts.planned}</b></div>
          </section>
          {empty && <p className="soft card">Nada planejado nesta semana ainda.</p>}
          <section className="card" aria-label="Cumprido por dia">
            <h2>Cumprido por dia</h2>
            <ul className="plain-list days-bars">
              {data.byDay.map((d) => (
                <li key={d.date} className={d.date === now.date ? 'today' : ''} title={`${d.done} de ${d.total}`}>
                  <span>{weekdayShort(d.date)}</span>
                  <span className="bar" aria-hidden="true"><i style={{ width: `${d.percent ?? 0}%` }} /></span>
                  <b>{d.percent == null ? '–' : `${d.percent}%`}</b>
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-label="Tempo por categoria">
            <h2>Tempo por categoria</h2>
            {data.byCategory.length === 0 && <p className="soft">Sem tempo planejado nesta semana.</p>}
            {data.byCategory.map((c) => {
              const base = c.goalMinutes || c.plannedMinutes || 1;
              return (
                <div className="goal" key={c.id ?? 'none'}>
                  <div className="goal-head">
                    <b className="cat-dot" style={c.color ? categoryStyle(c.color) : undefined}>{c.label}</b>
                    <span className="soft">
                      {formatDuration(c.plannedMinutes)} planejado · {formatDuration(c.actualMinutes)} realizado
                      {c.goalMinutes ? ` · meta ${formatDuration(c.goalMinutes)}` : ''}
                    </span>
                  </div>
                  <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.round((c.actualMinutes / base) * 100))}%` }} /></div>
                </div>
              );
            })}
            {data.previousActualMinutes > 0 && <p className="soft">Semana anterior: {formatDuration(data.previousActualMinutes)} realizado.</p>}
          </section>
          <History />
        </div>
      )}
    </section>
  );
}
