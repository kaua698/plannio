import * as core from './index.js';

// Rotas de dados da API (todas exigem sessão). Usadas pelo servidor Express e pela demonstração no navegador,
// para que as duas respondam igual. Conta e sessão ficam fora, porque cada lado guarda a sessão de um jeito.
const toInt = (v) => (v === undefined || v === '' ? undefined : Number(v));
const none = async (p) => { await p; return null; };
const body = (b) => b ?? {};

export const API_ROUTES = [
  ['GET', '/categories', ({ store, uid }) => core.listCategories(store, uid)],
  ['POST', '/categories', ({ store, uid, b }) => core.createCategory(store, uid, b), 201],
  ['PATCH', '/categories/:id', ({ store, uid, p, b }) => core.updateCategory(store, uid, p.id, b)],
  ['DELETE', '/categories/:id', ({ store, uid, p }) => none(core.deleteCategory(store, uid, p.id)), 204],

  ['GET', '/activities', ({ store, uid, q }) => core.listActivities(store, uid, q)],
  ['POST', '/activities', ({ store, uid, b }) => core.createActivity(store, uid, b, b.now), 201],
  ['GET', '/activities/:id', ({ store, uid, p }) => core.getActivity(store, uid, p.id)],
  ['PATCH', '/activities/:id', ({ store, uid, p, b }) => core.updateActivity(store, uid, p.id, b, b.now)],
  ['DELETE', '/activities/:id', ({ store, uid, p, b }) => none(core.deleteActivity(store, uid, p.id, b, b.now)), 204],
  ['POST', '/activities/:id/status', ({ store, uid, p, b }) => core.setStatus(store, uid, p.id, b)],
  ['PATCH', '/activities/:id/steps/:stepId', ({ store, uid, p, b }) => core.setStep(store, uid, p.id, p.stepId, b)],
  ['POST', '/activities/:id/inbox', ({ store, uid, p, b }) => core.sendToInbox(store, uid, p.id, b.now)],
  ['POST', '/activities/:id/suggestions', ({ store, uid, p, b }) => core.getSuggestions(store, uid, p.id, b)],
  ['POST', '/activities/:id/apply', ({ store, uid, p, b }) => core.applyOption(store, uid, p.id, b)],

  ['GET', '/inbox', ({ store, uid }) => core.listInbox(store, uid)],
  ['POST', '/inbox/:id/suggestions', ({ store, uid, p, b }) => core.inboxSuggestions(store, uid, p.id, b)],
  ['POST', '/inbox/:id/schedule', ({ store, uid, p, b }) => core.scheduleInbox(store, uid, p.id, b)],
  ['POST', '/days/:date/copy', ({ store, uid, p, b }) => core.copyDay(store, uid, p.date, b, b.now)],

  ['GET', '/routines', ({ store, uid }) => core.listRoutines(store, uid)],
  ['POST', '/routines', ({ store, uid, b }) => core.createRoutine(store, uid, b, b.now), 201],
  ['GET', '/routines/:id', ({ store, uid, p }) => core.getRoutine(store, uid, p.id)],
  ['PATCH', '/routines/:id', ({ store, uid, p, b }) => core.updateRoutine(store, uid, p.id, b, b.now)],
  ['POST', '/routines/:id/cancel', ({ store, uid, p, b }) => core.cancelRoutine(store, uid, p.id, b, b.now)],

  ['GET', '/streak', ({ store, uid, q }) => core.getStreak(store, uid, q)],
  ['GET', '/progress', ({ store, uid, q }) => core.getProgress(store, uid, { ...q, minutes: toInt(q.minutes) })],
  ['GET', '/history', ({ store, uid, q }) => core.listHistory(store, uid, q)],
  ['DELETE', '/history/:id', ({ store, uid, p }) => none(core.deleteHistory(store, uid, p.id)), 204],
].map(([method, path, run, status = 200]) => ({
  method,
  path,
  status,
  // query vem como texto; só campos simples entram, para não aceitar arrays ou objetos vindos da URL.
  handler: ({ store, uid, params = {}, query = {}, body: b }) => run({
    store, uid, p: params, b: body(b), q: Object.fromEntries(Object.entries(query).filter(([, v]) => typeof v === 'string' || typeof v === 'number')),
  }),
}));
