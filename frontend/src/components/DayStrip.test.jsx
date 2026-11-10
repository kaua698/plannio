import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import DayStrip from './DayStrip.jsx';
import StreakCard from './StreakCard.jsx';

const a = (id, startMinutes, endMinutes, status = 'PENDING') => ({ id, name: id, startMinutes, endMinutes, status, createdAt: id });
const faixa = (props) => render(<DayStrip start={360} end={1380} minutes={860} {...props} />).container;
const pct = (el, prop) => Number.parseFloat(el.style[prop]);

describe('DayStrip', () => {
  test('desenha cada atividade em escala, dentro do horário do dia', () => {
    const c = faixa({ activities: [a('estudar', 840, 930)] });
    const seg = c.querySelector('.strip-seg');
    expect(pct(seg, 'left')).toBeCloseTo(47.06, 1);
    expect(pct(seg, 'width')).toBeCloseTo(8.82, 1);
  });

  test('distingue feita, atual e por vir, e resume o dia em texto', () => {
    const c = faixa({ activities: [a('x', 400, 430, 'DONE'), a('y', 840, 930), a('z', 1000, 1030)] });
    expect([...c.querySelectorAll('.strip-seg')].map((s) => s.className)).toEqual(['strip-seg done', 'strip-seg now', 'strip-seg']);
    expect(screen.getByRole('img', { name: 'Seu dia: 1 de 3 feitas.' })).toBeInTheDocument();
  });

  test('marca a hora atual e some com o marcador fora do horário', () => {
    const c = faixa({ activities: [a('x', 400, 430)] });
    expect(pct(c.querySelector('.strip-now'), 'left')).toBeCloseTo(49.02, 1);
    const fora = render(<DayStrip start={360} end={1380} minutes={100} activities={[a('x', 400, 430)]} />).container;
    expect(fora.querySelector('.strip-now')).toBeNull();
  });

  test('amplia a faixa para atividades fora do horário do dia, em horas cheias', () => {
    const c = faixa({ activities: [a('cedo', 310, 340)] });
    expect(pct(c.querySelector('.strip-seg'), 'left')).toBeCloseTo(((310 - 300) / 1080) * 100, 1);
    expect([...c.querySelectorAll('.strip-ticks span')].map((t) => t.textContent)).toEqual(['05', '09', '13', '17', '23']);
  });

  test('dia sem atividades não mostra a faixa', () => {
    expect(faixa({ activities: [] }).firstChild).toBeNull();
  });
});

describe('StreakCard', () => {
  const streak = { current: 12, best: 19, today: { total: 8, done: 3 } };
  const dia = (date, total, done) => ({ date, total, done, percent: total ? Math.round((done / total) * 100) : null });
  const week = [dia('2026-11-02', 4, 4), dia('2026-11-03', 3, 2), dia('2026-11-04', 8, 3), dia('2026-11-05', 2, 0), dia('2026-11-06', 0, 0), dia('2026-11-07', 0, 0), dia('2026-11-08', 0, 0)];

  test('mostra a maior ofensiva e a semana: só dia completo fica preenchido', () => {
    const { container } = render(<StreakCard streak={streak} week={week} today="2026-11-04" />);
    expect(screen.getByText('Maior: 19')).toBeInTheDocument();
    expect([...container.querySelectorAll('.wd')].map((d) => d.className)).toEqual(['wd full', 'wd', 'wd today', 'wd', 'wd', 'wd', 'wd']);
    expect(container.querySelector('.wd.full')).toHaveAttribute('title', 'Segunda-feira: dia cumprido');
  });
});
