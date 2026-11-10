// Peças da landing page. Textos, dados e animações: config/personalizar.js. Aparência: config/personalizar.css.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ANIMACOES, DADOS_EXEMPLO, IMAGENS, LINKS, TEXTOS } from './config/personalizar.js';
import { gsap, useGSAP } from './motion.js';

const { agora, inicioDoDia, fimDoDia, rotina } = DADOS_EXEMPLO;
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const naFaixa = (m) => ((m - inicioDoDia) / (fimDoDia - inicioDoDia)) * 100;
const atual = rotina.findIndex((r) => r.inicio <= agora && agora < r.fim);
const estado = (i) => (i < atual ? 'done' : i === atual ? 'now' : '');

// Símbolo desenhado. A abertura sempre usa este, porque ele é animado traço a traço.
function Simbolo() {
  return (
    <svg className="lp-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="lp-mark-c" cx="12" cy="12" r="9.5" />
      <path className="lp-mark-h" d="M12 6.500V12l3.500 2" />
    </svg>
  );
}

// Logo: imagem, se houver caminho em IMAGENS.logo; senão, o símbolo.
export function Marca() {
  const { caminho, descricao } = IMAGENS.logo;
  return caminho ? <img className="lp-logo-img" src={caminho} alt={descricao} /> : <Simbolo />;
}

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > ANIMACOES.menu.fundoDepoisDe);
      setHidden(y > ANIMACOES.menu.esconderDepoisDe && y > last);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`lp-nav${hidden ? ' is-hidden' : ''}${solid ? ' is-solid' : ''}`}>
      <Link className="lp-brand" to={LINKS.inicio}><Marca /><span>{TEXTOS.marca}</span></Link>
      <nav aria-label="Página">
        {TEXTOS.menu.filter((item) => item.destino !== '#duvidas' || TEXTOS.duvidas.mostrar).map((item) => <a key={item.destino} href={item.destino}>{item.rotulo}</a>)}
      </nav>
      <div className="lp-nav-end">
        <Link className="lp-link" to={LINKS.login}>{TEXTOS.botoes.entrarMenu}</Link>
        <Link className="lp-btn lp-btn-sm" to={LINKS.cadastro}>{TEXTOS.botoes.criarMenu}</Link>
      </div>
    </header>
  );
}

export function Cta() {
  const { comoFunciona, entrar } = TEXTOS.botoes;
  return (
    <div className="lp-actions">
      <a className="lp-btn" href={LINKS.comoFunciona} data-magnetic>{comoFunciona}</a>
      <Link className="lp-btn lp-btn-ghost" to={LINKS.login} data-magnetic>{entrar}</Link>
    </div>
  );
}

export function DayBar() {
  return (
    <div className="lp-day" aria-hidden="true">
      {rotina.map((r, i) => <i key={r.nome} className={estado(i)} style={{ left: `${naFaixa(r.inicio)}%`, width: `${naFaixa(r.fim) - naFaixa(r.inicio)}%` }} />)}
      <u style={{ left: `${naFaixa(agora)}%` }} />
    </div>
  );
}

function Rows() {
  return (
    <ul className="lp-rows is-small">
      {rotina.map((r, i) => (
        <li key={r.nome} className={estado(i)}>
          <em />
          <span>{hm(r.inicio)}</span>
          <b>{r.nome}</b>
          <small>{i === atual ? 'Agora' : r.fixo ? 'Fixo' : r.categoria}</small>
        </li>
      ))}
    </ul>
  );
}

export function Meter({ rotulo, valor, porcentagem }) {
  return (
    <div className="lp-meter">
      <div><span>{rotulo}</span><span className="lp-mono">{valor}</span></div>
      <p><i style={{ width: `${porcentagem}%` }} /></p>
    </div>
  );
}

export function Squares({ total, acesos }) {
  return <div className="lp-squares">{Array.from({ length: total }, (_, i) => <i key={i} className={i < acesos ? 'on' : ''} />)}</div>;
}

