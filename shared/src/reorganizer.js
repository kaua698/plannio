import { addDays } from './dates.js';

// Regras da seção 7 da especificação: sugere até 3 novos horários para uma atividade.
const GRID = 30;
const MAX_OPTIONS = 3;
const MAX_MOVES = 2;
const DAYS_AHEAD = 7;
const OCCUPYING = new Set(['PENDING', 'DONE', 'PARTIAL']);

const ceilGrid = (m) => Math.ceil(m / GRID) * GRID;
const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

export const occupies = (a) => Boolean(a.date) && a.startMinutes != null && OCCUPYING.has(a.status) && a.exceptionKind !== 'SKIPPED';

const durationOf = (target) => (target.startMinutes != null && target.endMinutes != null
  ? target.endMinutes - target.startMinutes
  : target.estimatedMinutes || 30);

function context({ target, activities, now, planning }) {
  const byDate = new Map();
  for (const a of activities) {
    if (a.id === target.id || !occupies(a)) continue;
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date).push(a);
  }
  for (const list of byDate.values()) list.sort((x, y) => x.startMinutes - y.startMinutes);
  const dayActs = (date) => byDate.get(date) || [];

  const earliest = (date) => {
    if (date === now.date) return Math.max(planning.start, ceilGrid(now.minutes));
    const acts = dayActs(date);
    const first = acts.length ? Math.min(...acts.map((a) => a.startMinutes)) : planning.start;
    return ceilGrid(Math.max(planning.start, first));
  };

  const isFree = (date, s, e, extra = []) => dayActs(date).every((a) => !overlaps(s, e, a.startMinutes, a.endMinutes))
    && extra.every((b) => b.date !== date || !overlaps(s, e, b.start, b.end));

  const isTargetSlot = (date, s) => target.date === date && target.startMinutes === s;

  return { dayActs, earliest, isFree, isTargetSlot };
}

function firstFree(ctx, date, d, planning, from, taken = []) {
  for (let s = Math.max(from, ctx.earliest(date)); s + d <= planning.end; s += GRID) {
    if (ctx.isTargetSlot(date, s)) continue;
    if (ctx.isFree(date, s, s + d, taken)) return s;
  }
  return null;
}

function tryMove(ctx, date, s, d, earliest) {
  const movable = (a) => a.status === 'PENDING' && !a.isFixed && a.priority !== 'HIGH' && a.startMinutes >= earliest;
  const acts = ctx.dayActs(date);
  const hit = acts.filter((a) => overlaps(s, s + d, a.startMinutes, a.endMinutes));
  if (!hit.length || !hit.every(movable)) return null;

  const placed = [{ start: s, end: s + d }];
  const queue = [...hit];
  const queued = new Set(hit.map((a) => a.id));
  const moves = [];
  let prevEnd = s + d;
  while (queue.length) {
    const a = queue.shift();
    const dur = a.endMinutes - a.startMinutes;
    let c = ceilGrid(prevEnd);
    for (;;) {
      if (c + dur > ctx.planningEnd) return null;
      const block = placed.find((p) => overlaps(c, c + dur, p.start, p.end));
      if (block) { c = ceilGrid(block.end); continue; }
      const fixed = acts.find((o) => !queued.has(o.id) && !movable(o) && overlaps(c, c + dur, o.startMinutes, o.endMinutes));
      if (fixed) { c = ceilGrid(fixed.endMinutes); continue; }
      break;
    }
    for (const o of acts) {
      if (!queued.has(o.id) && movable(o) && overlaps(c, c + dur, o.startMinutes, o.endMinutes)) {
        queued.add(o.id);
        queue.push(o);
      }
    }
    if (queued.size > MAX_MOVES || c <= a.startMinutes) return null;
    placed.push({ start: c, end: c + dur });
    moves.push({ activityId: a.id, fromStart: a.startMinutes, fromEnd: a.endMinutes, toStart: c, toEnd: c + dur });
    prevEnd = c + dur;
  }
  return moves;
}

