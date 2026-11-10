import { useEffect, useRef } from 'react';

// Pergunta se a mudança vale só para este dia ou para este e os próximos.
export default function ScopeDialog({ action = 'mudança', onChoose, onClose }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="scope-title" onClose={onClose}>
      <h2 id="scope-title">Esta atividade se repete</h2>
      <p className="dlg-text">Aplicar a {action} a:</p>
      <div className="scope-options">
        <button type="button" className="btn" onClick={() => onChoose('this')}>Só este dia</button>
        <button type="button" className="ghost" onClick={() => onChoose('future')}>Este e os próximos</button>
        <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
      </div>
    </dialog>
  );
}