export function AppMock() {
  const r = rotina[atual];
  const { dias, semanaTotal, semanaAcesos } = DADOS_EXEMPLO.ofensiva;
  return (
    <div className="mk" aria-hidden="true">
      <aside className="mk-side">
        <span className="lp-brand"><Marca /><span>{TEXTOS.marca}</span></span>
        {DADOS_EXEMPLO.menuDoApp.map((m, i) => <span key={m} className={i === 0 ? 'on' : ''}>{m}</span>)}
      </aside>
      <div className="mk-main">
        <div className="mk-hero">
          <div><small>Agora, das {hm(r.inicio)} às {hm(r.fim)}</small><b>{r.nome}</b></div>
          <span className="lp-clock">{hm(r.fim - agora)}</span>
        </div>
        <DayBar />
        <div className="mk-cols">
          <Rows />
          <div className="mk-cards">
            <div className="mk-card"><small>Ofensiva</small><b className="lp-num">{dias} <i>dias</i></b><Squares total={semanaTotal} acesos={semanaAcesos} /></div>
            <div className="mk-card"><small>Esta semana</small>{DADOS_EXEMPLO.metas.map((m) => <Meter key={m.rotulo} {...m} />)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Options() {
  return (
    <div className="lp-opts" aria-hidden="true">
      <small>{TEXTOS.opcoes.titulo}</small>
      {TEXTOS.opcoes.itens.map((o, i) => (
        <div key={o.horario} className={`lp-opt${i === 0 ? ' on' : ''}`}><b>{o.horario}</b><span>{o.detalhe}</span></div>
      ))}
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState(TEXTOS.duvidas.perguntaAberta);
  return (
    <div className="lp-faq">
      {TEXTOS.duvidas.itens.map(({ pergunta, resposta }, i) => (
        <div key={pergunta} className={`lp-q${open === i ? ' open' : ''}`} data-reveal>
          <h3><button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{pergunta}<span aria-hidden="true">+</span></button></h3>
          <div className="lp-a"><p>{resposta}</p></div>
        </div>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="lp-foot">
      <span className="lp-brand"><Marca /><span>{TEXTOS.marca}</span></span>
      <span>{TEXTOS.slogan}</span>
      <div>
        <Link to={LINKS.login}>{TEXTOS.botoes.entrarMenu}</Link>
        <Link to={LINKS.cadastro}>{TEXTOS.botoes.criarMenu}</Link>
        <Link to={LINKS.privacidade}>{TEXTOS.rodape.privacidade}</Link>
        <Link to={LINKS.termos}>{TEXTOS.rodape.termos}</Link>
        {LINKS.contato && <a href={LINKS.contato}>{TEXTOS.rodape.contato}</a>}
      </div>
    </footer>
  );
}

// Abertura curta, uma vez por visita: o relógio se desenha, as horas passam e a cortina sobe.
export function Preloader({ onDone }) {
  const root = useRef(null);
  const a = ANIMACOES.abertura;
  useGSAP(() => {
    const t = { m: a.horaInicial };
    const out = root.current.querySelector('.lp-pre-time');
    gsap.timeline({ onComplete: onDone })
      .from('.lp-pre .lp-mark-c', { drawSVG: '0%', duration: a.duracaoCirculo, ease: 'power2.inOut' }, 0)
      .from('.lp-pre .lp-mark-h', { drawSVG: '0%', duration: a.duracaoPonteiros, ease: 'power2.inOut' }, a.atrasoPonteiros)
      .to(t, { m: a.horaFinal, duration: a.duracaoRelogio, ease: 'power2.inOut', onUpdate: () => { out.textContent = hm(Math.round(t.m / 10) * 10); } }, 0)
      .to('.lp-pre-bar', { scaleX: 1, duration: a.duracaoRelogio, ease: 'power2.inOut' }, 0)
      .to('.lp-pre-in', { opacity: 0, y: -20, duration: a.duracaoSaida, ease: 'power2.in' }, '+=0.08')
      .to('.lp-pre-col', { yPercent: -100, duration: a.duracaoCortina, stagger: { each: a.intervaloCortina, from: 'center' }, ease: 'expo.inOut' }, '-=0.08');
  }, { scope: root });
  return (
    <div ref={root} className="lp-pre" aria-hidden="true">
      <div className="lp-pre-cols" style={{ gridTemplateColumns: `repeat(${a.colunas}, 1fr)` }}>
        {Array.from({ length: a.colunas }, (_, i) => <span key={i} className="lp-pre-col" />)}
      </div>
      <div className="lp-pre-in">
        <Simbolo />
        <span className="lp-pre-time">{hm(a.horaInicial)}</span>
        <p><i className="lp-pre-bar" /></p>
      </div>
    </div>
  );
}

// Capturas reais do aplicativo, em abas.
export function Demonstracao() {
  const { telas, largura, altura } = IMAGENS.demonstracao;
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef([]);
  const mover = (e) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!passo) return;
    const proxima = (ativa + passo + telas.length) % telas.length;
    setAtiva(proxima);
    botoes.current[proxima]?.focus();
  };
  const tela = telas[ativa];
  return (
    <div className="lp-demo" data-reveal>
      <div className="lp-demo-abas" role="tablist" aria-label="Telas do Plannio" onKeyDown={mover}>
        {telas.map((t, i) => (
          <button key={t.rotulo} ref={(el) => { botoes.current[i] = el; }} type="button" role="tab" id={`aba-${i}`} aria-selected={i === ativa} aria-controls="painel-demo" tabIndex={i === ativa ? 0 : -1} onClick={() => setAtiva(i)}>{t.rotulo}</button>
        ))}
      </div>
      <div role="tabpanel" id="painel-demo" aria-labelledby={`aba-${ativa}`}>
        <p className="lp-demo-texto">{tela.texto}</p>
        <div className="lp-demo-tela" tabIndex={0}>
          <img key={tela.caminho} src={tela.caminho} alt={tela.descricao} width={largura} height={altura} loading="lazy" />
        </div>
      </div>
      <p className="lp-demo-nota">{TEXTOS.demonstracao.nota}</p>
    </div>
  );
}
