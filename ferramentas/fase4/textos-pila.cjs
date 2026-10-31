// Coleta todos os textos que o Pila mostra (telas, diálogos, rótulos acessíveis e placeholders) para a checagem de originalidade.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const h = require('./harness.cjs');

const ROTAS = ['inicio', 'visao-geral', 'orcamento', 'categorias', 'patrimonio', 'investimentos', 'reserva', 'metas', 'calculadoras', 'juros-compostos', 'primeiro-milhao', 'aprender', 'aula-1', 'aula-2', 'aula-3', 'suporte', 'assistente', 'configuracoes'];
const textos = new Set();
async function colher(page) {
  const itens = await page.evaluate(() => {
    const out = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label],[placeholder],[title]')) {
      for (const a of ['aria-label', 'placeholder', 'title']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
    }
    return out;
  });
  for (const t of itens) for (const l of t.split('\n')) if (l.trim()) textos.add(l.trim());
}
(async () => {
  const browser = await chromium.launch();
  for (const semente of [null, 'A', 'metas', 'res-240000']) {
    const { ctx, page } = await h.abrir(browser);
    if (semente) await h.semear(page, semente);
    for (const r of ROTAS) {
      await h.ir(page, r);
      await colher(page);
      // abre cada botão de diálogo visível na tela e colhe o texto
      const nomes = await page.evaluate(() =>
        [...document.querySelectorAll('main button')]
          .filter((b) => b.offsetParent && !/apagar|excluir|limpar/i.test(b.innerText + (b.getAttribute('aria-label') || '')))
          .map((b) => (b.getAttribute('aria-label') || b.innerText || '').trim())
          .filter(Boolean)
          .slice(0, 25),
      );
      for (const n of nomes) {
        try {
          await page.getByRole('button', { name: n, exact: true }).filter({ visible: true }).first().click({ timeout: 1500 });
          await page.waitForTimeout(150);
          await colher(page);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
          await h.ir(page, r);
        } catch {}
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'saida', 'pila-textos.txt'), [...textos].sort().join('\n'));
  console.log('linhas únicas:', textos.size);
})();
