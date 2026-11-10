import { LIMITS } from '@plannio/shared/core/validate';
import { useState } from 'react';
import { api } from '../services/api.js';
import { formatMinutes, parseTime } from '../lib/time.js';
import { WEEKDAY_SHORT } from '../lib/rules.js';
import ScopeDialog from './ScopeDialog.jsx';

const REPEATS = [
  ['NONE', 'Só neste dia'], ['DAILY', 'Todos os dias'], ['WEEKDAYS', 'Dias úteis'], ['SPECIFIC_DAYS', 'Escolher dias'], ['CUSTOM', 'Personalizada'],
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const sameRule = (a, b) => a.repeat === b.repeat && (a.repeat === 'NONE' || (
  JSON.stringify([...(a.weekdays || [])].sort()) === JSON.stringify([...(b.weekdays || [])].sort())
  && (a.repeat !== 'CUSTOM' || (Number(a.intervalValue) === Number(b.intervalValue) && a.intervalUnit === b.intervalUnit))));

// Formulário de Planejar: cria ou edita uma atividade e decide se ela se repete.
export default function ActivityForm({ date, initial, routine, categories, now, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const occurrence = Boolean(initial?.routineId && initial.exceptionKind !== 'DETACHED');
  const startRule = {
    repeat: occurrence && routine ? routine.frequency : 'NONE',
    weekdays: routine?.weekdays || [], intervalValue: routine?.intervalValue || 2, intervalUnit: routine?.intervalUnit || 'WEEK',
  };
  const [f, setF] = useState({
    name: initial?.name || '',
    start: formatMinutes(initial?.startMinutes ?? 360),
    end: formatMinutes(initial?.endMinutes ?? (initial?.startMinutes ?? 360) + 30),
    categoryId: initial?.categoryId || '',
    isFixed: Boolean(initial?.isFixed),
    priority: initial?.priority || '',
    description: initial?.description || '',
    steps: (initial?.steps || []).map((s) => s.text),
    newStep: '',
    ...startRule,
  });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [overlap, setOverlap] = useState(null);
  const [scopeFor, setScopeFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const payload = () => ({
    name: f.name,
    startMinutes: parseTime(f.start),
    endMinutes: parseTime(f.end),
    categoryId: f.categoryId || null,
    isFixed: f.isFixed,
    priority: f.priority || null,
    description: f.description.trim() || null,
    steps: f.steps,
  });
  const rule = () => ({
    frequency: f.repeat,
    weekdays: f.repeat === 'SPECIFIC_DAYS' || (f.repeat === 'CUSTOM' && f.intervalUnit === 'WEEK') ? f.weekdays : [],
    intervalValue: f.repeat === 'CUSTOM' ? Number(f.intervalValue) : null,
    intervalUnit: f.repeat === 'CUSTOM' ? f.intervalUnit : null,
  });

  async function send(extra = {}) {
    const body = { ...payload(), now, ...extra };
    if (occurrence) {
      if (f.repeat === 'NONE') return api(`/activities/${initial.id}`, { method: 'PATCH', body: { ...body, scope: 'this' } });
      if (!sameRule(f, startRule)) {
        return api(`/routines/${initial.routineId}`, { method: 'PATCH', body: { ...body, ...rule(), fromDate: initial.occurrenceDate } });
      }
      return api(`/activities/${initial.id}`, { method: 'PATCH', body: { ...body, scope: extra.scope } });
    }
    if (editing) {
      const saved = await api(`/activities/${initial.id}`, { method: 'PATCH', body: { ...body, date } });
      if (f.repeat === 'NONE') return saved;
      return api('/routines', { method: 'POST', body: { fromActivityId: initial.id, ...rule(), now, allowOverlap: extra.allowOverlap } });
    }
    if (f.repeat === 'NONE') return api('/activities', { method: 'POST', body: { ...body, date } });
    return api('/routines', { method: 'POST', body: { ...body, ...rule(), startDate: date } });
  }

  async function submit(extra = {}) {
    const needsScope = occurrence && f.repeat !== 'NONE' && sameRule(f, startRule) && !extra.scope;
    if (needsScope) { setScopeFor({ kind: 'save', extra }); return; }
    setBusy(true);
    setError('');
    setFields({});
    try {
      await send(extra);
      setOverlap(null);
      onSaved();
    } catch (e) {
      if (e.code === 'OVERLAP') setOverlap({ extra, message: e.message });
      else if (Object.keys(e.fields || {}).length) setFields(e.fields);
      else setError(e.message);
    } finally { setBusy(false); }
  }

  async function remove(scope) {
    setBusy(true);
    try {
      await api(`/activities/${initial.id}`, { method: 'DELETE', body: { scope, now } });
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const err = (k) => fields[k] && <span className="field-error" id={`erro-${k}`}>{fields[k]}</span>;
  const toggleDay = (d) => setF((s) => ({ ...s, weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d] }));
  const stepsFull = f.steps.length >= LIMITS.steps;
  const addStep = () => { if (!stepsFull && f.newStep.trim()) setF((s) => ({ ...s, steps: [...s.steps, s.newStep.trim()], newStep: '' })); };

  return (
    <form className="card plan-form" aria-label="O que vai fazer?" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h2>O que vai fazer?</h2>
      <div className="f">
        <label className="f-label" htmlFor="af-name">Nome</label>
        <input id="af-name" maxLength={LIMITS.name} value={f.name} onChange={set('name')} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? 'erro-name' : undefined} />
        {err('name')}
      </div>
      <div className="g2">
        <div className="f"><label className="f-label" htmlFor="af-start">Início</label><input id="af-start" type="time" value={f.start} onChange={set('start')} />{err('startMinutes')}</div>
        <div className="f"><label className="f-label" htmlFor="af-end">Término</label><input id="af-end" type="time" value={f.end} onChange={set('end')} aria-invalid={Boolean(fields.endMinutes)} aria-describedby={fields.endMinutes ? 'erro-endMinutes' : undefined} />{err('endMinutes')}</div>
      </div>
      {err('date')}
      <label className="f">Categoria
        <select value={f.categoryId} onChange={set('categoryId')}>
          <option value="">Sem categoria</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <fieldset className="f seg-field">
        <legend>Tipo</legend>
        <div className="seg">
          <label className={!f.isFixed ? 'on' : ''}><input type="radio" name="tipo" checked={!f.isFixed} onChange={() => setF((s) => ({ ...s, isFixed: false }))} />Flexível</label>
          <label className={f.isFixed ? 'on' : ''}><input type="radio" name="tipo" checked={f.isFixed} onChange={() => setF((s) => ({ ...s, isFixed: true }))} />Fixo</label>
        </div>
      </fieldset>
      <fieldset className="f">
        <legend>Repetir esta ação</legend>
        <div className="chips">
          {REPEATS.map(([value, label]) => (
            <label key={value} className={`rp${f.repeat === value ? ' on' : ''}`}>
              <input type="radio" name="repetir" value={value} checked={f.repeat === value} onChange={() => setF((s) => ({ ...s, repeat: value }))} />
              {value !== 'NONE' && f.repeat === value ? '↻ ' : ''}{label}
            </label>
          ))}
        </div>
        {(f.repeat === 'SPECIFIC_DAYS' || (f.repeat === 'CUSTOM' && f.intervalUnit === 'WEEK')) && (
          <div className="chips days">
            {WEEK_ORDER.map((d) => (
              <label key={d} className={`rp${f.weekdays.includes(d) ? ' on' : ''}`}>
                <input type="checkbox" checked={f.weekdays.includes(d)} onChange={() => toggleDay(d)} />{WEEKDAY_SHORT[d]}
              </label>
            ))}
          </div>
        )}
        {f.repeat === 'CUSTOM' && (
          <div className="g2">
            <label className="f">A cada<input type="number" min="1" max="52" value={f.intervalValue} onChange={set('intervalValue')} /></label>
            <label className="f">Unidade
              <select value={f.intervalUnit} onChange={set('intervalUnit')}><option value="DAY">dias</option><option value="WEEK">semanas</option></select>
            </label>
          </div>
        )}
        {err('weekdays')}{err('intervalValue')}
      </fieldset>
      <fieldset className="f">
        <legend>Etapas (opcional)</legend>
        <ul className="steps">
          {f.steps.map((s, i) => (
            <li key={`${s}-${i}`} className="step-row">
              <span>{s}</span>
              <button type="button" className="link-btn" aria-label={`Remover etapa ${s}`} onClick={() => setF((x) => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}>Remover</button>
            </li>
          ))}
        </ul>
        <div className="row-gap">
          <input aria-label="Nova etapa" placeholder="Adicionar etapa" maxLength={LIMITS.stepText} disabled={stepsFull} value={f.newStep} onChange={set('newStep')}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} />
          <button type="button" className="ghost small" disabled={stepsFull} onClick={addStep}>Adicionar</button>
        </div>
        {stepsFull && <small className="soft">Limite de {LIMITS.steps} etapas.</small>}
        {err('steps')}
      </fieldset>
      <details className="more">
        <summary>Mais opções</summary>
        <label className="f">Prioridade
          <select value={f.priority} onChange={set('priority')}>
            <option value="">Sem prioridade</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option>
          </select>
        </label>
        <label className="f">Descrição<textarea rows="2" maxLength={LIMITS.description} value={f.description} onChange={set('description')} /></label>
      </details>
      {overlap && (
        <div className="notice" role="alert">
          <p>{overlap.message}</p>
          <button type="button" className="ghost small" onClick={() => submit({ ...overlap.extra, allowOverlap: true })}>Manter assim</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="foot">
        <div className="row-gap">
          {editing && <button type="button" className="ghost" disabled={busy} onClick={() => (occurrence ? setScopeFor({ kind: 'delete' }) : remove())}>Excluir</button>}
          <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        </div>
        <button type="submit" className="btn" disabled={busy}>Salvar no dia</button>
      </div>
      {scopeFor && (
        <ScopeDialog
          action={scopeFor.kind === 'delete' ? 'exclusão' : 'mudança'}
          onClose={() => setScopeFor(null)}
          onChoose={(scope) => {
            const pending = scopeFor;
            setScopeFor(null);
            if (pending.kind === 'delete') remove(scope);
            else submit({ ...pending.extra, scope });
          }}
        />
      )}
    </form>
  );
}
