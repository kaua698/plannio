import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [expired, setExpired] = useState(false);
  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    let alive = true;
    api('/auth/session').then((r) => { if (alive) setUser(r.user); }).catch(() => {}).finally(() => { if (alive) setStatus('ready'); });
    const onExpired = () => {
      if (!userRef.current) return;
      setUser(null);
      setExpired(true);
    };
    window.addEventListener('plannio:session-expired', onExpired);
    return () => { alive = false; window.removeEventListener('plannio:session-expired', onExpired); };
  }, []);

  const enter = useCallback((u) => { setUser(u); setExpired(false); return u; }, []);
  const value = useMemo(() => ({
    user,
    status,
    expired,
    login: async (email, password) => enter(await api('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (data) => enter(await api('/auth/register', { method: 'POST', body: data })),
    enterDemo: async (now) => enter(await api('/auth/demo', { method: 'POST', body: { now } })),
    logout: async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); },
    updateUser: (u) => setUser(u),
    clear: () => setUser(null),
  }), [user, status, expired, enter]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
