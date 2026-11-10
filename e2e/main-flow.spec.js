import { expect, test } from '@playwright/test';

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const HOJE = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = { date: HOJE, minutes: 14 * 60 + 20 };
const SENHA = 'senha-de-teste-e2e';
const AREAS = ['/hoje', '/planejar', '/semana', '/repeticoes', '/inbox', '/progresso', '/configuracoes'];
const RESTO_DO_DIA = [
  ['Inglês', 930, 990], ['Organizar o quarto', 990, 1020], ['Academia', 1020, 1110, { isFixed: true }], ['Jantar', 1170, 1200], ['Dormir', 1350, 1380],
];

let contas = 0;
const novoEmail = () => `e2e-${Date.now()}-${process.pid}-${contas++}@plannio.test`;

// O dia é o de hoje, porque o servidor recusa datas distantes do relógio real; só a hora é fixada.
async function criaConta(page, nome = 'Ana') {
  await page.clock.setFixedTime(new Date(`${HOJE}T14:20:00`));
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill(nome);
  await page.getByLabel('E-mail').fill(novoEmail());
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('region', { name: 'Ofensiva' })).toBeVisible();
}

async function cria(page, name, startMinutes, endMinutes, extra = {}) {
  const res = await page.request.post('/api/activities', { data: { name, date: HOJE, startMinutes, endMinutes, now: { date: HOJE, minutes: 0 }, ...extra } });
  expect(res.status()).toBe(201);
  return res.json();
}
const criaResto = async (page) => { for (const [n, s, e, x] of RESTO_DO_DIA) await cria(page, n, s, e, x); };

// A caixa só muda depois que o servidor confirma; por isso clica e espera, em vez de check().
async function marca(page, nome) {
  const caixa = page.getByRole('checkbox', { name: `Marcar ${nome} como feita` });
  await caixa.click();
  await expect(caixa).toBeChecked();
}

const ofensiva = (page) => page.getByRole('region', { name: 'Ofensiva' });
const linha = (page, nome) => page.locator('.row').filter({ has: page.getByRole('button', { name: nome, exact: true }) });

async function tabAte(page, alvo) {
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    if (await alvo.evaluate((el) => el === document.activeElement).catch(() => false)) return;
  }
  throw new Error('o elemento não recebeu o foco pelo teclado');
}

test('a landing page leva ao cadastro, e o cadastro leva ao aplicativo', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByRole('link', { name: 'Criar conta' }).first().click();
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  await page.getByLabel('Nome').fill('Ana');
  await page.getByLabel('E-mail').fill(novoEmail());
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('region', { name: 'Ofensiva' })).toBeVisible();
  await expect(page).toHaveURL(/\/hoje$/);
  expect(erros).toEqual([]);
});

test('a landing page não rola para o lado em 360 px', async ({ page, viewport }) => {
  test.skip(viewport.width > 360, 'só vale para a largura de celular');
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(3500);
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});

test('fluxo principal: planejar, ver o agora, marcar, reorganizar e manter após recarregar', async ({ page }) => {
  await criaConta(page);
  await page.getByRole('link', { name: '+ Nova atividade' }).click();
  await page.getByRole('button', { name: '+ O que vai fazer? às 06:00' }).click();
  const form = page.getByRole('form', { name: 'O que vai fazer?' });
  await form.getByLabel('Nome').fill('Hora de estudar');
  await form.getByLabel('Início').fill('14:00');
  await form.getByLabel('Término').fill('15:30');
  await form.getByRole('button', { name: 'Salvar no dia' }).click();
  await expect(page.getByRole('region', { name: 'Dia escolhido' }).getByRole('button', { name: /Hora de estudar/ })).toBeVisible();
  await criaResto(page);

  await page.goto('/hoje');
  const agora = page.getByRole('region', { name: 'Agora' });
  await expect(agora.getByRole('heading', { name: 'Hora de estudar' })).toBeVisible();
  await expect(agora.getByRole('timer', { name: 'Restam 1h10' })).toBeVisible();

  await marca(page, 'Jantar');
  await expect(ofensiva(page).getByText('1 de 6')).toBeVisible();

  await agora.getByRole('button', { name: 'Preciso reorganizar' }).click();
  const janela = page.getByRole('dialog', { name: 'Reorganizar: Hora de estudar' });
  await janela.getByRole('radio', { name: 'Opção 2: hoje, 14:30 às 16:00' }).check();
  await janela.getByRole('button', { name: 'Aplicar opção 2' }).click();
  await expect(janela).toBeHidden();

  await page.reload();
  await expect(page.getByRole('region', { name: 'Agora' })).toContainText('Próxima: Hora de estudar às 14:30');
  await expect(linha(page, 'Inglês')).toContainText('16:00–17:00');
  await expect(linha(page, 'Academia')).toContainText('17:00–18:30');
  await expect(page.getByRole('checkbox', { name: 'Marcar Jantar como feita' })).toBeChecked();
});

