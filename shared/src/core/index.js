// Ponto único de entrada do núcleo de regras. Importar daqui garante que as repetições
// estejam registradas antes de qualquer leitura da agenda.
export * from './errors.js';
export { createMemoryStore } from './memoryStore.js';
export * from './users.js';
export * from './categories.js';
export {
  copyDay, createActivity, deleteActivity, getActivity, listActivities, listInbox, setStatus, setStep, updateActivity,
} from './activities.js';
export {
  cancelRoutine, createRoutine, ensureOccurrences, getRoutine, listRoutines, sendToInbox, updateRoutine,
} from './routines.js';
export { applyOption, getSuggestions, inboxSuggestions, scheduleInbox } from './reorganization.js';
export { getStreak } from './streakQuery.js';
export { getProgress } from './progressQuery.js';
export { deleteHistory, listHistory } from './history.js';
