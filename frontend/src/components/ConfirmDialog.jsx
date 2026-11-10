import { useEffect, useRef } from 'react';

// Janela de confirmação com <dialog>, que já cuida do foco e da tecla Esc.
export default function ConfirmDialog({ title, children, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dlg" onClose={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <div className="dlg-text">{children}</div>
      <div className="foot">
        <span />
        <div className="row-gap">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className={danger ? 'btn danger' : 'btn'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