test('ofensiva sobe quando o dia inteiro é concluído e continua após recarregar', async ({ page }) => {
  await criaConta(page);
  await cria(page, 'Ler', 600, 630);
  await cria(page, 'Correr', 700, 730);
  await page.goto('/hoje');
  const numero = ofensiva(page).locator('.num span');
  await expect(numero).toHaveText('0');
  await marca(page, 'Ler');
  await expect(numero).toHaveText('0');
  await marca(page, 'Correr');
  await expect(numero).toHaveText('1');
  await page.reload();
  await expect(ofensiva(page).locator('.num span')).toHaveText('1');
});

test('uma segunda conta não vê os dados da primeira', async ({ page, browser }) => {
  await criaConta(page);
  const a = await cria(page, 'Segredo da Ana', 600, 630);
  await page.goto('/hoje');
  await expect(page.getByRole('button', { name: 'Segredo da Ana', exact: true })).toBeVisible();

  const outra = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const pagina = await outra.newPage();
  await criaConta(pagina, 'Bia');
  await expect(pagina.getByRole('button', { name: 'Segredo da Ana', exact: true })).toHaveCount(0);
  expect((await pagina.request.get(`/api/activities/${a.id}`)).status()).toBe(404);
  await outra.close();
});

test('em 360 px nenhuma área rola para o lado, nos dois temas', async ({ page, viewport }) => {
  test.skip(viewport.width > 360, 'só vale para a largura de celular');
  await criaConta(page);
  await cria(page, 'Uma atividade com um nome bem comprido para testar a quebra de linha', 840, 930, { isFixed: true });
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    for (const area of AREAS) {
      await page.goto(area);
      await expect(page.locator('h1')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(sobra, `${area} no tema ${colorScheme}`).toBeLessThanOrEqual(0);
    }
  }
});

test('planejar e reorganizar só pelo teclado', async ({ page, viewport, browserName }) => {
  test.skip(viewport.width <= 360, 'o teclado físico é testado na largura de computador');
  test.skip(browserName === 'webkit', 'por padrão, o Safari não passa pelos botões com Tab');
  await criaConta(page);
  await cria(page, 'Hora de estudar', 840, 930);
  await page.goto('/hoje');
  await expect(page.getByRole('region', { name: 'Agora' }).getByRole('heading')).toBeVisible();

  await tabAte(page, page.getByRole('button', { name: 'Preciso reorganizar' }));
  await page.keyboard.press('Enter');
  const janela = page.getByRole('dialog', { name: 'Reorganizar: Hora de estudar' });
  await expect(janela.getByRole('radio').first()).toBeVisible();
  await tabAte(page, janela.getByRole('button', { name: 'Aplicar opção 1' }));
  await page.keyboard.press('Enter');
  await expect(janela).toBeHidden();

  await tabAte(page, page.getByRole('link', { name: '+ Nova atividade' }));
  await page.keyboard.press('Enter');
  const vaga = page.getByRole('button', { name: '+ O que vai fazer? às 06:00' });
  await expect(vaga).toBeVisible();
  await tabAte(page, vaga);
  await page.keyboard.press('Enter');
  const form = page.getByRole('form', { name: 'O que vai fazer?' });
  await tabAte(page, form.getByLabel('Nome'));
  await page.keyboard.type('Acordar');
  await tabAte(page, form.getByRole('button', { name: 'Salvar no dia' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Dia escolhido' }).getByRole('button', { name: /Acordar/ })).toBeVisible();
});

test('em alto contraste, os controles continuam identificáveis', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'o WebKit do teste não emula forced-colors');
  await criaConta(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/planejar');
  await page.getByRole('button', { name: '+ O que vai fazer? às 06:00' }).click();
  for (const alvo of [page.getByRole('form', { name: 'O que vai fazer?' }).getByLabel('Nome'), page.getByRole('button', { name: 'Copiar de outro dia' }), page.getByRole('form', { name: 'O que vai fazer?' })]) {
    const borda = await alvo.evaluate((el) => { const s = getComputedStyle(el); return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth) }; });
    expect(borda.style).not.toBe('none');
    expect(borda.width).toBeGreaterThan(0);
  }
});
