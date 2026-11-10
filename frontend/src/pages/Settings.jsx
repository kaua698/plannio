import { LIMITS } from '@plannio/shared/core/validate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { categoryStyle, COLOR_NAMES, COLORS } from '../lib/categories.js';
import { formatDuration, formatMinutes, parseTime } from '../lib/time.js';
import { notifyChanged } from '../lib/useNow.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

function CategoryDialog({ category, onClose, onSaved }) {
  const ref = useRef(null);
  const [f, setF] = useState({
    name: category?.name || '', color: category?.color || 'AZUL',
    hours: category?.weeklyGoalMinutes ? String(category.weeklyGoalMinutes / 60) : '',
  });
  const [error, setError] = useState('');
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  const title = category ? 'Editar categoria' : 'Nova categoria';
  const save = async (e) => {
    e.preventDefault();
    const hours = f.hours.trim() ? Number(f.hours.replace(',', '.')) : null;
    const body = { name: f.name, color: f.color, weeklyGoalMinutes: hours ? Math.round(hours * 60) : null };
    try {
      if (category) await api(`/categories/${category.id}`, { method: 'PATCH', body });
      else await api('/categories', { method: 'POST', body });
      onSaved();
    } catch (err) { setError(Object.values(err.fields || {})[0] || err.message); }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="cat-title" onClose={onClose}>
      <form onSubmit={save} noValidate>
        <h2 id="cat-title">{title}</h2>
        <label className="f">Nome<input maxLength={LIMITS.category} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <fieldset className="f plain">
          <legend>Cor</legend>
          <div className="chips">
            {COLORS.map((c) => (
              <label key={c} className={`sw${f.color === c ? ' on' : ''}`} style={categoryStyle(c)}>
                <input type="radio" name="cor" checked={f.color === c} onChange={() => setF({ ...f, color: c })} />
                <i />{COLOR_NAMES[c]}
              </label>
            ))}
          </div>
          <span className="soft small-text">Cada cor já vem com fundo, borda e texto legíveis nos dois temas.</span>
        </fieldset>
        <label className="f">Meta por semana (horas)<input type="number" min="0" step="0.5" placeholder="Sem meta" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="foot"><span /><div className="row-gap"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="submit" className="btn">Salvar</button></div></div>
      </form>
    </dialog>
  );
}

function DeleteAccountDialog({ onClose, onDeleted }) {
  const ref = useRef(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  const del = async (e) => {
    e.preventDefault();
    try { await api('/me', { method: 'DELETE', body: { password } }); onDeleted(); } catch (err) { setError(err.message); }
  };
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="del-title" onClose={onClose}>
      <form onSubmit={del} noValidate>
        <h2 id="del-title">Excluir conta</h2>
        <p className="dlg-text">Sua conta e todos os seus dados serão apagados. Isso não pode ser desfeito.</p>
        <label className="f">Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="foot"><span /><div className="row-gap"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="submit" className="btn danger">Excluir minha conta</button></div></div>
      </form>
    </dialog>
  );
}

export default function Settings() {
  const { user, updateUser, logout, clear } = useAuth();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [day, setDay] = useState({ start: formatMinutes(user.planningStart), end: formatMinutes(user.planningEnd) });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => { setCategories(await api('/categories')); }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const done = () => { setDialog(null); notifyChanged(); load(); };

  const saveDay = async () => {
    try {
      updateUser(await api('/me', { method: 'PATCH', body: { planningStart: parseTime(day.start), planningEnd: parseTime(day.end) } }));
      setMessage('Horário do dia salvo.');
      setError('');
    } catch (e) { setError(Object.values(e.fields || {})[0] || e.message); }
  };

  return (
    <section>
      <div className="head"><div><small>Preferências</small><h1>Configurações</h1></div></div>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}
      <div className="settings-grid">
        <section className="card" aria-label="Categorias e metas">
          <h2>Categorias e metas</h2>
          <ul className="plain-list" aria-label="Categorias">
            {categories.map((c) => (
              <li key={c.id} className="item">
                <span className="sw static" style={categoryStyle(c.color)}><i />{c.name}{c.weeklyGoalMinutes ? ` · ${formatDuration(c.weeklyGoalMinutes)} por semana` : ''}</span>
                <span className="row-gap">
                  <button type="button" className="ghost small" aria-label={`Editar ${c.name}`} onClick={() => setDialog({ type: 'cat', category: c })}>Editar</button>
                  <button type="button" className="ghost small" aria-label={`Excluir ${c.name}`} onClick={() => setDialog({ type: 'delCat', category: c })}>Excluir</button>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="ghost small" onClick={() => setDialog({ type: 'cat' })}>+ Nova categoria</button>
        </section>
        <section className="card" aria-label="Horário do dia">
          <h2>Horário do dia</h2>
          <div className="g2">
            <label className="f">Começo do dia<input type="time" value={day.start} onChange={(e) => setDay({ ...day, start: e.target.value })} /></label>
            <label className="f">Fim do dia<input type="time" value={day.end} onChange={(e) => setDay({ ...day, end: e.target.value })} /></label>
          </div>
          <p className="soft small-text">As sugestões de horário e os espaços livres de Planejar ficam dentro desse período.</p>
          <button type="button" className="ghost small" onClick={saveDay}>Salvar horário</button>
        </section>
        <section className="card" aria-label="Aparência">
          <h2>Aparência</h2>
          <fieldset className="plain">
            <legend className="f-label">Tema</legend>
            <div className="seg">
              {[['SYSTEM', 'Sistema'], ['LIGHT', 'Claro'], ['DARK', 'Escuro']].map(([v, l]) => (
                <label key={v} className={preference === v ? 'on' : ''}>
                  <input type="radio" name="tema" checked={preference === v} onChange={() => setPreference(v).catch((e) => setError(e.message))} />{l}
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <section className="card" aria-label="Conta">
          <h2>Conta</h2>
          <p className="soft small-text">{user.name} · {user.email}</p>
          <div className="row-gap">
            <button type="button" className="ghost small" onClick={async () => { await logout(); navigate('/login'); }}>Sair</button>
            <button type="button" className="ghost small" onClick={() => setDialog({ type: 'delAccount' })}>Excluir conta</button>
          </div>
        </section>
      </div>
      {dialog?.type === 'cat' && <CategoryDialog category={dialog.category} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === 'delCat' && (
        <ConfirmDialog title="Excluir categoria" confirmLabel="Excluir" danger onClose={() => setDialog(null)}
          onConfirm={async () => { try { await api(`/categories/${dialog.category.id}`, { method: 'DELETE' }); done(); } catch (e) { setError(e.message); setDialog(null); } }}>
          {dialog.category.name} será excluída. As atividades continuam, sem categoria.
        </ConfirmDialog>
      )}
      {dialog?.type === 'delAccount' && <DeleteAccountDialog onClose={() => setDialog(null)} onDeleted={() => { clear(); navigate('/login', { replace: true }); }} />}
    </section>
  );
}
