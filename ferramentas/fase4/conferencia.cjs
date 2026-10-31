// Fase 4 — prova cruzada: cada caso observado hoje na referência é refeito no Pila (interface real,
// build servido localmente) e os números exibidos são comparados.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const h = require('./harness.cjs');

const R = []; // { calculo, caso, campo, referencia, pila, ok, nota }
const brl = (c) => (c === null || c === undefined ? '—' : (c < 0 ? '−' : '') + 'R$ ' + (Math.abs(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
function reg(calculo, caso, campo, referencia, pila, ok, nota = '') {
  R.push({ calculo, caso, campo, referencia: String(referencia), pila: String(pila), ok: !!ok, nota });
}
/** dinheiro: ref em centavos; se a referência mostra reais inteiros, compara arredondando o valor do Pila. */
function regDinheiro(calculo, caso, campo, refCent, pilaCent, { inteiros = false, nota = '' } = {}) {
  const ok = pilaCent !== null && (inteiros ? Math.round(pilaCent / 100) === Math.round(refCent / 100) : pilaCent === refCent);
  reg(calculo, caso, campo, inteiros ? brl(refCent).replace(/,\d\d$/, '') : brl(refCent), brl(pilaCent), ok, nota);
}
const linhas = (t) => t.replace(/R\$\n/g, 'R$ ').split('\n').map((l) => l.trim()).filter(Boolean);
const cent = (s) => h.centavos(s);
async function digitar(page, rotulo, valor) {
  const campo = page.getByLabel(rotulo, { exact: true });
  await campo.fill('');
  await campo.type(String(valor));
}
function depois(ls, rotulo, n = 1) {
  const i = ls.findIndex((l) => l === rotulo);
  return i < 0 ? null : ls[i + n] ?? null;
}

/* ───────────── Orçamento ───────────── */
async function resumoOrcamento(page) {
  const ls = linhas(await h.texto(page));
  const v = (r) => cent(depois(ls, r) || '');
  const det = depois(ls, 'RECEITA', 2) || '';
  return { receita: v('RECEITA'), investir: v('INVESTIR'), despesas: v('DESPESAS'), saldo: v('SALDO'), aReceber: /Previsto/.test(det) ? cent(det) : 0 };
}
async function graficoDaAba(page, aba) {
  await page.getByRole('radio', { name: aba, exact: true }).click();
  await page.waitForTimeout(250);
  const ls = linhas(await h.texto(page));
  const titulo = { Receita: 'Receitas por tipo', Fixa: 'Despesas fixas por categoria', Variável: 'Despesas variáveis por categoria' }[aba];
  let i = ls.indexOf(titulo);
  if (i < 0) return null;
  i += 3; // valor do centro + rótulo do centro
  const out = [];
  while (i + 2 < ls.length && /^\d+%$/.test(ls[i + 1]) && /R\$/.test(ls[i + 2])) {
    out.push(`${ls[i]}:${ls[i + 1].replace('%', '')}`);
    i += 3;
  }
  return out.join('|');
}

/* ───────────── Execução ───────────── */
(async () => {
  const browser = await chromium.launch();
  const { page } = await h.abrir(browser);
  const C = 'Orçamento';

  // A) Orçamento — semente A (prevista de janeiro pendente) e B (recebida)
  const MESES = [
    ['Set/2026', -1, 'A', { receita: 1400000, aReceber: 0, investir: 0, despesas: 50000, saldo: 1350000 }],
    ['Out/2026', 0, 'A', { receita: 600015, aReceber: 0, investir: 120003, despesas: 254999, saldo: 225013 }],
    ['Nov/2026', 1, 'A', { receita: 150000, aReceber: 0, investir: 45000, despesas: 197000, saldo: -92000 }],
    ['Dez/2026', 2, 'A', { receita: 100000, aReceber: 0, investir: 30000, despesas: 197000, saldo: -127000 }],
    ['Jan/2027 (prevista pendente)', 3, 'A', { receita: 100000, aReceber: 33333, investir: 30000, despesas: 166166, saldo: -96166 }],
    ['Fev/2027 (prevista pendente)', 4, 'A', { receita: 100000, aReceber: 25050, investir: 30000, despesas: 166167, saldo: -96167 }],
    ['Jan/2027 (prevista recebida)', 3, 'B', { receita: 133333, aReceber: 0, investir: 40000, despesas: 166166, saldo: -72833 }],
  ];
  const GRAFICOS = {
    'Out/2026': { Receita: 'Renda Principal:83|Renda Extra:17|Outro:0', Fixa: 'Moradia:100', Variável: 'Mercado:67|Vestuário:32|Lazer:2' },
    'Nov/2026': { Receita: 'Renda Principal:67|Renda Extra:33', Fixa: 'Moradia:93|Trabalho:7', Variável: 'Vestuário:95|Lazer:5' },
    'Dez/2026': { Fixa: 'Moradia:93|Trabalho:7', Variável: 'Vestuário:95|Lazer:5' },
    'Jan/2027 (prevista pendente)': { Receita: 'Renda Principal:100', Variável: 'Lazer:100' },
    'Jan/2027 (prevista recebida)': { Receita: 'Renda Principal:75|Renda Extra:25' },
  };
  let semente = null;
  for (const [nome, delta, s, ref] of MESES) {
    if (s !== semente) {
      await h.semear(page, s);
      semente = s;
    }
    await h.ir(page, 'orcamento');
    await page.evaluate(() => window.scrollTo(0, 0));
    // volta ao mês atual recarregando a rota e anda delta meses
    await page.reload();
    await page.waitForTimeout(500);
    await h.ir(page, 'orcamento');
    await h.mudarMes(page, delta);
    const k = await resumoOrcamento(page);
    regDinheiro('Saldo do mês', nome, 'saldo', ref.saldo, k.saldo);
    regDinheiro('Saldo do mês', nome, 'despesas', ref.despesas, k.despesas);
    regDinheiro('Investir', nome, 'investir', ref.investir, k.investir);
    regDinheiro('Receita prevista', nome, 'receita do mês', ref.receita, k.receita);
    regDinheiro('Receita prevista', nome, 'a receber', ref.aReceber, k.aReceber);
    for (const [aba, esperado] of Object.entries(GRAFICOS[nome] || {})) {
      const g = await graficoDaAba(page, aba);
      reg('Gráfico por categoria', `${nome} · aba ${aba}`, '% por categoria', esperado, g, g === esperado);
    }
    if (nome.startsWith('Jan/2027 (prevista pendente)') || nome.startsWith('Fev')) {
      await page.getByRole('radio', { name: 'Variável', exact: true }).click();
      await page.waitForTimeout(200);
      const ls = linhas(await h.texto(page));
      const i = ls.indexOf('TESTE KOFRA Parcelado 4x');
      const val = i >= 0 ? cent(ls.slice(i, i + 6).find((l) => /R\$/.test(l)) || '') : null;
      const esperado = nome.startsWith('Jan') ? 2499 : 2500;
      regDinheiro('Parcelamento', `99,99 em 4× · parcela de ${nome.slice(0, 8)}`, 'valor da parcela', esperado, val === null ? null : Math.abs(val));
    }
  }

  // B) Prévia do parcelamento no formulário
  await h.semear(page, 'A');
  await h.ir(page, 'orcamento');
  await page.getByRole('radio', { name: 'Variável', exact: true }).click();
  for (const [total, n, ref] of [
    ['123456', '5', 24691],
    ['9999', '4', 2500],
    ['1000', '3', 333],
    ['200000', '12', 16667],
    ['5', '2', 3],
    ['10', '3', 3],
  ]) {
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await page.waitForTimeout(300);
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('switch', { name: /Compra parcelada/ }).click();
    await dlg.getByLabel('Valor total', { exact: true }).type(total);
    const parc = dlg.getByLabel('Parcelas', { exact: true });
    await parc.fill(n);
    await page.waitForTimeout(200);
    const t = await dlg.innerText();
    const m = /(\d+)× de (R\$ [\d.,]+)/.exec(t);
    const k = m ? cent(m[2]) : null;
    regDinheiro('Parcelamento', `prévia ${brl(Number(total))} em ${n}×`, 'valor da parcela', ref, k);
    await dlg.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForTimeout(200);
  }

  // C) Patrimônio e composição — semente A (dólar = R$ 535,13, como no Início e no Patrimônio da referência)
  const PAT = [
    ['Set/2026', -1, 500000, 'TESTE KOFRA Conta Set:100', null],
    ['Out/2026', 0, 4898513, 'TESTE KOFRA Carro:49|Renda fixa:18|TESTE KOFRA Conta:16|TESTE KOFRA Conta Set:8|Renda variável:8|TESTE KOFRA Dolar:1', 'TESTE KOFRA Conta:64|TESTE KOFRA Conta Set:32|TESTE KOFRA Dolar:3'],
    ['Nov/2026', 1, 4798513, 'TESTE KOFRA Carro:48|Renda fixa:18|TESTE KOFRA Conta:17|TESTE KOFRA Conta Set:8|Renda variável:8|TESTE KOFRA Dolar:1', 'TESTE KOFRA Conta:64|TESTE KOFRA Conta Set:32|TESTE KOFRA Dolar:3'],
    ['Dez/2026', 2, 4798513, 'TESTE KOFRA Carro:48|Renda fixa:18|TESTE KOFRA Conta:17|TESTE KOFRA Conta Set:8|Renda variável:8|TESTE KOFRA Dolar:1', null],
    ['Jan/2027', 3, 4796733, null, null],
  ];
  for (const [nome, delta, ref, compRef, grupoRef] of PAT) {
    await page.reload();
    await page.waitForTimeout(500);
    await h.ir(page, 'patrimonio');
    await h.mudarMes(page, delta);
    const ls = linhas(await h.texto(page));
    const linhaTotal = ls[ls.indexOf('Patrimônio total') + 2] || '';
    const mT = /R\$ ([\d.]+)(?:,(\d{2}))?/.exec(linhaTotal);
    const total = mT ? Number(mT[1].replace(/\./g, '')) * 100 + Number(mT[2] || 0) : null;
    regDinheiro('Patrimônio', nome, 'patrimônio total', ref, total, { inteiros: true, nota: 'a referência mostra reais inteiros nesta tela' });
    if (compRef) {
      const i = ls.indexOf('O QUE MAIS PESA');
      const pares = [];
      for (let j = i + 1; j + 1 < ls.length && /^\d+%$/.test(ls[j + 1]); j += 2) pares.push(`${ls[j]}:${ls[j + 1].replace('%', '')}`);
      const k = pares.join('|');
      // o Pila lista os 5 maiores; compara o que aparece
      const refTop = compRef.split('|').slice(0, pares.length).join('|');
      reg('Composição do patrimônio', nome, '% de cada item (lista "O que mais pesa")', compRef, k, k === refTop, pares.length < compRef.split('|').length ? `o Pila mostra só os ${pares.length} maiores` : '');
    }
    if (grupoRef) {
      const itens = [];
      ls.forEach((l, j) => {
        const m = /^(\d+)% do grupo$/.exec(l);
        if (m) itens.push(`${ls[j - 3]}:${m[1]}`);
      });
      const k = itens.join('|');
      reg('Composição do patrimônio', `${nome} · grupo Liquidez`, '% dentro do grupo', grupoRef, k, k === grupoRef);
    }
  }

  // D) Investimentos — semente A
  const INV = [
    ['Out/2026', 0, { atual: 1545000, investido: 1500000, rend: 45000, pct: '3,0' }, [['TESTE KOFRA CDB', 85000, '8,5'], ['TESTE KOFRA Acoes', -40000, '-8,0']]],
    ['Jan/2027', 3, { atual: 1543220, investido: 1500000, rend: 43220, pct: '2,9' }, [['TESTE KOFRA CDB', 111111, '11,1'], ['TESTE KOFRA Acoes', -67891, '-13,6']]],
    ['Fev/2027', 4, { atual: 1419763, investido: 1500000, rend: -80237, pct: '-5,3' }, [['TESTE KOFRA CDB', -12346, '-1,2']]],
  ];
  for (const [nome, delta, tot, ativos] of INV) {
    await page.reload();
    await page.waitForTimeout(500);
    await h.ir(page, 'investimentos');
    await h.mudarMes(page, delta);
    const ls = linhas(await h.texto(page));
    const rendTot = cent(depois(ls, 'RENDIMENTO') || '');
    const pctTot = (/([+−-]?[\d,]+)% sobre o investido/.exec(depois(ls, 'RENDIMENTO', 2) || '') || [])[1];
    regDinheiro('Rendimento', `${nome} · carteira`, 'rendimento (R$)', tot.rend, rendTot, { inteiros: true, nota: 'a referência mostra reais inteiros' });
    const pk = pctTot ? pctTot.replace('−', '-').replace('+', '') : null;
    reg('Rendimento', `${nome} · carteira`, 'rendimento (%)', tot.pct, pk, pk === tot.pct);
    for (const [ativo, rend, pct] of ativos) {
      const i = ls.indexOf(ativo);
      const bloco = ls.slice(i, i + 6);
      const rk = cent(bloco.find((l) => /^[+−-]R\$/.test(l)) || '');
      const pkA = ((/\(([+−-]?[\d,]+)%\)/.exec(bloco.join(' ')) || [])[1] || '').replace('−', '-').replace('+', '');
      regDinheiro('Rendimento', `${nome} · ${ativo}`, 'rendimento (R$)', rend, rk);
      reg('Rendimento', `${nome} · ${ativo}`, 'rendimento (%)', pct, pkA, pkA === pct);
    }
  }

  // E) Visão geral — semente C (dólar = R$ 533,50, o valor que a Visão geral da referência usa)
  await h.semear(page, 'C');
  const VG = [
    ['Mês atual (out)', 'Mês atual', null, { receita: [600015, 'NMC'], gastos: [254999, 204999], saldo: 345016, patrimonio: [4898350, 4398350], investimentos: [1545000, null], reserva: [100001, null] }],
    ['3 meses (ago–out)', '3 meses', null, { receita: [2000015, 1900015], gastos: [304999, null], saldo: 1695016 }],
    ['6 meses (mai–out)', '6 meses', null, { receita: [2100015, null], gastos: [304999, null], saldo: 1795016 }],
    ['12 meses', '12 meses', null, { receita: [2100015, null], gastos: [304999, null], saldo: 1795016, patrimonio: [4898350, null] }],
    ['Personalizado ago–ago', null, ['2026-08', '2026-08'], { receita: [0, -100000], gastos: [0, null], saldo: 0, patrimonio: [0, null], investimentos: [0, null], reserva: [0, null] }],
    ['Personalizado set–set', null, ['2026-09', '2026-09'], { receita: [1400000, null], gastos: [50000, null], saldo: 1350000, patrimonio: [500000, null], investimentos: [0, null], reserva: [0, null] }],
    ['Personalizado ago–set', null, ['2026-08', '2026-09'], { receita: [1400000, 1300000], gastos: [50000, null], saldo: 1350000, patrimonio: [500000, null] }],
  ];
  const ROT = { receita: 'RECEITA', gastos: 'GASTOS', patrimonio: 'PATRIMÔNIO', investimentos: 'INVESTIMENTOS', reserva: 'RESERVA DE EMERGÊNCIA' };
  for (const [nome, botao, janela, ref] of VG) {
    await page.reload();
    await page.waitForTimeout(500);
    await h.ir(page, 'visao-geral');
    if (botao) await page.getByRole('radio', { name: botao, exact: true }).click();
    else {
      await page.getByRole('radio', { name: 'Escolher período' }).click();
      await page.waitForTimeout(250);
      await page.getByLabel('De', { exact: true }).selectOption(janela[0]);
      await page.getByLabel('Até', { exact: true }).selectOption(janela[1]);
      await page.getByRole('button', { name: 'Aplicar' }).click();
    }
    await page.waitForTimeout(350);
    const ls = linhas(await h.texto(page));
    for (const [chave, rot] of Object.entries(ROT)) {
      if (!ref[chave]) continue;
      const [vRef, varRef] = ref[chave];
      const i = ls.indexOf(rot);
      const valor = cent(ls[i + 1] || '');
      regDinheiro('Visão geral', nome, `${chave} (valor)`, vRef, valor);
      const prox = ls[i + 2] || '';
      let varK = null;
      if (/^R\$/.test(prox)) {
        const mag = cent(prox);
        const sentido = ls.slice(i + 3, i + 5).join(' ');
        varK = /abaixo/.test(sentido) ? -mag : mag;
      }
      if (varRef === 'NMC') {
        reg('Visão geral', nome, `${chave} (variação)`, '"Na média do costume" (a referência não mostra número)', varK === null ? 'sem variação' : brl(varK), false, 'DIFERENÇA: o Pila mostra a variação real (−R$ 7.999,85, −57,1%); regra da referência NÃO CONFIRMADA');
      } else if (varRef === null) {
        reg('Visão geral', nome, `${chave} (variação)`, 'sem período anterior', varK === null ? 'sem período anterior' : brl(varK), varK === null);
      } else {
        regDinheiro('Visão geral', nome, `${chave} (variação)`, varRef, varK);
      }
    }
    const iS = ls.indexOf('RESULTADO DO PERÍODO');
    regDinheiro('Visão geral', nome, 'saldo do período', ref.saldo, cent(ls[iS + 1] || ''));
  }

  // F) Início — card "Despesas do mês" (semente B: prevista de janeiro recebida)
  await h.semear(page, 'B');
  for (const [nome, delta, ref] of [
    ['Set/2026', -1, 4],
    ['Out/2026', 0, 53],
    ['Nov/2026', 1, 188],
    ['Dez/2026', 2, 281],
    ['Jan/2027', 3, 178],
  ]) {
    await page.reload();
    await page.waitForTimeout(500);
    await h.ir(page, 'inicio');
    await h.mudarMes(page, delta);
    const t = await h.texto(page);
    const k = (/(\d+)% do orçamento do mês/.exec(t) || [])[1];
    reg('Despesas do mês (Início)', nome, '% do orçamento', `${ref}%`, k ? `${k}%` : t.slice(0, 80), Number(k) === ref);
  }

  // G) Reserva — % e estado (meta R$ 2.400,00)
  for (const [s, total, pct, estado] of [
    ['res-100001', 100001, '42%', 'parcial'],
    ['res-120000', 120000, '50%', 'parcial'],
    ['res-238800', 238800, '100%', 'parcial'],
    ['res-240000', 240000, '100%', 'completo'],
    ['res-360000', 360000, '— (estado completo, sem número)', 'completo'],
  ]) {
    await h.semear(page, s);
    await h.ir(page, 'reserva');
    const ls = linhas(await h.texto(page));
    const pk = ls.find((l) => /^\d+%$/.test(l));
    const ek = ls.includes('COBERTURA TOTAL') ? 'completo' : ls.includes('COBERTURA PARCIAL') ? 'parcial' : '?';
    const atual = cent(ls[ls.indexOf(pk) + 1] || '');
    regDinheiro('Progresso da reserva', brl(total), 'valor guardado', total, atual);
    reg('Progresso da reserva', brl(total), 'estado', estado, ek, ek === estado);
    if (total === 360000) reg('Progresso da reserva', brl(total), '% exibido', pct, pk, false, 'DECISÃO PILA: mostra o percentual real (150%) junto do estado "Cobertura total"; a referência mostra só "100% protegido"');
    else reg('Progresso da reserva', brl(total), '% exibido', pct, pk, pk === pct);
  }
  // Meta da reserva: 1 caso de hoje + 2 da Fase 2 (mudar a configuração real foi bloqueado)
  for (const [nome, nivel, custo, ref] of [
    ['hoje: Blindado × R$ 200,00', 'blindado', 20000, 240000],
    ['Fase 2: Blindado × R$ 500,00', 'blindado', 50000, 600000],
    ['Fase 2: Básico × R$ 2.500,00', 'basico', 250000, 1500000],
  ]) {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'sementes', 'res-100001.json'), 'utf8'));
    d.reserva.config = { nivel, custoMensal: custo };
    await h.semear(page, d);
    await h.ir(page, 'reserva');
    const ls = linhas(await h.texto(page));
    const meta = cent((ls.find((l) => /^Meta R\$/.test(l)) || '').replace('Meta ', ''));
    regDinheiro('Meta da reserva', nome, 'meta', ref, meta);
  }

  // H) Metas — progresso e sugestão (semente metas; hoje = 28/10/2026)
  await h.semear(page, 'metas');
  await h.ir(page, 'metas');
  const blocos = (await h.texto(page)).split('Guardar ou tirar').map((b) => linhas(b));
  const meta = (nome) => blocos.find((b) => b.includes(nome)) || [];
  for (const [nome, guardado, total, falta] of [
    ['P1 total 20.000', 1230000, 2000000, 770000],
    ['P2 total 20.000', 1106544, 2000000, 893456],
    ['P3 total 20.000', 2000000, 2000000, null],
    ['P4 total 25.000', 2000000, 2500000, 500000],
    ['P5 total 12.000', 2000000, 1200000, null],
  ]) {
    const b = meta(nome);
    const g = cent(b.find((l) => /^R\$/.test(l)) || '');
    regDinheiro('Progresso da meta', `${brl(guardado)} de ${brl(total)}`, 'guardado', guardado, g, { inteiros: true, nota: 'a referência mostra reais inteiros no card' });
    const fl = b.find((l) => /^Falta juntar/.test(l));
    if (falta === null) reg('Progresso da meta', `${brl(guardado)} de ${brl(total)}`, 'situação', 'Meta concluída', b.includes('META ALCANÇADA') ? 'Meta alcançada' : fl, b.includes('META ALCANÇADA'));
    else regDinheiro('Progresso da meta', `${brl(guardado)} de ${brl(total)}`, 'falta', falta, fl ? cent(fl) : null, { inteiros: true, nota: 'a referência mostra reais inteiros no card' });
  }
  for (const [nome, desc, ref] of [
    ['S1', 'R$ 5.000,00 até 15/03/2027', 1000],
    ['S2', 'R$ 1.234,56 até 28/11/2026', 1235],
    ['S3', 'R$ 2.050,00 até 10/02/2027', 513],
    ['S4', 'R$ 10.000,00 até 31/10/2026', 10000],
    ['S5', 'R$ 999,99 até 31/12/2030', 20],
    ['S6 passado', 'R$ 3.000,00 até 15/09/2026', null],
  ]) {
    const b = meta(nome);
    const sug = b.find((l) => /^Separe ~R\$/.test(l));
    const k = sug ? Number((/~R\$ ([\d.]+)/.exec(sug) || [])[1].replace(/\./g, '')) : null;
    reg('Sugestão mensal da meta', desc, 'guarde ~R$ N/mês', ref === null ? 'sem sugestão' : ref, k === null ? 'sem sugestão' : k, k === ref);
  }

  // I) Calculadoras
  const csv = (n) => {
    const l = fs.readFileSync(path.join(__dirname, '../../testes/conferencia', n), 'utf8').split('\n').filter((x) => x.trim());
    const cab = l[0].split(';');
    return l.slice(1).map((x) => Object.fromEntries(cab.map((c, i) => [c, x.split(';')[i]])));
  };
  const digitos = (v) => String(cent(v.includes(',') ? v : v + ',00'));
  const pctTxt = (t, rot) => ((new RegExp(`${rot}\\n[^\\n]*\\n([\\d,]+)% do total`).exec(t) || [])[1] || null);
  for (const r of csv('juros_compostos.csv')) {
    await page.reload();
    await page.waitForTimeout(400);
    await h.ir(page, 'juros-compostos');
    await digitar(page, 'Valor inicial', digitos(r.valor_inicial));
    await digitar(page, 'Valor mensal', digitos(r.valor_mensal));
    await digitar(page, 'Taxa de juros', r.taxa.replace(',', ''));
    await page.getByLabel('Unidade da taxa').selectOption(r.unidade_taxa);
    await digitar(page, 'Período', r.periodo);
    await page.getByLabel('Unidade do período').selectOption(r.unidade_periodo);
    await page.waitForTimeout(300);
    const t = (await page.locator('section[aria-label="Resultado"]').innerText()).replace(/R\$\n/g, 'R$ ');
    const ls = linhas(t);
    const caso = `${r.id}: ${r.valor_inicial} + ${r.valor_mensal}/mês a ${r.taxa}% ${r.unidade_taxa}, ${r.periodo} ${r.unidade_periodo}`;
    regDinheiro('Juros compostos', caso, 'valor final', cent(r.ref_valor_final), cent(ls[1] || ''));
    regDinheiro('Juros compostos', caso, 'total investido', cent(r.ref_total_investido), cent(depois(ls, 'Total investido') || ''));
    regDinheiro('Juros compostos', caso, 'total em juros', cent(r.ref_total_juros), cent(depois(ls, 'Juros ganhos') || ''));
    reg('Juros compostos', caso, '% investido / % juros', `${r.ref_pct_investido} / ${r.ref_pct_juros}`, `${(depois(ls, 'Total investido', 2) || '').replace('% do total', '')} / ${(depois(ls, 'Juros ganhos', 2) || '').replace('% do total', '')}`,
      (depois(ls, 'Total investido', 2) || '').startsWith(r.ref_pct_investido + '%') && (depois(ls, 'Juros ganhos', 2) || '').startsWith(r.ref_pct_juros + '%'));
  }
  for (const r of csv('primeiro_milhao_tempo.csv')) {
    await page.reload();
    await page.waitForTimeout(400);
    await h.ir(page, 'primeiro-milhao');
    await digitar(page, 'Valor inicial', digitos(r.valor_inicial));
    await digitar(page, 'Valor mensal', digitos(r.valor_mensal));
    await digitar(page, 'Taxa de juros', r.taxa.replace(',', ''));
    await page.getByLabel('Unidade da taxa').selectOption(r.unidade_taxa);
    await page.waitForTimeout(300);
    const ls = linhas((await page.locator('section[aria-label="Resultado"]').first().innerText()));
    const caso = `${r.id}: ${r.valor_inicial} + ${r.valor_mensal}/mês a ${r.taxa}% ${r.unidade_taxa}`;
    reg('Primeiro milhão — tempo', caso, 'tempo', r.ref_tempo, ls[1], ls[1] === r.ref_tempo);
    regDinheiro('Primeiro milhão — tempo', caso, 'valor investido', cent(r.ref_investido), cent(depois(ls, 'Sai do seu bolso') || ''));
    regDinheiro('Primeiro milhão — tempo', caso, 'total em juros', cent(r.ref_juros), cent(depois(ls, 'Juros ganhos') || ''));
    const pi = (depois(ls, 'Sai do seu bolso', 2) || '').replace('% do total', '');
    const pj = (depois(ls, 'Juros ganhos', 2) || '').replace('% do total', '');
    reg('Primeiro milhão — tempo', caso, '% investido / % juros', `${r.ref_pct_investido} / ${r.ref_pct_juros}`, `${pi} / ${pj}`, pi === r.ref_pct_investido && pj === r.ref_pct_juros);
  }
  for (const r of csv('primeiro_milhao_aporte.csv')) {
    await page.reload();
    await page.waitForTimeout(400);
    await h.ir(page, 'primeiro-milhao');
    await page.getByRole('radio', { name: 'Quanto por mês' }).click();
    await page.waitForTimeout(200);
    await digitar(page, 'Valor inicial', digitos(r.valor_inicial));
    await digitar(page, 'Prazo', r.prazo);
    await page.getByLabel('Unidade do prazo').selectOption(r.unidade_prazo);
    await digitar(page, 'Taxa de juros', r.taxa.replace(',', ''));
    await page.getByLabel('Unidade da taxa').selectOption(r.unidade_taxa);
    await page.waitForTimeout(300);
    const ls = linhas((await page.locator('section[aria-label="Resultado"]').first().innerText()));
    const caso = `${r.id}: ${r.valor_inicial} em ${r.prazo} ${r.unidade_prazo} a ${r.taxa}% ${r.unidade_taxa}`;
    regDinheiro('Primeiro milhão — aporte', caso, 'aporte mensal', cent(r.ref_aporte), cent(ls[1] || ''));
    regDinheiro('Primeiro milhão — aporte', caso, 'valor investido', cent(r.ref_investido), cent(depois(ls, 'Sai do seu bolso') || ''));
    regDinheiro('Primeiro milhão — aporte', caso, 'total em juros', cent(r.ref_juros), cent(depois(ls, 'Juros ganhos') || ''));
    const pi = (depois(ls, 'Sai do seu bolso', 2) || '').replace('% do total', '');
    const pj = (depois(ls, 'Juros ganhos', 2) || '').replace('% do total', '');
    reg('Primeiro milhão — aporte', caso, '% investido / % juros', `${r.ref_pct_investido} / ${r.ref_pct_juros}`, `${pi} / ${pj}`, pi === r.ref_pct_investido && pj === r.ref_pct_juros);
  }

  const erros = page.erros;
  await browser.close();
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'saida', 'conferencia.json'), JSON.stringify({ quando: new Date().toISOString(), erros, resultados: R }, null, 1));
  const porCalc = {};
  for (const x of R) {
    porCalc[x.calculo] ??= { casos: new Set(), ok: 0, total: 0 };
    porCalc[x.calculo].casos.add(x.caso);
    porCalc[x.calculo].total++;
    if (x.ok) porCalc[x.calculo].ok++;
  }
  for (const [c, v] of Object.entries(porCalc)) console.log(`${c}: ${v.casos.size} casos · ${v.ok}/${v.total} checagens iguais`);
  for (const x of R.filter((y) => !y.ok)) console.log('DIFERENTE', x.calculo, '|', x.caso, '|', x.campo, '| ref:', x.referencia, '| pila:', x.pila, x.nota ? '| ' + x.nota : '');
  console.log('erros de página:', erros);
})();
