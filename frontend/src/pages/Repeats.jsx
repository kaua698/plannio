import { LIMITS } from '@plannio/shared/core/validate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { useNow, notifyChanged } from '../lib/useNow.js';
import { categoryStyle } from '../lib/categories.js';
import { formatMinutes, formatRange, parseTime } from '../lib/time.js';
import { ruleText, WEEKDAY_SHORT } from '../lib/rules.js';

const active = (r, today) => (!r.cancelledFrom || r.cancelledFrom > today) && (!r.endDate || r.endDate >= today);

function useModal() {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  return ref;
}

function EditDialog({ routine, now, onClose, onSaved }) {
  const ref = useModal();
  const [f, setF] = useState({
    name: routine.name, start: formatMinutes(routine.startMinutes), end: formatMinutes(routine.endMinutes),
    frequency: ['DAILY', 'WEEKDAYS', 'SPECIFIC_DAYS'].includes(routine.frequency) ? routine.frequency : 'SPECIFIC_DAYS',
    weekdays: routine.weekdays || [], fromDate: routine.startDate > now.date ? routine.startDate : now.date,
  });
  const [error, setError] = useState('');
  const [overlap, setOverlap] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async (allowOverlap = false) => {
    try {
      await api(`/routines/${routine.id}`, { method: 'PATCH', body: {
        fromDate: f.fromDate, name: f.name, startMinutes: parseTime(f.start), endMinutes: parseTime(f.end),
        frequency: f.frequency, weekdays: f.frequency === 'SPECIFIC_DAYS' ? f.weekdays : [], now, allowOverlap,
      } });
      onSaved();
    } catch (e) {
      if (e.code === 'OVERLAP') { setOverlap(true); setError(e.message); } else setError(Object.values(e.fields || {})[0] || e.message);
    }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="edit-routine-title" onClose={onClose}>
      <h2 id="edit-routine-title">Editar repetição</h2>
      <p className="dlg-text">Os dias anteriores à data escolhida continuam como estão.</p>
      <label className="f">Nome<input maxLength={LIMITS.name} value={f.name} onChange={set('name')} /></label>
      <div className="g2">
        <label className="f">Início<input type="time" value={f.start} onChange={set('start')} /></label>
        <label className="f">Término<input type="time" value={f.end} onChange={set('end')} /></label>
      </div>
      <fieldset className="f plain">
        <legend>Repetir</legend>
        <div className="chips">
          {[['DAILY', 'Todos os dias'], ['WEEKDAYS', 'Dias úteis'], ['SPECIFIC_DAYS', 'Escolher dias']].map(([v, l]) => (
            <label key={v} className={`rp${f.frequency === v ? ' on' : ''}`}><input type="radio" name="freq" checked={f.frequency === v} onChange={() => setF((s) => ({ ...s, frequency: v }))} />{l}</label>
          ))}
        </div>
        {f.frequency === 'SPECIFIC_DAYS' && (
          <div className="chips days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className={`rp${f.weekdays.includes(d) ? ' on' : ''}`}>
                <input type="checkbox" checked={f.weekdays.includes(d)} onChange={() => setF((s) => ({ ...s, weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d] }))} />
                {WEEKDAY_SHORT[d]}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <label className="f">A partir de<input type="date" min={now.date} value={f.fromDate} onChange={set('fromDate')} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="foot">
        <span />
        <div className="row-gap">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          {overlap && <button type="button" className="ghost" onClick={() => save(true)}>Manter assim</button>}
          <button type="button" className="btn" onClick={() => save()}>Salvar</button>
        </div>
      </div>
    </dialog>
  );
}

function StopDialog({ routine, now, onClose, onSaved }) {
  const ref = useModal();
  const [fromDate, setFromDate] = useState(now.date);
  const [error, setError] = useState('');
  const stop = async () => {
    try { await api(`/routines/${routine.id}/cancel`, { method: 'POST', body: { fromDate, now } }); onSaved(); } catch (e) { setError(e.message); }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="stop-title" onClose={onClose}>
      <h2 id="stop-title">Parar de repetir</h2>
      <p className="dlg-text">{routine.name} deixa de aparecer a partir da data escolhida. O que você já marcou fica no histórico.</p>
      <label className="f">A partir de<input type="date" min={now.date} value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="foot"><span /><div className="row-gap"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="button" className="btn" onClick={stop}>Parar de repetir</button></div></div>
    </dialog>
  );
}

export default function Repeats() {
  const now = useNow();
  const [routines, setRoutines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api('/routines'), api('/categories')]);
      setRoutines(r);
      setCategories(c);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const done = () => { setDialog(null); notifyChanged(); load(); };
  const list = routines.filter((r) => active(r, now.date));
  return (
    <section>
      <div className="head"><div><small>Ações que se repetem sozinhas</small><h1>Repetições</h1></div></div>
      {error && <p className="error" role="alert">{error}</p>}
      {list.length === 0 && <div className="card"><p className="soft">Nenhuma ação se repete ainda. Em Planejar, escolha “Repetir esta ação” ao salvar.</p></div>}
      <div className="grid repeats">
        {list.map((r) => {
          const cat = categories.find((c) => c.id === r.categoryId);
          return (
            <article key={r.id} className="card repeat" aria-label={r.name}>
              <div className="repeat-name" style={categoryStyle(cat?.color)}>
                <b>{r.name}</b>
                <span className="soft">{[cat?.name, r.isFixed ? 'Fixo' : 'Flexível'].filter(Boolean).join(' · ')}</span>
              </div>
              <div><span>↻ {ruleText(r)}</span><span className="soft block">{formatRange(r.startMinutes, r.endMinutes)}</span></div>
              <div className="row-gap">
                <button type="button" className="ghost small" onClick={() => setDialog({ type: 'edit', routine: r })}>Editar</button>
                <button type="button" className="ghost small" onClick={() => setDialog({ type: 'stop', routine: r })}>Parar de repetir</button>
              </div>
            </article>
          );
        })}
      </div>
      {dialog?.type === 'edit' && <EditDialog routine={dialog.routine} now={now} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === 'stop' && <StopDialog routine={dialog.routine} now={now} onClose={() => setDialog(null)} onSaved={done} />}
    </section>
  );
}
