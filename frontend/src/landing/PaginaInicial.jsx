// Conteúdo e animações da landing page.
// Textos e valores das animações: config/personalizar.js. Aparência: config/personalizar.css.
import { useRef } from 'react';
import { ANIMACOES, DADOS_EXEMPLO, IMAGENS, TEXTOS } from './config/personalizar.js';
import { DESKTOP, MOTION, SplitText, gsap, useGSAP, useMagnetic, useReveal } from './motion.js';
import { AppMock, Cta, DayBar, Demonstracao, Faq, Footer, Meter, Nav, Options, Squares } from './parts.jsx';

const { hero, demonstracao, comoFunciona, recursos, duvidas } = TEXTOS;
const { ofensiva, metas, inbox, diasDaSemana } = DADOS_EXEMPLO;

// Ilustração de cada card de recursos. O card escolhe a sua em TEXTOS.recursos.cards.
const PECAS = {
  opcoes: () => <Options />,
  quadrados: () => <Squares total={ofensiva.quadradosTotal} acesos={ofensiva.quadradosAcesos} />,
  metas: () => metas.map((m) => <Meter key={m.rotulo} {...m} />),
  dias: () => <div className="lp-dias" aria-hidden="true">{diasDaSemana.map((d, i) => <i key={i} className={d.ativo ? 'on' : ''}>{d.letra}</i>)}</div>,
  faixa: () => <DayBar />,
  inbox: () => <ul className="lp-inbox" aria-hidden="true">{inbox.map((item) => <li key={item}>{item}</li>)}</ul>,
};

