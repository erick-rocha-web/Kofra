// Fase 4 — largura de celular: todas as telas em 320, 360 e 390 px (claro e escuro), procurando rolagem
// horizontal e elementos que passam da borda. Tira fotos de cada tela em 360 px.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const h = require('./harness.cjs');

const OUT = path.join(__dirname, 'saida', 'celular');
fs.mkdirSync(OUT, { recursive: true });
const ROTAS = ['inicio', 'visao-geral', 'orcamento', 'categorias', 'patrimonio', 'investimentos', 'reserva', 'metas', 'calculadoras', 'juros-compostos', 'primeiro-milhao', 'aprender', 'aula-1', 'suporte', 'assistente', 'configuracoes'];
const DIALOGOS = [
  ['orcamento', 'Adicionar'],
  ['orcamento', 'Ajustar quanto investir'],
  ['metas', 'Nova meta'],
  ['reserva', 'Como funciona'],
];

async function medir(page) {
  return page.evaluate(() => {
    const w = window.innerWidth;
    const doc = document.documentElement.scrollWidth;
    const fora = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right <= w + 1 && r.left >= -1) continue;
      // ignora o que está dentro de um contêiner com rolagem horizontal própria ou recortado
      let p = el.parentElement;
      let dentro = false;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= w + 1 && pr.left >= -1) {
            dentro = true;
            break;
          }
        }
        p = p.parentElement;
      }
      if (dentro) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.pointerEvents === 'none') continue;
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      fora.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} [${Math.round(r.left)}–${Math.round(r.right)}] "${(el.textContent || '').trim().slice(0, 30)}"`);
    }
    return { w, doc, fora: fora.slice(0, 5) };
  });
}

(async () => {
  const browser = await chromium.launch();
  const problemas = [];
  let telas = 0;
  for (const largura of [320, 360, 390]) {
    for (const scheme of ['light', 'dark']) {
      for (const semente of ['A', null]) {
        const { ctx, page } = await h.abrir(browser, { viewport: { width: largura, height: largura === 320 ? 640 : 800 }, scheme, mobile: true });
        if (semente) await h.semear(page, semente);
        for (const r of ROTAS) {
          await h.ir(page, r);
          await page.waitForTimeout(150);
          const m = await medir(page);
          telas++;
          if (m.doc > m.w || m.fora.length) problemas.push({ largura, scheme, semente: semente || 'vazio', tela: r, rolagem: m.doc > m.w ? `${m.doc}px > ${m.w}px` : '', fora: m.fora });
          if (largura === 360 && scheme === (semente ? 'dark' : 'light')) await page.screenshot({ path: path.join(OUT, `${semente ? 'cheio' : 'vazio'}-${scheme}-${r}.png`), fullPage: true });
        }
        if (semente) {
          for (const aba of ['Fixa', 'Variável']) {
            await h.ir(page, 'orcamento');
            await page.getByRole('radio', { name: aba, exact: true }).click();
            await page.waitForTimeout(150);
            const m = await medir(page);
            telas++;
            if (m.doc > m.w || m.fora.length) problemas.push({ largura, scheme, semente, tela: 'orcamento/' + aba, rolagem: m.doc > m.w ? `${m.doc}px` : '', fora: m.fora });
          }
          for (const [rota, botao] of DIALOGOS) {
            await h.ir(page, rota);
            const b = page.getByRole('button', { name: botao, exact: true }).filter({ visible: true }).first();
            if (!(await b.count())) {
              problemas.push({ largura, scheme, semente, tela: `${rota} → ${botao}`, rolagem: '', fora: ['botão não encontrado'] });
              continue;
            }
            await b.click();
            await page.waitForTimeout(250);
            const m = await medir(page);
            telas++;
            if (m.doc > m.w || m.fora.length) problemas.push({ largura, scheme, semente, tela: `${rota} → ${botao}`, rolagem: m.doc > m.w ? `${m.doc}px` : '', fora: m.fora });
            if (largura === 360 && scheme === 'dark') await page.screenshot({ path: path.join(OUT, `dialogo-${rota}-${botao.replace(/\W+/g, '-')}.png`) });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(150);
          }
        }
        if (page.erros.length) problemas.push({ largura, scheme, semente: semente || 'vazio', tela: 'console', rolagem: '', fora: page.erros.slice(0, 3) });
        await ctx.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify({ telas, problemas }, null, 1));
  console.log(`telas verificadas: ${telas} · com problema: ${problemas.length}`);
  for (const p of problemas.slice(0, 40)) console.log(`${p.largura}px ${p.scheme} ${p.semente} ${p.tela} ${p.rolagem} ${p.fora.join(' | ')}`);
})();
