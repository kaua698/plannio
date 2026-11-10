const pad = (n) => String(n).padStart(2, '0');

export const formatMinutes = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function parseTime(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

// Data e minutos pelo relógio local do navegador, nunca em UTC.
export function nowLocal(d = new Date()) {
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, minutes: d.getHours() * 60 + d.getMinutes() };
}

export const formatRange = (start, end) => `${formatMinutes(start)} às ${formatMinutes(end)}`;
