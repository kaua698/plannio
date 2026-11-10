import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { API_MODE } from '../services/api.js';
import { nowLocal } from '../lib/time.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const { login, enterDemo, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const back = location.state?.from || '/hoje';

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); navigate(back, { replace: true }); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form onSubmit={(e) => { e.preventDefault(); run(() => login(email, password)); }} noValidate>
        <h1>Entrar</h1>
        <p className="auth-lead">Veja o que fazer em cada hora do seu dia.</p>
        {expired && <p className="notice" role="status">Sua sessão expirou. Entre novamente.</p>}
        <label className="f">E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="f">Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn wide" disabled={busy}>Entrar</button>
        {API_MODE === 'demo' && (
          <button type="button" className="ghost wide" disabled={busy} onClick={() => run(() => enterDemo(nowLocal()))}>Usar conta de exemplo</button>
        )}
      </form>
    </AuthShell>
  );
}
