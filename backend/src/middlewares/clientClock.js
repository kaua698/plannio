import { invalid } from '@plannio/shared/core/errors';
import { isDate } from '@plannio/shared/dates';

const MESSAGE = 'A data do seu aparelho parece errada. Ajuste e tente de novo.';
const MAX_DIFF_MS = 2 * 24 * 60 * 60 * 1000;

// O navegador decide qual é o dia, por causa do fuso. Esta margem só impede datas absurdas,
// que fariam o servidor gerar milhares de ocorrências de repetições.
export const clientClock = (clock) => (req, res, next) => {
  const sent = [req.body?.now?.date, req.query?.today, req.query?.nowDate];
  const wrong = sent.some((d) => isDate(d) && Math.abs(Date.parse(`${d}T12:00:00Z`) - clock()) > MAX_DIFF_MS);
  next(wrong ? invalid({ now: MESSAGE }, MESSAGE) : undefined);
};