export default function PaginaInicial({ pronto }) {
  const root = useRef(null);
  useMagnetic(root);
  useReveal(root, pronto);

  useGSAP(() => {
    if (!pronto) return undefined;
    const { titulo, subtitulo, botoes, appEntrada, appInclinado, flutuantes, cards } = ANIMACOES;
    const mm = gsap.matchMedia();

    mm.add(MOTION, () => {
      // Entrada do topo da página, em sequência.
      const tl = gsap.timeline();
      SplitText.create('.lp-hero-titulo', {
        type: 'lines,words',
        mask: 'lines',
        linesClass: 'lp-linha',
        // A máscara só existe durante a entrada: depois, o título volta a ser texto normal e quebra linha sozinho.
        onSplit: (self) => { tl.from(self.lines, { yPercent: titulo.deslocamento, duration: titulo.duracao, stagger: titulo.intervaloLinhas, ease: titulo.curva, onComplete: () => self.revert() }, titulo.atraso); },
      });
      tl.from('.lp-hero-lead', { y: subtitulo.deslocamento, opacity: 0, filter: `blur(${subtitulo.desfoque}px)`, duration: subtitulo.duracao }, subtitulo.inicio)
        .from('.lp-hero .lp-actions > *', { y: botoes.deslocamento, opacity: 0, duration: botoes.duracao, stagger: botoes.intervalo }, botoes.inicio)
        .from('.lp-palco .mk', { yPercent: appEntrada.deslocamento, opacity: 0, duration: appEntrada.duracao, ease: appEntrada.curva }, appEntrada.inicio)
        .from('.lp-flutuante', { y: flutuantes.deslocamento, opacity: 0, duration: flutuantes.duracao, stagger: flutuantes.intervalo, ease: 'expo.out' }, flutuantes.inicio);

      // Ao rolar: a tela do app se endireita e os cards flutuantes sobem.
      gsap.fromTo('.lp-palco .mk', { rotateX: appInclinado.inclinacao, scale: appInclinado.escalaInicial }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.lp-palco', start: appInclinado.inicioRolagem, end: appInclinado.fimRolagem, scrub: appInclinado.suavizacao } });
      gsap.to('.lp-flutuante-ofensiva', { yPercent: flutuantes.subidaOfensiva, ease: 'none', scrollTrigger: { trigger: '.lp-palco', start: 'top 60%', end: 'bottom top', scrub: 1 } });
      gsap.to('.lp-flutuante-inbox', { yPercent: flutuantes.subidaInbox, ease: 'none', scrollTrigger: { trigger: '.lp-palco', start: 'top 60%', end: 'bottom top', scrub: 1 } });

      // Detalhes das seções.
      gsap.utils.toArray('.lp-card .lp-meter i').forEach((el) => {
        gsap.from(el, { width: 0, duration: cards.duracaoBarras, ease: 'expo.out', scrollTrigger: { trigger: el, start: cards.gatilho, once: true } });
      });
      gsap.from('.lp-card .lp-squares i.on', { scale: 0, duration: cards.duracaoQuadrados, stagger: cards.intervaloQuadrados, ease: 'back.out(2)', scrollTrigger: { trigger: '.lp-card .lp-squares', start: cards.gatilho, once: true } });
    });

    // Só no computador: os cards flutuantes seguem o mouse.
    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      const layers = gsap.utils.toArray('[data-follow]', root.current).map((el) => ({
        forca: Number(el.dataset.follow),
        x: gsap.quickTo(el, 'x', { duration: flutuantes.duracaoMouse }),
        y: gsap.quickTo(el, 'y', { duration: flutuantes.duracaoMouse }),
      }));
      const move = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        layers.forEach((l) => { l.x(nx * flutuantes.alcanceMouseX * l.forca); l.y(ny * flutuantes.alcanceMouseY * l.forca); });
      };
      window.addEventListener('pointermove', move);
      return () => window.removeEventListener('pointermove', move);
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [pronto], revertOnUpdate: true });

  return (
    <div ref={root}>
      <Nav />
      <main>
        {/* Topo da página */}
        <section className="lp-hero">
          {IMAGENS.fundoHero.caminho && <img className="lp-hero-img" src={IMAGENS.fundoHero.caminho} alt="" />}
          <h1 className="lp-hero-titulo">{hero.titulo}</h1>
          <p className="lp-hero-lead">{hero.subtitulo}</p>
          <Cta />
          <div className="lp-palco">
            <AppMock />
            <div className="lp-flutuante lp-flutuante-ofensiva" data-follow={ANIMACOES.flutuantes.forcaMouseOfensiva} aria-hidden="true"><small>Ofensiva</small><b className="lp-num">{ofensiva.dias} <i>dias</i></b></div>
            <div className="lp-flutuante lp-flutuante-inbox" data-follow={ANIMACOES.flutuantes.forcaMouseInbox} aria-hidden="true"><small>Inbox</small>{inbox.map((item) => <span key={item}>{item}</span>)}</div>
          </div>
        </section>

        {/* Passo a passo */}
        <section className="lp-sec" id="como">
          <p className="lp-label lp-mono" data-scramble>{comoFunciona.rotulo}</p>
          <h2 className="lp-h2" data-lines>{comoFunciona.titulo}</h2>
          <div className="lp-passos">
            {comoFunciona.passos.map((p, i) => <article key={p.titulo} data-reveal><span className="lp-mono">{i + 1}</span><h3>{p.titulo}</h3><p>{p.texto}</p></article>)}
          </div>
        </section>

        {/* Cada área do aplicativo */}
        <section className="lp-sec" id="areas">
          <p className="lp-label lp-mono" data-scramble>{demonstracao.rotulo}</p>
          <h2 className="lp-h2" data-lines>{demonstracao.titulo}</h2>
          <Demonstracao />
        </section>

        {/* Regras */}
        <section className="lp-sec" id="regras">
          <p className="lp-label lp-mono" data-scramble>{recursos.rotulo}</p>
          <h2 className="lp-h2" data-lines>{recursos.titulo}</h2>
          <div className="lp-grade">
            {recursos.cards.map((c) => (
              <article key={c.titulo} className={`lp-card${c.largo ? ' lp-card-largo' : ''}`} data-reveal>
                <h3>{c.titulo}</h3>
                <p>{c.texto}</p>
                {c.peca && PECAS[c.peca]()}
              </article>
            ))}
          </div>
        </section>

        {/* Dúvidas */}
        {duvidas.mostrar && (
          <section className="lp-sec" id="duvidas">
            <h2 className="lp-h2" data-lines>{duvidas.titulo}</h2>
            <Faq />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
