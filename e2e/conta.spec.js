import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import pg from 'pg';

// Cenários de conta contra o servidor real e o PostgreSQL de teste.
const BANCO = process.env.E2E_DATABASE_URL;
const SENHA = 'Teste-de-ponta-a-ponta-1';
const OUTRA = 'Outra-senha-bem-longa-2';

test.skip(!BANCO, 'Precisa do PostgreSQL: npm run db:up e E2E_DATABASE_URL.');

let conexao;
test.beforeAll(async () => { conexao = new pg.Client({ connectionString: BANCO }); await conexao.connect(); });
test.afterAll(async () => { await conexao.end(); });

let contas = 0;
const novoEmail = () => `conta-${Date.now()}-${process.pid}-${contas++}@plannio.test`;
const usuarios = async (email) => (await conexao.query('SELECT * FROM "User" WHERE email = $1', [email])).rows;

async function cadastra(page, email = novoEmail(), nome = 'Ana Teste') {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill(nome);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  return email;
}

async function entra(page, email, senha) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function sai(page) {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe('A. cadastro', () => {
  test('grava no banco, guarda só o hash e entra no aplicativo', async ({ page }) => {
    const email = await cadastra(page);
    const [conta] = await usuarios(email);
    expect(conta.name).toBe('Ana Teste');
    expect(conta.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(conta.passwordHash).not.toContain(SENHA);
    await expect(page.getByRole('region', { name: 'Ofensiva' })).toBeVisible();
  });

  test('senha curta é recusada com mensagem clara', async ({ page }) => {
    const email = novoEmail();
    await page.goto('/cadastro');
    await page.getByLabel('Nome').fill('Ana');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('1234567');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeVisible();
    expect(await usuarios(email)).toHaveLength(0);
  });
});

test.describe('B. e-mail repetido', () => {
  test('não cria outra conta', async ({ page, browser }) => {
    const email = await cadastra(page);

    const outra = await (await browser.newContext()).newPage();
    await outra.goto('/cadastro');
    await outra.getByLabel('Nome').fill('Outra pessoa');
    await outra.getByLabel('E-mail').fill(email.toUpperCase());
    await outra.getByLabel('Senha').fill(OUTRA);
    await outra.getByRole('button', { name: 'Criar conta' }).click();
    await expect(outra.getByText('Este e-mail já tem uma conta.')).toBeVisible();
    await expect(outra).toHaveURL(/\/cadastro$/);

    const contas2 = await usuarios(email);
    expect(contas2).toHaveLength(1);
    expect(contas2[0].name).toBe('Ana Teste');
  });

  test('dois envios ao mesmo tempo criam uma conta só', async ({ request }) => {
    const email = novoEmail();
    const corpo = { data: { name: 'Ana', email, password: SENHA } };
    const respostas = await Promise.all([request.post('/api/auth/register', corpo), request.post('/api/auth/register', corpo), request.post('/api/auth/register', corpo)]);
    expect(respostas.map((r) => r.status()).filter((s) => s === 201)).toHaveLength(1);
    expect(await usuarios(email)).toHaveLength(1);
  });
});

test.describe('C. login, sessão e logout', () => {
  test('a sessão continua ao recarregar, e depois do logout o cookie antigo não vale', async ({ page }) => {
    const email = await cadastra(page);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Ofensiva' })).toBeVisible();

    // O cabeçalho é o que o servidor promete; o WebKit para Windows não informa o SameSite do cookie guardado.
    const definido = (await page.request.post('/api/auth/login', { data: { email, password: SENHA } })).headers()['set-cookie'];
    expect(definido).toMatch(/HttpOnly/);
    expect(definido).toMatch(/SameSite=Lax/);

    const antes = await page.context().cookies();
    const cookie = antes.find((c) => c.name === 'plannio_session');
    expect(cookie.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain('plannio_session');

    await sai(page);
    await page.goto('/hoje');
    await expect(page).toHaveURL(/\/login$/);

    await page.context().addCookies([cookie]);
    expect((await page.request.get('/api/me')).status()).toBe(401);

    await entra(page, email, SENHA);
    await expect(page).toHaveURL(/\/hoje$/);
  });

  test('senha errada e conta inexistente dão a mesma resposta', async ({ page }) => {
    const email = await cadastra(page);
    await sai(page);
    await entra(page, email, 'Senha-totalmente-errada-9');
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
    await entra(page, novoEmail(), 'Senha-totalmente-errada-9');
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  });

  for (const rota of ['/hoje', '/planejar', '/semana', '/repeticoes', '/inbox', '/progresso', '/configuracoes']) {
    test(`sem sessão, ${rota} leva ao login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

test.describe('D. segurança', () => {
  test('texto de injeção SQL entra e sai como texto', async ({ page, request }) => {
    const email = novoEmail();
    const nome = "Robert'); DROP TABLE \"User\";--";
    await cadastra(page, email, nome);
    expect((await usuarios(email))[0].name).toBe(nome);
    const login = await request.post('/api/auth/login', { data: { email: "' OR '1'='1' --", password: "' OR '1'='1" } });
    expect(login.status()).toBe(401);
    expect((await conexao.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n).toBeGreaterThan(0);
  });

  test('HTML no nome e nas atividades não executa', async ({ page }) => {
    let alertas = 0;
    page.on('dialog', (d) => { alertas += 1; d.dismiss(); });
    const carga = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    await cadastra(page, novoEmail(), carga);
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const hoje = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const res = await page.request.post('/api/activities', { data: { name: carga, date: hoje, startMinutes: 600, endMinutes: 660, now: { date: hoje, minutes: 480 } } });
    expect(res.status()).toBe(201);
    await page.goto('/hoje');
    await expect(page.getByText(carga).first()).toBeVisible();
    await page.goto('/configuracoes');
    await expect(page.getByText(carga).first()).toBeVisible();
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(alertas).toBe(0);
  });

  test('uma conta não lê nem altera o que é de outra', async ({ page, browser }) => {
    await cadastra(page);
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const hoje = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const criada = await (await page.request.post('/api/activities', { data: { name: 'Particular', date: hoje, startMinutes: 600, endMinutes: 660, now: { date: hoje, minutes: 480 } } })).json();

    const intruso = await (await browser.newContext()).newPage();
    await cadastra(intruso);
    expect((await intruso.request.get(`/api/activities/${criada.id}`)).status()).toBe(404);
    expect((await intruso.request.patch(`/api/activities/${criada.id}`, { data: { name: 'Alterada', now: { date: hoje, minutes: 480 } } })).status()).toBe(404);
    expect((await intruso.request.delete(`/api/activities/${criada.id}`, { data: { now: { date: hoje, minutes: 480 } } })).status()).toBe(404);
    const dela = await (await page.request.get(`/api/activities/${criada.id}`)).json();
    expect(dela.name).toBe('Particular');
  });

  test('sem sessão, cookie adulterado ou outro site: recusado', async ({ page, request }) => {
    expect((await request.get('/api/activities')).status()).toBe(401);
    await cadastra(page);
    const cookie = (await page.context().cookies()).find((c) => c.name === 'plannio_session');
    const adulterado = `${cookie.value.slice(0, -4)}AAAA`;
    expect((await request.get('/api/me', { headers: { cookie: `plannio_session=${adulterado}` } })).status()).toBe(401);
    const semAssinatura = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${cookie.value.split('.')[1]}.`;
    expect((await request.get('/api/me', { headers: { cookie: `plannio_session=${semAssinatura}` } })).status()).toBe(401);
    const deFora = await page.request.post('/api/auth/logout', { headers: { origin: 'https://site-malicioso.example' } });
    expect(deFora.status()).toBe(403);
    expect((await page.request.get('/api/me')).status()).toBe(200);
  });

  test('cabeçalhos de segurança presentes e nenhum dado sensível na API', async ({ page }) => {
    await cadastra(page);
    const raiz = await page.request.get('/');
    const h = raiz.headers();
    expect(h['content-security-policy']).toContain("script-src 'self'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('no-referrer');
    expect(h['x-powered-by']).toBeUndefined();
    const me = await page.request.get('/api/me');
    expect(me.headers()['cache-control']).toBe('no-store');
    expect(me.headers()['access-control-allow-origin']).toBeUndefined();
    expect(await me.text()).not.toMatch(/passwordHash|tokenHash|argon2/);
  });
});

test.describe('E. geral', () => {
  test('a landing abre com ou sem o parâmetro antigo e leva ao cadastro e ao login', async ({ page }) => {
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', (e) => erros.push(e.message));
    for (const rota of ['/', '/?proposta=b']) {
      await page.goto(rota);
      await expect(page.getByRole('heading', { level: 1, name: 'Saiba o que fazer agora.' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Organizador de rotina')).toHaveCount(0);
      await expect(page.locator('.lp-cursor')).toHaveCount(0);
    }
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toHaveAttribute('href', '/login');
    await expect(page.getByRole('link', { name: 'Criar conta' }).first()).toHaveAttribute('href', '/cadastro');
    await page.goto('/privacidade');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacidade' })).toBeVisible();
    await page.goto('/termos');
    await expect(page.getByRole('heading', { level: 1, name: 'Termos' })).toBeVisible();
    expect(erros).toEqual([]);
  });

  test('as áreas abrem sem erro no console', async ({ page }) => {
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', (e) => erros.push(e.message));
    await cadastra(page);
    for (const rota of ['/hoje', '/planejar', '/semana', '/repeticoes', '/inbox', '/progresso', '/configuracoes']) {
      await page.goto(rota);
      await expect(page.getByRole('main')).toBeVisible();
      await page.waitForLoadState('networkidle');
    }
    expect(erros).toEqual([]);
  });

  test('conta e dados continuam depois de reiniciar o servidor', async ({ playwright }, info) => {
    test.skip(info.project.name !== 'chromium-1280', 'Basta rodar uma vez.');
    test.setTimeout(90000);
    const PORTA = 3102;
    const sobe = async () => {
      const filho = spawn(process.execPath, [fileURLToPath(new URL('../backend/src/index.js', import.meta.url))], { stdio: 'ignore', env: { ...process.env, PORT: String(PORTA), E2E: '1', NODE_ENV: 'development', DATABASE_URL: BANCO, JWT_SECRET: 'chave-usada-somente-nos-testes-de-ponta-a-ponta', APP_URL: `http://localhost:${PORTA}` } });
      await expect.poll(() => fetch(`http://localhost:${PORTA}/api/health`).then((r) => r.status, () => 0), { timeout: 30000 }).toBe(200);
      return filho;
    };
    const desce = (filho) => new Promise((ok) => { filho.once('exit', ok); filho.kill(); });
    const email = novoEmail();

    let servidor = await sobe();
    const api1 = await playwright.request.newContext({ baseURL: `http://localhost:${PORTA}` });
    expect((await api1.post('/api/auth/register', { data: { name: 'Persistente', email, password: SENHA } })).status()).toBe(201);
    const { color } = (await (await api1.get('/api/categories')).json())[0];
    expect((await api1.post('/api/categories', { data: { name: 'Sobrevive', color } })).status()).toBe(201);
    await desce(servidor);
    await expect.poll(() => fetch(`http://localhost:${PORTA}/api/health`).then((r) => r.status, () => 0)).toBe(0);

    servidor = await sobe();
    try {
      // A sessão aberta antes de reiniciar continua valendo, porque fica no banco.
      expect((await api1.get('/api/me')).status()).toBe(200);
      const api2 = await playwright.request.newContext({ baseURL: `http://localhost:${PORTA}` });
      expect((await api2.post('/api/auth/login', { data: { email, password: SENHA } })).status()).toBe(200);
      const categorias = await (await api2.get('/api/categories')).json();
      expect(categorias.map((c) => c.name)).toContain('Sobrevive');
    } finally {
      await desce(servidor);
    }
  });
});
