import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const ThemeContext = createContext(null);
const systemDark = () => Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);

export function ThemeProvider({ children }) {
  const { user, status, updateUser } = useAuth();
  const preference = user?.theme ?? 'SYSTEM';
  const [dark, setDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq?.addEventListener) return undefined;
    const fn = () => setDark(systemDark());
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const resolved = preference === 'SYSTEM' ? (dark ? 'dark' : 'light') : preference.toLowerCase();
  // Enquanto a sessão carrega, vale o tema que o theme-init.js já aplicou.
  useEffect(() => {
    if (status === 'loading') return;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    try {
      if (preference === 'SYSTEM') localStorage.removeItem('plannio-theme');
      else localStorage.setItem('plannio-theme', preference);
    } catch { /* armazenamento indisponível: só não lembra */ }
  }, [resolved, preference, status]);

  const setPreference = useCallback(async (p) => {
    const u = await api('/me', { method: 'PATCH', body: { theme: p === 'SYSTEM' ? null : p } });
    updateUser(u);
  }, [updateUser]);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
