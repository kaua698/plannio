// Ofensiva (seção 6 da especificação). days: [{ date, total, done }].
const fulfilled = (d) => d.total >= 1 && d.done === d.total;

export function computeStreak(days, today) {
  const list = days
    .filter((d) => d.total >= 1 && d.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  let best = 0;
  let run = 0;
  for (const d of list) {
    if (fulfilled(d)) {
      run += 1;
      best = Math.max(best, run);
    } else if (d.date !== today) {
      run = 0;
    }
  }

  let current = 0;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const d = list[i];
    if (fulfilled(d)) current += 1;
    else if (d.date === today) continue;
    else break;
  }
  return { current, best };
}
