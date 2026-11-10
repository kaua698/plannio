import { LIMITS } from '@plannio/shared/core/validate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useNow, notifyChanged } from '../lib/useNow.js';
import { addDays } from '../lib/dates.js';
import { formatDuration } from '../lib/time.js';
import { optionLabel } from '../lib/labels.js';

function SaveDialog({ categories, now, onClose, onSaved }) {
  const ref = useRef(null);
  const [f, setF] = useState({ name: '', categoryId: '', minutes: '30' });
  const [error, setError] = useState('');
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/activities', { method: 'POST', body: { name: f.name, categoryId: f.categoryId || null, estimatedMinutes: Number(f.minutes) || 30, now } });
      onSaved();
    } catch (err) { setError(Object.values(err.fields || {})[0] || err.message); }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="save-title" onClose={onClose}>
      <form onSubmit={save} noValidate>
        <h2 id="save-title">Guardar na Inbox</h2>
        <p className="dlg-text">Fica aqui até você escolher quando fazer.</p>
        <label className="f">Nome<input maxLength={LIMITS.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="g2">
          <label className="f">Categoria
            <select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="f">Duração estimada (min)<input type="number" min="5" max="1440" step="5" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="foot"><span /><div className="row-gap"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="submit" className="btn">Guardar</button></div></div>
      </form>
    </dialog>
  );
}

function FitPanel({ item, now, onClose, onDone }) {
  const [options, setOptions] = useState(null);
  const [choice, setChoice] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    api(`/inbox/${item.id}/suggestions`, { method: 'POST', body: { now } })
      .then((r) => { if (alive) { setOptions(r.options); setChoice(0); } })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = async (allowOverlap = false) => {
    const o = options[choice];
    try {
      await api(`/inbox/${item.id}/schedule`, { method: 'POST', body: { date: o.date, startMinutes: o.start, endMinutes: o.end, allowOverlap, now } });
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <section className="card" aria-label="Horários livres">
      <span className="lab">Horários livres para</span>
      <h2>{item.name}</h2>
      {!options && !error && <p className="soft">Procurando horários…</p>}
      {options && options.length === 0 && (
        <p className="notice">Não encontramos um horário livre nos próximos dias. Você pode escolher outro dia ou guardar na Inbox.</p>
      )}
      {options && options.length > 0 && (
        <div role="radiogroup" aria-label="Opções de horário" className="opts">
          {options.map((o, i) => (
            <label key={`${o.date}-${o.start}`} className={`opt${choice === i ? ' on' : ''}`}>
              <input type="radio" name="fit" checked={choice === i} onChange={() => setChoice(i)} aria-label={optionLabel(o, now.date)} />
              {i === 0 && <em>Mais cedo</em>}
              <b>{optionLabel(o, now.date)}</b>
              <span>Nenhuma atividade muda.</span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="foot">
        <button type="button" className="ghost small" onClick={onClose}>Deixar na Inbox</button>
        {options?.length > 0 && <button type="button" className="btn small" onClick={() => place()}>Colocar na rotina</button>}
      </div>
    </section>
  );
}

export default function Inbox() {
  const now = useNow();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fitting, setFitting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [i, c] = await Promise.all([api('/inbox'), api('/categories')]);
      setItems(i);
      setCategories(c);
      return i;
    } catch (e) { setError(e.message); return []; }
  }, []);
  useEffect(() => {
    load().then((list) => {
      const fit = location.state?.fit && list.find((x) => x.id === location.state.fit);
      if (fit) setFitting(fit);
    });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = () => { setFitting(null); setSaving(false); notifyChanged(); load(); };

  return (
    <section>
      <div className="head">
        <div><small>Coisas para fazer, ainda sem horário</small><h1>Inbox</h1></div>
        <button type="button" className="btn" onClick={() => setSaving(true)}>+ Guardar atividade</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="inbox-grid">
        <section className="card">
          {items.length === 0 && <p className="soft">Nada guardado. Use “Guardar atividade” para anotar algo sem horário.</p>}
          <ul className="plain-list" aria-label="Itens da Inbox">
            {items.map((i) => (
              <li key={i.id} className="item" aria-label={i.name}>
                <span><b>{i.name}</b><small>{[i.category?.name, formatDuration(i.estimatedMinutes || 30)].filter(Boolean).join(' · ')}</small></span>
                <span className="row-gap">
                  <button type="button" className="btn small" onClick={() => setFitting(i)}>Encaixar na rotina</button>
                  <button type="button" className="ghost small" onClick={() => navigate('/planejar', { state: { date: addDays(now.date, 1), item: i } })}>Escolher dia</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
        {fitting && <FitPanel key={fitting.id} item={fitting} now={now} onClose={() => setFitting(null)} onDone={changed} />}
      </div>
      {saving && <SaveDialog categories={categories} now={now} onClose={() => setSaving(false)} onSaved={changed} />}
    </section>
  );
}