function nextDaysSlot(ctx, target, base, d, planning, skipDates) {
  for (let i = 1; i <= DAYS_AHEAD; i += 1) {
    const date = addDays(base, i);
    if (skipDates.has(date)) continue;
    const s = target.startMinutes;
    if (s != null && s >= ctx.earliest(date) && s + d <= planning.end && ctx.isFree(date, s, s + d)) return { date, start: s };
  }
  for (let i = 1; i <= DAYS_AHEAD; i += 1) {
    const date = addDays(base, i);
    if (skipDates.has(date)) continue;
    const s = firstFree(ctx, date, d, planning, planning.start);
    if (s != null) return { date, start: s };
  }
  return null;
}

export function suggest({ target, activities, now, planning, allowMoves = true }) {
  const d = durationOf(target);
  if (d > planning.end - planning.start) return [];
  const ctx = context({ target, activities, now, planning });
  ctx.planningEnd = planning.end;
  const base = target.date && target.date > now.date ? target.date : now.date;
  const options = [];
  const option = (kind, date, start, moves = []) => ({ kind, date, start, end: start + d, moves });

  const s1 = firstFree(ctx, base, d, planning, planning.start);
  if (s1 != null) options.push(option('FREE_SAME_DAY', base, s1));

  if (allowMoves) {
    const earliest = ctx.earliest(base);
    for (let s = earliest; s + d <= planning.end; s += GRID) {
      if (ctx.isTargetSlot(base, s)) continue;
      const moves = tryMove(ctx, base, s, d, earliest);
      if (moves) { options.push(option('MOVE_SAME_DAY', base, s, moves)); break; }
    }
  }

  const usedDays = new Set();
  const n3 = nextDaysSlot(ctx, target, base, d, planning, usedDays);
  if (n3) { options.push(option('NEXT_DAYS', n3.date, n3.start)); usedDays.add(n3.date); }

  while (options.length < MAX_OPTIONS) {
    const more = nextDaysSlot(ctx, target, base, d, planning, usedDays);
    if (!more) break;
    options.push(option('NEXT_DAYS', more.date, more.start));
    usedDays.add(more.date);
  }
  while (options.length < MAX_OPTIONS) {
    const taken = options.filter((o) => o.date === base).map((o) => ({ date: o.date, start: o.start, end: o.end }));
    const s = firstFree(ctx, base, d, planning, planning.start, taken);
    if (s == null) break;
    options.push(option('FREE_SAME_DAY', base, s));
  }
  return options.slice(0, MAX_OPTIONS);
}

// Confere, no momento de aplicar, se a opção ainda é válida com a agenda atual.
export function validateOption({ target, activities, option, now, planning }) {
  const d = durationOf(target);
  if (option.end - option.start !== d || option.start < planning.start || option.end > planning.end) return false;
  if (option.date < now.date || (option.date === now.date && option.start < now.minutes - GRID)) return false;
  const byId = new Map(activities.map((a) => [a.id, a]));
  const after = new Map();
  for (const m of option.moves || []) {
    const a = byId.get(m.activityId);
    if (!a || a.id === target.id || a.date !== option.date || a.isFixed || a.status !== 'PENDING' || a.priority === 'HIGH') return false;
    if (a.startMinutes !== m.fromStart || a.endMinutes !== m.fromEnd) return false;
    if (m.toStart <= m.fromStart || m.toEnd - m.toStart !== a.endMinutes - a.startMinutes || m.toEnd > planning.end) return false;
    after.set(a.id, { start: m.toStart, end: m.toEnd });
  }
  const blocks = [{ start: option.start, end: option.end }];
  for (const a of activities) {
    if (a.id === target.id || !occupies(a) || a.date !== option.date) continue;
    blocks.push(after.get(a.id) || { start: a.startMinutes, end: a.endMinutes });
  }
  blocks.sort((x, y) => x.start - y.start);
  for (let i = 1; i < blocks.length; i += 1) if (blocks[i].start < blocks[i - 1].end) return false;
  return true;
}
