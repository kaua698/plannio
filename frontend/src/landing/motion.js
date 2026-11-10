// Motor das animações. Para mudar duração, velocidade ou intensidade, use config/personalizar.js.
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { useEffect } from 'react';
import { ANIMACOES } from './config/personalizar.js';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin);
gsap.defaults({ ease: ANIMACOES.curvaPadrao });

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const MOTION = '(prefers-reduced-motion: no-preference)';
export const DESKTOP = '(hover: hover) and (pointer: fine)';
export const canAnimate = () => window.matchMedia(MOTION).matches;

let lenis = null;

export function startSmoothScroll() {
  if (lenis || !canAnimate() || !ANIMACOES.rolagem.suave) return () => {};
  lenis = new Lenis({ lerp: ANIMACOES.rolagem.suavidade, anchors: { offset: ANIMACOES.rolagem.margemDosLinks } });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

// Entradas marcadas no HTML: data-scramble, data-lines e data-reveal.
export function useReveal(scope, ready) {
  useGSAP(() => {
    if (!ready) return undefined;
    const { rotulos, titulosDeSecao, entradaAoRolar } = ANIMACOES;
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const root = scope.current;
      root.querySelectorAll('[data-scramble]').forEach((el) => {
        gsap.to(el, { scrambleText: { text: '{original}', chars: 'upperCase', speed: rotulos.velocidade }, duration: rotulos.duracao, scrollTrigger: { trigger: el, start: rotulos.gatilho, once: true } });
      });
      root.querySelectorAll('[data-lines]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'lp-linha',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: titulosDeSecao.deslocamento, duration: titulosDeSecao.duracao, stagger: titulosDeSecao.intervaloLinhas, ease: titulosDeSecao.curva, scrollTrigger: { trigger: el, start: titulosDeSecao.gatilho, once: true } }),
        });
      });
      const blocks = root.querySelectorAll('[data-reveal]');
      if (blocks.length) {
        gsap.set(blocks, { y: entradaAoRolar.deslocamento, opacity: 0 });
        ScrollTrigger.batch(blocks, { start: entradaAoRolar.gatilho, once: true, onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: entradaAoRolar.duracao, stagger: entradaAoRolar.intervalo, overwrite: true }) });
      }
    });
    return () => mm.revert();
  }, { scope, dependencies: [ready], revertOnUpdate: true });
}

// Botões que puxam um pouco na direção do cursor, só no computador.
export function useMagnetic(scope) {
  useEffect(() => {
    const root = scope.current;
    const { forcaMagnetica, duracaoMagnetica } = ANIMACOES.botoes;
    if (!root || !forcaMagnetica || !canAnimate() || !window.matchMedia(DESKTOP).matches) return undefined;
    const offs = [...root.querySelectorAll('[data-magnetic]')].map((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: duracaoMagnetica });
      const yTo = gsap.quickTo(el, 'y', { duration: duracaoMagnetica });
      const move = (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * forcaMagnetica);
        yTo((e.clientY - (r.top + r.height / 2)) * forcaMagnetica);
      };
      const leave = () => { xTo(0); yTo(0); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
    });
    return () => offs.forEach((off) => off());
  }, [scope]);
}
