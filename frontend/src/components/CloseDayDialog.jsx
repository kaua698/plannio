import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { formatRange } from '../lib/time.js';
import { STATUS_LABEL } from './StatusChip.jsx';
import ReorganizeDialog from './ReorganizeDialog.jsx';

// Fechar o dia: marcar o que faltou; cada mudança é salva na hora, e fechar não grava mais nada.
export default function CloseDayDialog({ date, now, onClose, onChanged }) {
  const ref = useRef(null);
  const [acts, setActs] = useState(null);
  const [error, setError] = useState('');
  const [reorganizing, setReorganizing] = useState(null);
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);

  const load = useCallback(async () => {
    try { setActs(await api('/activities', { query: { from: date, to: date, nowDate: now.date } })); } catch (e) { setError(e.message); }
  }, [date, now.date]);
  useEffect(() => { load(); }, [load]);

  const mark = async (a, status) => {
    try { await api(`/activities/${a.id}/status`, { method: 'POST', body: { status } }); onChanged(); load(); } catch (e) { setError(e.message); }
  };

  if (reorganizing) {
    return <ReorganizeDialog activity={reorganizing} now={now} onClose={() => { setReorganizing(null); }} onChanged={() => { onChanged(); load(); }} />;
  }

  const open = (acts || []).filter((a) => a.status !== 'DONE');
  const left = open.length;
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="close-title" onClose={onClose}>
      <h2 id="close-title">Fechar o dia</h2>
      <p className="dlg-text">Marque o que aconteceu. Para a ofensiva, tudo o que ficou no dia precisa estar concluído.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {acts && (
        <ul className="plain-list">
          {open.map((a) => (
            <li key={a.id} className="item" aria-label={a.name}>
              <span><b>{a.name}</b><small>{formatRange(a.startMinutes, a.endMinutes)}</small></span>
              <span className="row-gap">
                <select aria-label={`Status de ${a.name}`} value={a.status} onChange={(e) => mark(a, e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {!a.isFixed && ['PENDING', 'POSTPONED'].includes(a.status) && (
                  <button type="button" className="ghost small" onClick={() => setReorganizing(a)}>Reorganizar</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="foot">
        <span className="soft">{left ? `Faltam ${left} para o dia contar.` : 'Dia cumprido.'}</span>
        <button type="button" className="btn" onClick={onClose}>Fechar</button>
      </div>
    </dialog>
  );
}
