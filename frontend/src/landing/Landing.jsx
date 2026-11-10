// Monta a landing page: abertura e conteúdo.
// Para personalizar, abra a pasta config/.
import { useEffect, useState } from 'react';
import { ANIMACOES } from './config/personalizar.js';
import './landing.css';
import { ScrollTrigger, canAnimate, startSmoothScroll } from './motion.js';
import PaginaInicial from './PaginaInicial.jsx';
import { Preloader } from './parts.jsx';

const VISTA = 'plannio:intro';

function deveAbrir() {
  if (!ANIMACOES.abertura.ativa || !canAnimate()) return false;
  try { return sessionStorage.getItem(VISTA) !== '1'; } catch { return true; }
}

export default function Landing() {
  const [abertura, setAbertura] = useState(deveAbrir);

  useEffect(() => startSmoothScroll(), []);
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, [abertura]);

  const terminar = () => {
    try { sessionStorage.setItem(VISTA, '1'); } catch { /* navegação privada: só não lembra */ }
    setAbertura(false);
  };

  return (
    <div className="lp">
      {abertura && <Preloader onDone={terminar} />}
      <PaginaInicial pronto={!abertura} />
    </div>
  );
}
