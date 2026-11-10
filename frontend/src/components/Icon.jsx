const PATHS = {
  hoje: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>,
  planejar: <><path d="M12 7v10M7 12h10" /><rect x="3.5" y="3.5" width="17" height="17" rx="4" /></>,
  semana: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 5v15M15 5v15" /></>,
  repeticoes: <path d="M4 12a8 8 0 0 1 13.6-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.6 5.6L4 15M4 20v-5h5" />,
  inbox: <path d="M4 13 7 5h10l3 8v6H4zM4 13h5l1 3h4l1-3h5" />,
  progresso: <path d="M5 20V11M12 20V5M19 20v-6" />,
  configuracoes: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
  chama: <path d="M12 2c1 4-1.5 5.5-3.5 8-1.5 2-3 4-3 6.5C5.5 20 8.5 22 12 22s6.5-2 6.5-5.5c0-2.5-1-4.5-2.5-6-.5 1.5-1 2.5-2 3 .5-4-.5-8.5-2-11.5Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

export default function Icon({ name, className = 'icon' }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
