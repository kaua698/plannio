import { useEffect, useState } from 'react';
import { nowLocal } from './time.js';

// Relógio local que atualiza a tela a cada minuto, inclusive na virada do dia.
export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(nowLocal);
  useEffect(() => {
    const id = setInterval(() => {
      const n = nowLocal();
      setNow((prev) => (prev.date === n.date && prev.minutes === n.minutes ? prev : n));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const notifyChanged = () => window.dispatchEvent(new Event('plannio:changed'));
