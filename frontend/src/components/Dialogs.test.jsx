import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api, ApiError } from '../services/api.js';
import ActivityDialog from './ActivityDialog.jsx';
import ReorganizeDialog from './ReorganizeDialog.jsx';
import CloseDayDialog from './CloseDayDialog.jsx';

const HOJE = '2026-11-04';
const now = { date: HOJE, minutes: 860 };
const antes = { date: '2026-11-01', minutes: 0 };
let user;
let ids;
const comRota = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const ativ = async (id) => api(`/activities/${id}`);

beforeEach(async () => {
  user = userEvent.setup();
  await api('/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', password: 'Senha-forte-8' } });
  ids = {};
  for (const [k, n, s, e, x] of [
    ['estudar', 'Hora de estudar', 840, 930], ['ingles', 'Inglês', 930, 990], ['organizar', 'Organizar o quarto', 990, 1020],
    ['academia', 'Academia', 1020, 1110, { isFixed: true }], ['jantar', 'Jantar', 1170, 1200], ['dormir', 'Dormir', 1350, 1380],
  ]) ids[k] = (await api('/activities', { method: 'POST', body: { name: n, date: HOJE, startMinutes: s, endMinutes: e, now: antes, ...x } })).id;
});

describe('ReorganizeDialog', () => {
  test('mostra até 3 opções com o que muda e só aplica ao confirmar (CA09)', async () => {
    const onChanged = vi.fn();
    comRota(<ReorganizeDialog activity={await ativ(ids.estudar)} now={now} onClose={() => {}} onChanged={onChanged} />);
    const dlg = await screen.findByRole('dialog', { name: 'Reorganizar: Hora de estudar' });
    const opcoes = await within(dlg).findAllByRole('radio');
    expect(opcoes.map((o) => o.getAttribute('aria-label'))).toEqual([
      'Opção 1: hoje, 20:00 às 21:30', 'Opção 2: hoje, 14:30 às 16:00', 'Opção 3: amanhã, 14:00 às 15:30',
    ]);
    expect(within(dlg).getByText('Nenhuma outra atividade muda.', { selector: '.opt.on span' })).toBeInTheDocument();
    expect(within(dlg).getByText('Também mudam: Inglês para 16:00–17:00 e Organizar o quarto para 18:30–19:00.')).toBeInTheDocument();
    expect((await ativ(ids.estudar)).startMinutes).toBe(840);
    await user.click(opcoes[1]);
    await user.click(within(dlg).getByRole('button', { name: 'Aplicar opção 2' }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect((await ativ(ids.ingles)).startMinutes).toBe(960);
  });

  test('sem horário mostra E1, com outro dia e Inbox (CA10)', async () => {
    const vazio = vi.fn(async (path, opts) => (path.endsWith('/suggestions') ? { targetVersion: 1, options: [] } : api(path, opts)));
    comRota(<ReorganizeDialog activity={await ativ(ids.estudar)} now={now} onClose={() => {}} onChanged={() => {}} request={vazio} />);
    expect(await screen.findByText('Não encontramos um horário livre nos próximos dias. Você pode escolher outro dia ou guardar na Inbox.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher outro dia' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar na Inbox' }));
    await vi.waitFor(async () => expect((await api('/inbox')).map((a) => a.name)).toEqual(['Hora de estudar']));
  });

  test('agenda mudou: mostra E2 e carrega novas opções', async () => {
    comRota(<ReorganizeDialog activity={await ativ(ids.estudar)} now={now} onClose={() => {}} onChanged={() => {}} />);
    await screen.findAllByRole('radio');
    await api('/activities', { method: 'POST', body: { name: 'Ligação', date: HOJE, startMinutes: 1200, endMinutes: 1230, now: antes } });
    await user.click(screen.getByRole('button', { name: 'Aplicar opção 1' }));
    expect(await screen.findByText('Sua agenda mudou enquanto você decidia. Atualizamos as opções.')).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-label', 'Opção 1: hoje, 20:30 às 22:00'));
  });

  test('falha de conexão mostra E3, e tentar de novo reenvia o mesmo requestId; clique duplo faz uma só chamada', async () => {
    const ids2 = [];
    let falhou = false;
    const rede = vi.fn(async (path, opts) => {
      if (path.endsWith('/apply')) {
        ids2.push(opts.body.requestId);
        if (!falhou) {
          await new Promise((r) => setTimeout(r, 80));
          falhou = true;
          throw new ApiError(0, { code: 'NETWORK', message: 'Não foi possível salvar. Verifique sua conexão.' });
        }
      }
      return api(path, opts);
    });
    comRota(<ReorganizeDialog activity={await ativ(ids.estudar)} now={now} onClose={() => {}} onChanged={() => {}} request={rede} />);
    await screen.findAllByRole('radio');
    const aplicar = screen.getByRole('button', { name: 'Aplicar opção 1' });
    await user.dblClick(aplicar);
    expect(await screen.findByText('Não foi possível salvar. Verifique sua conexão.')).toBeInTheDocument();
    expect(ids2).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await vi.waitFor(() => expect(ids2).toHaveLength(2));
    expect(ids2[1]).toBe(ids2[0]);
  });

  test('atividade que não existe mais mostra E5 e atualiza a lista', async () => {
    const onChanged = vi.fn();
    const a = await ativ(ids.estudar);
    await api(`/activities/${ids.estudar}`, { method: 'DELETE', body: { now } });
    comRota(<ReorganizeDialog activity={a} now={now} onClose={() => {}} onChanged={onChanged} />);
    expect(await screen.findByText('Esta atividade não foi encontrada.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });
});

describe('ActivityDialog', () => {
  test('salva status e horário real; Adiada oferece reorganizar', async () => {
    comRota(<ActivityDialog activity={await ativ(ids.ingles)} now={now} onClose={() => {}} onChanged={() => {}} />);
    const dlg = await screen.findByRole('dialog', { name: 'Inglês' });
    await user.click(within(dlg).getByRole('radio', { name: '◐ Parcial' }));
    await user.type(within(dlg).getByLabelText('Início real'), '15:30');
    await user.type(within(dlg).getByLabelText('Término real'), '16:00');
    await user.click(within(dlg).getByRole('button', { name: 'Salvar' }));
    await vi.waitFor(async () => expect(await ativ(ids.ingles)).toMatchObject({ status: 'PARTIAL', actualStart: 930, actualEnd: 960 }));
    await user.click(within(dlg).getByRole('radio', { name: '↷ Adiada' }));
    await user.click(within(dlg).getByRole('button', { name: 'Salvar' }));
    expect(await within(dlg).findByText('Quer escolher um novo horário agora?')).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Reorganizar' })).toBeInTheDocument();
  });
});

describe('CloseDayDialog', () => {
  test('lista só as não concluídas, marca status e mostra quantas faltam', async () => {
    await api(`/activities/${ids.estudar}/status`, { method: 'POST', body: { status: 'DONE' } });
    comRota(<CloseDayDialog date={HOJE} now={{ date: HOJE, minutes: 1300 }} onClose={() => {}} onChanged={() => {}} />);
    const dlg = await screen.findByRole('dialog', { name: 'Fechar o dia' });
    const lista = await within(dlg).findByRole('list');
    expect(within(lista).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['Inglês', 'Organizar o quarto', 'Academia', 'Jantar', 'Dormir']);
    expect(within(dlg).getByText('Faltam 5 para o dia contar.')).toBeInTheDocument();
    expect(within(within(lista).getByRole('listitem', { name: 'Academia' })).queryByRole('button', { name: 'Reorganizar' })).not.toBeInTheDocument();
    expect(within(within(lista).getByRole('listitem', { name: 'Jantar' })).getByRole('button', { name: 'Reorganizar' })).toBeInTheDocument();
    await user.selectOptions(within(lista).getByLabelText('Status de Inglês'), 'DONE');
    expect(await within(dlg).findByText('Faltam 4 para o dia contar.')).toBeInTheDocument();
    expect((await ativ(ids.ingles)).status).toBe('DONE');
    expect((await ativ(ids.jantar)).status).toBe('PENDING');
  });
});
