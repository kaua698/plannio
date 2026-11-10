import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { api } from '../services/api.js';

const AREAS = [
  ['/hoje', 'Hoje', 'hoje'],
  ['/planejar', 'Planejar', 'planejar'],
  ['/semana', 'Semana', 'semana'],
  ['/repeticoes', 'Repetições', 'repeticoes'],
  ['/inbox', 'Inbox', 'inbox'],
  ['/progresso', 'Progresso', 'progresso'],
  ['/configuracoes', 'Configurações', 'configuracoes'],
];

export default function Shell() {
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState(0);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    let alive = true;
    const load = () => api('/inbox').then((l) => { if (alive) setInbox(l.length); }).catch(() => {});
    load();
    window.addEventListener('plannio:changed', load);
    return () => { alive = false; window.removeEventListener('plannio:changed', load); };
  }, []);

  return (
    <div className="app">
      <aside className="side">
        <div className="side-top">
          <div className="logo">Plannio</div>
          <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={open} aria-controls="menu-principal" onClick={() => setOpen((v) => !v)}>
            <Icon name="menu" />
          </button>
        </div>
        <nav id="menu-principal" aria-label="Principal" className={open ? 'nav open' : 'nav'}>
          {AREAS.map(([to, label, icon]) => (
            <NavLink key={to} to={to} className="nav-link">
              <Icon name={icon} />
              <span>{label}</span>
              {to === '/inbox' && inbox > 0 && <b className="count" aria-label={`${inbox} itens`}>{inbox}</b>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
