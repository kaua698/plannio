// Janelas abertas a partir das telas. Cada uma é preenchida em sua própria tarefa do plano.
export const DIALOGS = {};

export function registerDialog(type, component) {
  DIALOGS[type] = component;
}
