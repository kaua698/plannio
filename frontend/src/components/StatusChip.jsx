export const STATUS_LABEL = {
  PENDING: '○ Pendente',
  DONE: '✓ Concluída',
  PARTIAL: '◐ Parcial',
  NOT_DONE: '◌ Não realizada',
  POSTPONED: '↷ Adiada',
};

export default function StatusChip({ status }) {
  return <span className={`chip status-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}
