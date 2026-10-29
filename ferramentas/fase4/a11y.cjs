const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const h = require('./harness.cjs');
const AXE = require('axe-core').source;
const ROTAS = ['inicio', 'visao-geral', 'orcamento', 'categorias', 'patrimonio', 'investimentos', 'reserva', 'metas', 'calculadoras', 'juros-compostos', 'primeiro-milhao', 'aprender', 'aula-1', 'suporte', 'assistente', 'configuracoes'];
(async () => {
  const browser = await chromium.launch();
  const resumo = {};
  for (const scheme of ['light', 'dark']) {
    for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const { ctx, page } = await h.abrir(browser, { viewport: vp, scheme, mobile: vp.width < 500 });
      await h.semear(page, 'A');
      for (const r of ROTAS) {
        await h.ir(page, r);
        await page.waitForTimeout(250);
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
          return r.violations.map((v) => ({ id: v.id, impacto: v.impact, n: v.nodes.length, exemplo: v.nodes[0]?.target?.join(' '), resumo: v.nodes[0]?.failureSummary?.split('\n').slice(0, 2).join(' ') }));
        });
        for (const v of res) {
          const k = `${v.id} (${v.impacto})`;
          resumo[k] ??= [];
          resumo[k].push(`${scheme}/${vp.width}/${r}: ${v.n}× ${v.exemplo} — ${v.resumo}`);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'saida', 'a11y.json'), JSON.stringify(resumo, null, 1));
  const chaves = Object.keys(resumo);
  console.log('violações distintas:', chaves.length);
  for (const k of chaves) console.log(k, '\n   ', resumo[k].slice(0, 4).join('\n    '));
})();
