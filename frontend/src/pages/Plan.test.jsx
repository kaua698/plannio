import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App.jsx';
import { api } from '../services/api.js';
import { freeSlots } from './Plan.jsx';

const HOJE = '2026-11-04';
const AMANHA = '2026-11-05';
const now = { date: HOJE, minutes: 600 };
let user;

const abre = () => render(<MemoryRouter initialEntries={['/planejar']}><App /></MemoryRouter>);
const cria = (name, date, s, e, extra = {}) => api('/activities', { method: 'POST', body: { name, date, startMinutes: s, endMinutes: e, now, ...extra } });
const dia = (date = AMANHA) => api('/activities', { query: { from: date, to: date, nowDate: HOJE } });
const form = () => screen.getByRole('form', { name: 'O que vai fazer?' });
const hora = (label, value) => fireEvent.change(within(form()).getByLabelText(label), { target: { value } });

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
});

describe('freeSlots', () => {
  test('só intervalos de 30 minutos ou mais, dentro do horário do dia', () => {
    const acts = [{ startMinutes: 390, endMinutes: 420, status: 'PENDING' }, { startMinutes: 440, endMinutes: 720, status: 'PENDING' }];
    expect(freeSlots(acts, { start: 360, end: 780 })).toEqual([{ start: 360, end: 390 }, { start: 720, end: 780 }]);
  });
});

