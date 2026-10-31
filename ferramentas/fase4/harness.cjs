// Ferramentas comuns para dirigir o Pila (build servido em http://127.0.0.1:4173) no Playwright.
const fs = require('fs');
const path = require('path');

const URL_APP = process.env.PILA_URL || 'http://127.0.0.1:4173/index.html';
const SEEDS = path.join(__dirname, 'sementes');

async function abrir(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 900 },
    colorScheme: opts.scheme || 'light',
    isMobile: !!opts.mobile,
    hasTouch: !!opts.mobile,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await ctx.newPage();
  page.erros = [];
  page.on('pageerror', (e) => page.erros.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g|net::ERR/.test(m.text())) page.erros.push(m.text());
  });
  await page.goto(URL_APP + '#inicio');
  await page.waitForTimeout(500);
  return { ctx, page };
}

/** Grava um objeto Dados no IndexedDB do app e recarrega. */
async function semear(page, nomeOuDados) {
  const dados = typeof nomeOuDados === 'string' ? JSON.parse(fs.readFileSync(path.join(SEEDS, nomeOuDados + '.json'), 'utf8')) : nomeOuDados;
  await page.evaluate(
    (d) =>
      new Promise((res, rej) => {
        const req = indexedDB.open('pila', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('dados')) req.result.createObjectStore('dados');
        };
        req.onerror = () => rej(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('dados', 'readwrite');
          tx.objectStore('dados').put(d, 'principal');
          tx.oncomplete = () => {
            db.close();
            res();
          };
          tx.onerror = () => rej(tx.error);
        };
      }),
    dados,
  );
  await page.reload();
  await page.waitForTimeout(600);
}

async function ir(page, hash) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await page.waitForTimeout(350);
}

/** Anda N meses (negativo = para trás) com os botões do seletor de mês. */
async function mudarMes(page, delta) {
  const nome = delta < 0 ? 'Mês anterior' : 'Próximo mês';
  for (let i = 0; i < Math.abs(delta); i++) {
    await page.getByRole('button', { name: nome, exact: true }).first().click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(250);
}

async function texto(page, seletor = 'main') {
  return (await page.locator(seletor).first().innerText()).replace(/ /g, ' ');
}

/** "R$ 1.234,56" | "−R$ 12,00" | "-R$ 1,00" → centavos */
function centavos(s) {
  const neg = /[−-]/.test(s.split('R$')[0] || '') || /^[−-]/.test(s.trim());
  const m = /([\d.]+),(\d{2})/.exec(s);
  if (!m) return null;
  const v = Number(m[1].replace(/\./g, '')) * 100 + Number(m[2]);
  return neg ? -v : v;
}

module.exports = { abrir, semear, ir, mudarMes, texto, centavos, URL_APP };
