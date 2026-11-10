import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { optionLabel } from '../lib/labels.js';
import { formatDuration, formatMinutes } from '../lib/time.js';

const E1 = 'Não encontramos um horário livre nos próximos dias. Você pode escolher outro dia ou guardar na Inbox.';
const E2 = 'Sua agenda mudou enquanto você decidia. Atualizamos as opções.';
const E3 = 'Não foi possível salvar. Verifique sua conexão.';
const E5 = 'Esta atividade não foi encontrada.';

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const listPt = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`);

export function changesText(moves) {
  if (!moves.length) return 'Nenhuma outra atividade muda.';
  const parts = moves.map((m) => `${m.name} para ${formatMinutes(m.toStart)}–${formatMinutes(m.toEnd)}`);
  return `${moves.length === 1 ? 'Também muda' : 'Também mudam'}: ${listPt(parts)}.`;
}

const newRequestId = () => globalThis.crypto.randomUUID();

// Janela Reorganizar: até 3 opções, com tudo o que muda; nada é salvo até confirmar.
export default function ReorganizeDialog({ activity, now, onClose, onChanged, request = api }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [choice, setChoice] = useState(0);
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(false);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);

  const load = useCallback(async () => {
    try {
      setData(await request(`/activities/${activity.id}/suggestions`, { method: 'POST', body: { now } }));
      setChoice(0);
      requestRef.current = null;
    } catch (e) {
      if (e.code === 'NOT_FOUND') { setGone(true); setNotice(E5); onChanged(); } else setNotice(e.message);
    }
  }, [activity.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    if (busyRef.current || !data?.options.length) return;
    busyRef.current = true;
    const option = data.options[choice];
    requestRef.current ||= newRequestId();
    setBusy(true);
    setRetry(false);
    try {
      await request(`/activities/${activity.id}/apply`, { method: 'POST', body: { option, targetVersion: data.targetVersion, requestId: requestRef.current, now } });
      onChanged();
      onClose();
    } catch (e) {
      if (e.code === 'AGENDA_CHANGED') { setNotice(E2); await load(); } else if (e.code === 'NOT_FOUND') { setGone(true); setNotice(E5); onChanged(); } else if (e.status === 0 || e.code === 'NETWORK') {
        setNotice(E3);
        setRetry(true);
      } else setNotice(e.message);
    } finally { busyRef.current = false; setBusy(false); }
  };

  const toInbox = async () => {
    try { await request(`/activities/${activity.id}/inbox`, { method: 'POST', body: { now } }); onChanged(); onClose(); } catch (e) { setNotice(e.message); }
  };

  const select = (i) => { setChoice(i); requestRef.current = null; };
  const options = data?.options || [];
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="reorg-title" onClose={onClose}>
      <h2 id="reorg-title">Reorganizar: {activity.name}</h2>
      <p className="dlg-text">Mesma duração, {formatDuration(activity.endMinutes - activity.startMinutes)}. Compromissos fixos não mudam. Nada é salvo até você confirmar.</p>
      {notice && <p className={retry || gone ? 'error' : 'notice'} role="alert">{notice}</p>}
      {!gone && data && options.length === 0 && <p className="notice">{E1}</p>}
      {!gone && options.length > 0 && (
        <div role="radiogroup" aria-label="Opções" className="opts">
          {options.map((o, i) => {
            const label = `Opção ${i + 1}: ${lowerFirst(optionLabel(o, now.date))}`;
            return (
              <label key={`${o.kind}-${o.date}-${o.start}`} className={`opt${choice === i ? ' on' : ''}`}>
                <input type="radio" name="reorg" aria-label={label} checked={choice === i} onChange={() => select(i)} />
                {i === 0 && !o.moves.length && <em>Menos mudanças</em>}
                <b>{label}</b>
                <span>{changesText(o.moves)}</span>
              </label>
            );
          })}
        </div>
      )}
      <div className="foot">
        {!gone ? (
          <div className="row-gap">
            <button type="button" className="ghost" onClick={toInbox}>Guardar na Inbox</button>
            {data && options.length === 0 && (
              <button type="button" className="ghost" onClick={() => { onClose(); navigate('/planejar', { state: { date: activity.date, item: activity } }); }}>Escolher outro dia</button>
            )}
          </div>
        ) : <span />}
        <div className="row-gap">
          <button type="button" className="ghost" onClick={onClose}>{gone ? 'Fechar' : 'Cancelar'}</button>
          {retry && <button type="button" className="ghost" onClick={apply}>Tentar novamente</button>}
          {!gone && options.length > 0 && <button type="button" className="btn" disabled={busy} onClick={apply}>Aplicar opção {choice + 1}</button>}
        </div>
      </div>
    </dialog>
  );
}