describe('tela Planejar', () => {
  test('o formulário respeita os limites de tamanho e de etapas', async () => {
    const item = { name: 'Ler', date: AMANHA, startMinutes: 600, endMinutes: 630, steps: Array.from({ length: 30 }, (_, i) => ({ text: `Etapa ${i}` })) };
    render(<MemoryRouter initialEntries={[{ pathname: '/planejar', state: { date: AMANHA, item } }]}><App /></MemoryRouter>);
    const f = await screen.findByRole('form', { name: 'O que vai fazer?' });
    expect(within(f).getByLabelText('Nome')).toHaveAttribute('maxlength', '120');
    expect(within(f).getByLabelText('Nova etapa')).toBeDisabled();
    expect(within(f).getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    expect(within(f).getByText('Limite de 30 etapas.')).toBeInTheDocument();
  });

  test('abre no dia seguinte a hoje e navega entre semanas', async () => {
    abre();
    expect(await screen.findByRole('heading', { name: 'Quinta, 5 de novembro' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima semana' }));
    expect(screen.getByRole('button', { name: /Seg 9/ })).toBeInTheDocument();
  });

  test('clicar em um horário livre preenche início e 30 minutos; salvar mostra no dia (CA05)', async () => {
    await cria('Acordar', AMANHA, 390, 420);
    abre();
    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 07:00' }));
    expect(within(form()).getByLabelText('Início')).toHaveValue('07:00');
    expect(within(form()).getByLabelText('Término')).toHaveValue('07:30');
    await user.type(within(form()).getByLabelText('Nome'), 'Café da manhã');
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    expect(await screen.findByRole('button', { name: /Café da manhã/ })).toBeInTheDocument();
    expect((await dia()).map((a) => a.name)).toEqual(['Acordar', 'Café da manhã']);
  });

  test('erros aparecem junto ao campo, sem apagar o digitado (E6)', async () => {
    abre();
    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 06:00' }));
    hora('Término', '05:00');
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    expect(await within(form()).findByText('Informe o nome da atividade.')).toBeInTheDocument();
    expect(within(form()).getByText('O término precisa ser depois do início.')).toBeInTheDocument();
    expect(within(form()).getByLabelText('Término')).toHaveValue('05:00');
  });

  test('sobreposição mostra o aviso e permite manter', async () => {
    await cria('Acordar', AMANHA, 390, 420);
    abre();
    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 06:00' }));
    await user.type(within(form()).getByLabelText('Nome'), 'Meditar');
    hora('Início', '06:45');
    hora('Término', '07:15');
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    expect(await within(form()).findByText('Este horário se sobrepõe a outra atividade. Deseja manter assim?')).toBeInTheDocument();
    await user.click(within(form()).getByRole('button', { name: 'Manter assim' }));
    await vi.waitFor(async () => expect((await dia()).map((a) => a.name)).toContain('Meditar'));
  });

  test('“Dias úteis” cria uma repetição, e “Escolher dias” envia os dias marcados', async () => {
    abre();
    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 06:00' }));
    await user.type(within(form()).getByLabelText('Nome'), 'Acordar');
    await user.click(within(form()).getByRole('radio', { name: 'Dias úteis' }));
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    await vi.waitFor(async () => expect((await api('/routines')).map((r) => r.frequency)).toEqual(['WEEKDAYS']));

    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 06:30' }));
    await user.type(within(form()).getByLabelText('Nome'), 'Correr');
    await user.click(within(form()).getByRole('radio', { name: 'Escolher dias' }));
    await user.click(within(form()).getByRole('checkbox', { name: 'Seg' }));
    await user.click(within(form()).getByRole('checkbox', { name: 'Qua' }));
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    await vi.waitFor(async () => expect((await api('/routines')).find((r) => r.name === 'Correr')).toMatchObject({ frequency: 'SPECIFIC_DAYS', weekdays: [1, 3] }));
  });

  test('uma atividade avulsa vira a primeira ocorrência ao escolher repetir, sem duplicar o dia', async () => {
    await cria('Estudar', AMANHA, 840, 930);
    abre();
    await user.click(await screen.findByRole('button', { name: /Estudar/ }));
    await user.click(within(form()).getByRole('radio', { name: 'Todos os dias' }));
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    await vi.waitFor(async () => expect(await api('/routines')).toHaveLength(1));
    expect((await dia()).filter((a) => a.name === 'Estudar')).toHaveLength(1);
  });

  test('em uma ocorrência, mudar o nome pergunta o escopo; mudar a regra não pergunta', async () => {
    await api('/routines', { method: 'POST', body: { name: 'Ler', startMinutes: 1200, endMinutes: 1230, frequency: 'DAILY', startDate: HOJE, now } });
    abre();
    await user.click(await screen.findByRole('button', { name: /Ler/ }));
    const nome = within(form()).getByLabelText('Nome');
    await user.clear(nome);
    await user.type(nome, 'Ler um capítulo');
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    await user.click(await screen.findByRole('button', { name: 'Só este dia' }));
    await vi.waitFor(async () => expect((await dia()).map((a) => a.name)).toEqual(['Ler um capítulo']));
    expect((await dia('2026-11-06')).map((a) => a.name)).toEqual(['Ler']);

    await user.click(screen.getByRole('button', { name: /Ler um capítulo/ }));
    await user.click(within(form()).getByRole('radio', { name: 'Dias úteis' }));
    await user.click(within(form()).getByRole('button', { name: 'Salvar no dia' }));
    expect(screen.queryByRole('button', { name: 'Só este dia' })).not.toBeInTheDocument();
    await vi.waitFor(async () => expect((await api('/routines')).map((r) => r.frequency)).toContain('WEEKDAYS'));
  });

  test('“Mais opções” começa recolhida, com prioridade e descrição', async () => {
    abre();
    await user.click(await screen.findByRole('button', { name: '+ O que vai fazer? às 06:00' }));
    expect(within(form()).getByLabelText('Prioridade')).not.toBeVisible();
    await user.click(within(form()).getByText('Mais opções'));
    expect(within(form()).getByLabelText('Prioridade')).toBeVisible();
    expect(within(form()).getByLabelText('Descrição')).toBeVisible();
  });

  test('copiar de outro dia informa o que foi copiado e o que ficou de fora', async () => {
    await cria('Acordar', HOJE, 390, 420);
    await cria('Estudar', HOJE, 840, 930);
    await cria('Médico', AMANHA, 840, 900);
    abre();
    await user.click(await screen.findByRole('button', { name: 'Copiar de outro dia' }));
    fireEvent.change(screen.getByLabelText('Copiar as atividades de'), { target: { value: HOJE } });
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(await screen.findByText('1 copiada. 1 ficou de fora porque o horário já estava ocupado.')).toBeInTheDocument();
  });
});
