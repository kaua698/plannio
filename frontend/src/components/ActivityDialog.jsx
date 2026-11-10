import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatMinutes, formatRange, parseTime } from '../lib/time.js';
import { STATUS_LABEL } from './StatusChip.jsx';
import ReorganizeDialog from './ReorganizeDialog.jsx';

const STATUSES = ['PENDING', 'DONE', 'PARTIAL', 'NOT_DONE', 'POSTPONED'];
const reorganizable = (a) => !a.isFixed && ['PENDING', 'POSTPONED'].includes(a.status);

// Janela de uma atividade: status, horário real, etapas e atalhos para editar ou reorganizar.
export default function ActivityDialog({ activity: initial, now, onClose, onChanged }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [a, setA] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [real, setReal] = useState({
    start: initial.actualStart != null ? formatMinutes(initial.actualStart) : '',
    end: initial.actualEnd != null ? formatMinutes(initial.actualEnd) : '',
  });
  const [error, setError] = useState('');
  const [askReorganize, setAskReorganize] = useState(false);
  const [reorganizing, setReorganizing] = useState(false);
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);

  const save = async () => {
    setError('');
    const both = real.start && real.end;
    try {
      const saved = await api(`/activities/${a.id}/status`, { method: 'POST', body: {
        status, actualStart: both ? parseTime(real.start) : null, actualEnd: both ? parseTime(real.end) : null,
      } });
      setA(saved);
      onChanged();
      if (status === 'POSTPONED') setAskReorganize(true);
      else onClose();
    } catch (e) { setError(Object.values(e.fields || {})[0] || e.message); }
  };

  const toggleStep = async (s) => {
    try { setA(await api(`/activities/${a.id}/steps/${s.id}`, { method: 'PATCH', body: { done: !s.done } })); onChanged(); } catch (e) { setError(e.message); }
  };

  if (reorganizing) return <ReorganizeDialog activity={a} now={now} onClose={onClose} onChanged={onChanged} />;

  return (
    <dialog ref={ref} className="dlg" aria-labelledby="act-title" onClose={onClose}>
      <h2 id="act-title">{a.name}</h2>
      <p className="dlg-text">{formatRange(a.startMinutes, a.endMinutes)}{a.category ? ` · ${a.category.name}` : ''}{a.isFixed ? ' · Fixo' : ''}</p>
      {a.steps.length > 0 && (
        <ul className="steps">
          {a.steps.map((s) => (
            <li key={s.id}><label className="step"><input type="checkbox" checked={s.done} onChange={() => toggleStep(s)} /><span>{s.text}</span></label></li>
          ))}
        </ul>
      )}
      <fieldset className="plain">
        <legend className="f-label">Como foi?</legend>
        <div className="chips">
          {STATUSES.map((s) => (
            <label key={s} className={`rp${status === s ? ' on' : ''}`}>
              <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />{STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="g2 real">
        <label className="f">Início real<input type="time" value={real.start} onChange={(e) => setReal({ ...real, start: e.target.value })} /></label>
        <label className="f">Término real<input type="time" value={real.end} onChange={(e) => setReal({ ...real, end: e.target.value })} /></label>
      </div>
      <p className="soft small-text">O horário real é opcional. Sem ele, uma atividade concluída conta o tempo planejado.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {askReorganize && (
        <div className="notice" role="status">
          <p>Quer escolher um novo horário agora?</p>
          <button type="button" className="btn small" onClick={() => setReorganizing(true)}>Reorganizar</button>
        </div>
      )}
      <div className="foot">
        <div className="row-gap">
          <button type="button" className="ghost" onClick={() => { onClose(); navigate('/planejar', { state: { date: a.date, item: a } }); }}>Editar</button>
          {!askReorganize && reorganizable(a) && <button type="button" className="ghost" onClick={() => setReorganizing(true)}>Reorganizar</button>}
        </div>
        <div className="row-gap">
          <button type="button" className="ghost" onClick={onClose}>Fechar</button>
          <button type="button" className="btn" onClick={save}>Salvar</button>
        </div>
      </div>
    </dialog>
  );
}
