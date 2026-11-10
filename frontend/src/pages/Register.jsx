import { LIMITS } from '@plannio/shared/core/validate';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.name.trim()) local.name = 'Informe seu nome.';
    if (form.password.length < 8) local.password = 'A senha precisa ter pelo menos 8 caracteres.';
    setFields(local);
    setError('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await register(form);
      navigate('/hoje', { replace: true });
    } catch (err) {
      setFields(err.fields || {});
      if (!Object.keys(err.fields || {}).length) setError(err.message);
    } finally { setBusy(false); }
  };

  const field = (k, label, type, auto) => (
    <div className="f">
      <label className="f-label" htmlFor={`reg-${k}`}>{label}</label>
      <input id={`reg-${k}`} maxLength={{ name: LIMITS.userName, email: LIMITS.email }[k]} type={type} autoComplete={auto} value={form[k]} onChange={set(k)} aria-invalid={Boolean(fields[k])} aria-describedby={fields[k] ? `erro-${k}` : undefined} />
      {fields[k] && <span id={`erro-${k}`} className="field-error">{fields[k]}</span>}
    </div>
  );

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate>
        <h1>Criar conta</h1>
        <p className="auth-lead">Monte seu dia e veja o que fazer em cada hora.</p>
        {field('name', 'Nome', 'text', 'name')}
        {field('email', 'E-mail', 'email', 'email')}
        {field('password', 'Senha', 'password', 'new-password')}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn wide" disabled={busy}>Criar conta</button>
      </form>
    </AuthShell>
  );
}
