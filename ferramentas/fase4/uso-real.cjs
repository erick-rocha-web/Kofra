// Fase 4 — uso real: um mês de uso começando do zero, só pela interface (sem semear dados).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const h = require('./harness.cjs');

const OUT = path.join(__dirname, 'saida', 'uso-real');
fs.mkdirSync(OUT, { recursive: true });
const passos = [];
let page;

async function passo(nome, fn) {
  const antes = page.erros.length;
  try {
    const nota = await fn();
    const novos = page.erros.slice(antes);
    passos.push({ nome, ok: novos.length === 0, nota: nota || '', erros: novos });
  } catch (e) {
    passos.push({ nome, ok: false, nota: String(e).split('\n')[0].slice(0, 220), erros: page.erros.slice(antes) });
    await page.screenshot({ path: path.join(OUT, 'FALHA-' + passos.length + '.png') }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
  }
  await page.waitForTimeout(150);
}
const dlg = () => page.getByRole('dialog').last();
async function dinheiro(rotulo, digitos, raiz = dlg()) {
  const c = raiz.getByLabel(rotulo, { exact: true });
  await c.fill('');
  await c.type(digitos);
}
async function foto(nome) {
  await page.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: false });
}
async function main() {
  return (await h.texto(page)).replace(/R\$\n/g, 'R$ ');
}
function exigir(cond, msg) {
  if (!cond) throw new Error(msg);
}

(async () => {
  const browser = await chromium.launch();
  ({ page } = await h.abrir(browser, { viewport: { width: 1366, height: 900 } }));

  await passo('Início vazio abre sem erros', async () => {
    const t = await main();
    await foto('01-inicio-vazio');
    return t.slice(0, 60).replace(/\n/g, ' ');
  });

  await passo('Configurações: nome e tema escuro', async () => {
    await h.ir(page, 'configuracoes');
    const nome = page.getByLabel('Nome', { exact: true });
    await nome.fill('Erick');
    await nome.blur();
    await page.getByRole('radio', { name: /Escuro/ }).click();
    await page.waitForTimeout(200);
    const tema = await page.evaluate(() => document.documentElement.getAttribute('data-kofra-tema'));
    exigir(tema === 'escuro', 'tema não aplicado: ' + tema);
    await foto('02-config-escuro');
    await page.getByRole('radio', { name: /Claro/ }).click();
    return 'tema ' + tema + ' → claro';
  });

  await passo('Categorias: criar "Pets"', async () => {
    await h.ir(page, 'categorias');
    await page.getByRole('button', { name: /Nova categoria/ }).first().click();
    await dlg().getByLabel('Nome', { exact: true }).fill('Pets');
    await dlg().getByRole('button', { name: /Salvar|Criar/ }).last().click();
    await page.waitForTimeout(250);
    exigir((await main()).includes('Pets'), 'categoria não apareceu');
  });

  await passo('Orçamento: receita recorrente R$ 5.000,00 dia 05', async () => {
    await h.ir(page, 'orcamento');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByLabel('Data', { exact: true }).fill('2026-10-05');
    await dinheiro('Valor', '500000');
    await dlg().getByLabel('Descrição', { exact: true }).fill('Salário');
    await dlg().getByRole('switch', { name: 'Repete todo mês' }).click();
    await dlg().getByRole('radio', { name: 'Salário' }).click();
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForTimeout(250);
    exigir((await main()).includes('R$ 5.000,00'), 'receita não entrou');
  });

  await passo('Orçamento: receita prevista R$ 800,00 em 15/11 (pede o tipo de renda antes de salvar)', async () => {
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByRole('switch', { name: 'Ainda vou receber' }).click();
    await dlg().getByLabel('Data prevista', { exact: true }).fill('2026-11-15');
    await dinheiro('Valor', '80000');
    await dlg().getByLabel('Descrição', { exact: true }).fill('Freela site');
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.waitForTimeout(150);
    const aviso = await dlg().innerText();
    exigir(aviso.includes('Escolha de onde vem a receita.'), 'faltou pedir o tipo de renda');
    await dlg().getByRole('radio', { name: 'Renda extra' }).click();
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForTimeout(250);
  });

  await passo('Orçamento: despesa fixa aluguel R$ 1.800,00 dia 10', async () => {
    await page.getByRole('radio', { name: 'Fixa', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByLabel('Vencimento', { exact: true }).fill('2026-10-10');
    await dinheiro('Valor', '180000');
    await dlg().getByLabel('Descrição', { exact: true }).fill('Aluguel');
    await dlg().getByRole('radio', { name: 'Moradia' }).click();
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForTimeout(250);
  });

  await passo('Orçamento: mercado R$ 432,10 e TV R$ 2.399,90 em 10×', async () => {
    await page.getByRole('radio', { name: 'Variável', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByLabel('Data', { exact: true }).fill('2026-10-20');
    await dinheiro('Valor', '43210');
    await dlg().getByLabel('Descrição', { exact: true }).fill('Mercado do mês');
    await dlg().getByRole('radio', { name: 'Mercado' }).click();
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByRole('switch', { name: 'Compra parcelada' }).click();
    await dlg().getByLabel('Data da compra', { exact: true }).fill('2026-10-22');
    await dinheiro('Valor total', '239990');
    await dlg().getByLabel('Parcelas', { exact: true }).fill('10');
    const previa = await dlg().innerText();
    exigir(/10× de R\$ 239,99/.test(previa), 'prévia inesperada');
    await dlg().getByLabel('Descrição', { exact: true }).fill('TV');
    await dlg().getByRole('radio', { name: 'Lazer' }).click();
    await dlg().getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForTimeout(250);
    await foto('03-orcamento-variavel');
    return 'prévia: 10× de R$ 239,99';
  });

  await passo('Orçamento: investir 15% e conferir o saldo', async () => {
    const alvos = page.getByRole('button', { name: 'Ajustar quanto investir' });
    const n = await alvos.count();
    const vis = [];
    for (let i = 0; i < n; i++) vis.push(await alvos.nth(i).isVisible());
    console.log('botões investir', n, vis);
    await alvos.filter({ visible: true }).first().click();
    await dlg().getByLabel('Percentual').fill('15');
    await dlg().getByRole('button', { name: 'Salvar', exact: true }).click();
    await page.waitForTimeout(300);
    const t = await main();
    // receita 5.000 − investir 750 − (1.800 + 432,10 + 239,99) = 1.777,91
    exigir(t.includes('R$ 750,00'), 'investir ≠ 750,00');
    exigir(t.includes('R$ 1.777,91'), 'saldo ≠ 1.777,91');
    return 'investir R$ 750,00 · saldo R$ 1.777,91';
  });

  await passo('Orçamento: novembro herda recorrentes, parcela e investir', async () => {
    await h.mudarMes(page, 1);
    const t = await main();
    exigir(t.includes('Previsto R$ 800,00'), 'a receber de novembro ausente');
    // nov: receita 5.000 − 750 − (1.800 + 239,99) = 2.210,01
    exigir(t.includes('R$ 2.210,01'), 'saldo de novembro ≠ 2.210,01');
    await foto('04-orcamento-novembro');
    return 'nov: a receber R$ 800,00 · saldo R$ 2.210,01';
  });

  await passo('Orçamento: marcar a prevista como recebida', async () => {
    await page.getByRole('radio', { name: 'Receita', exact: true }).click();
    await page.getByText('Freela site').first().click();
    await dlg().getByRole('button', { name: 'Recebi', exact: true }).click();
    await page.waitForTimeout(300);
    const t = await main();
    // receita 5.800; investir 15% = 870; despesas 2.039,99 → saldo 2.890,01
    exigir(t.includes('R$ 5.800,00') && t.includes('R$ 870,00') && t.includes('R$ 2.890,01'), 'valores após receber não batem');
    return 'nov: receita R$ 5.800,00 · investir R$ 870,00 · saldo R$ 2.890,01';
  });

  await passo('Orçamento: copiar de outubro (avulsos) para dezembro', async () => {
    await h.mudarMes(page, 1);
    await page.getByRole('button', { name: /Copiar de outro mês/ }).first().click();
    await dlg().getByLabel('Copiar de').selectOption('2026-10');
    await dlg().getByRole('button', { name: /^Copiar \d/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('radio', { name: 'Variável', exact: true }).click();
    const t = await main();
    exigir(t.includes('Mercado do mês'), 'mercado não copiado');
    return 'dez: mercado copiado';
  });

  await passo('Patrimônio: conta, carro e financiamento', async () => {
    await h.ir(page, 'patrimonio');
    await h.mudarMes(page, -2);
    await page.getByRole('button', { name: /Adicionar liquidez/ }).first().click();
    await dlg().getByLabel('Nome', { exact: true }).fill('Conta corrente');
    await dinheiro(await dlg().getByText(/^Valor em/).first().innerText(), '1250000');
    await dlg().getByRole('button', { name: /Adicionar|Salvar/ }).last().click();
    await page.waitForTimeout(250);
    await page.getByRole('radio', { name: 'Bens', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByLabel('Nome', { exact: true }).fill('Carro');
    await dinheiro(await dlg().getByText(/^Valor em/).first().innerText(), '4200000');
    await dlg().getByRole('button', { name: /Adicionar|Salvar/ }).last().click();
    await page.waitForTimeout(250);
    await page.getByRole('radio', { name: 'Dívidas', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
    await dlg().waitFor();
    await page.waitForTimeout(300);
    await dlg().getByLabel('Nome', { exact: true }).fill('Financiamento');
    await dinheiro(await dlg().getByText(/^Valor em/).first().innerText(), '1800000');
    await dlg().getByRole('button', { name: /Adicionar|Salvar/ }).last().click();
    await page.waitForTimeout(300);
    const t = await main();
    exigir(/R\$ 36\.500/.test(t), 'patrimônio ≠ 36.500');
    await foto('05-patrimonio');
    return 'out: 12.500 + 42.000 − 18.000 = R$ 36.500';
  });

  await passo('Investimentos: Tesouro Selic R$ 3.000,00 → R$ 3.041,27', async () => {
    await h.ir(page, 'investimentos');
    await page.getByRole('button', { name: /Novo|Adicionar investimento/ }).first().click();
    await dlg().getByLabel('Nome', { exact: true }).fill('Tesouro Selic');
    await dlg().getByLabel('Instituição', { exact: true }).fill('Corretora');
    await dinheiro('Quanto você aplicou', '300000');
    await dinheiro(await dlg().getByText(/^Valor atual/).first().innerText(), '304127');
    await dlg().getByRole('button', { name: /Adicionar|Salvar/ }).last().click();
    await page.waitForTimeout(300);
    const t = await main();
    exigir(t.includes('+R$ 41,27') && t.includes('+1,4%'), 'rendimento ≠ +41,27 (+1,4%)');
    return 'rendimento +R$ 41,27 (+1,4%)';
  });

  await passo('Reserva: assistente (Básico, custo R$ 3.000,00, conta com R$ 4.500,00)', async () => {
    await h.ir(page, 'reserva');
    await page.getByRole('button', { name: 'Montar minha reserva' }).click();
    await dlg().getByRole('radio', { name: /Básico/ }).click();
    await dlg().getByRole('button', { name: 'Continuar' }).click();
    await dinheiro('Quanto custa um mês essencial', '300000');
    await dlg().getByRole('button', { name: 'Continuar' }).click();
    await dlg().getByLabel('Nome do local', { exact: true }).fill('Conta remunerada');
    await dinheiro('Quanto tem lá hoje', '450000');
    await dlg().getByRole('button', { name: 'Concluir' }).click();
    await page.waitForTimeout(300);
    const t = await main();
    // meta 18.000; 4.500 → 25%
    exigir(t.includes('25%') && t.includes('R$ 18.000,00'), 'reserva ≠ 25% de 18.000');
    await foto('06-reserva');
    return 'meta R$ 18.000,00 · 25%';
  });

  await passo('Metas: Viagem R$ 6.000,00 até 30/06/2027 e um aporte de R$ 1.000,00', async () => {
    await h.ir(page, 'metas');
    await page.getByRole('button', { name: /Nova meta|Criar meta/ }).first().click();
    await dlg().getByLabel('Nome', { exact: true }).fill('Viagem');
    await dinheiro('Valor total', '600000');
    await dlg().getByLabel(/Prazo/).fill('2027-06-30');
    const sugestao = await dlg().innerText();
    await dlg().getByRole('button', { name: /Criar meta|Salvar/ }).last().click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Guardar ou tirar' }).first().click();
    await dinheiro('Quanto guardou', '100000');
    await dlg().getByRole('button', { name: 'Registrar valor guardado' }).click();
    await page.waitForTimeout(200);
    await dlg().getByRole('button', { name: 'Concluir', exact: true }).click();
    await page.waitForTimeout(300);
    const t = await main();
    // falta 5.000 em 8 meses (out→jun) → 625
    exigir(t.includes('Falta juntar R$ 5.000,00') && t.includes('~R$ 625'), 'meta: falta/sugestão inesperadas');
    return (/Separe[^\n]*/.exec(sugestao) || [''])[0] + ' → depois do aporte: faltam R$ 5.000,00, ~R$ 625/mês';
  });

  await passo('Visão geral: 3 meses e período personalizado', async () => {
    await h.ir(page, 'visao-geral');
    await page.getByRole('radio', { name: '3 meses', exact: true }).click();
    await page.getByRole('radio', { name: 'Escolher período' }).click();
    await page.getByLabel('De', { exact: true }).selectOption('2026-10');
    await page.getByLabel('Até', { exact: true }).selectOption('2026-10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await page.waitForTimeout(250);
    await foto('07-visao-geral');
  });

  await passo('Ocultar valores esconde números em todas as telas', async () => {
    await h.ir(page, 'orcamento');
    await page.getByRole('button', { name: /Ocultar valores/ }).first().click();
    await page.waitForTimeout(200);
    const vazamentos = [];
    for (const r of ['inicio', 'orcamento', 'patrimonio', 'investimentos', 'reserva', 'metas', 'visao-geral']) {
      await h.ir(page, r);
      const t = await main();
      const m = t.match(/R\$ ?[\d.]+,\d\d/g) || [];
      if (m.length) vazamentos.push(`${r}: ${m.slice(0, 3).join(' ')}`);
    }
    await foto('08-ocultos');
    await page.getByRole('button', { name: /Mostrar valores/ }).first().click();
    exigir(!vazamentos.length, 'valores visíveis: ' + vazamentos.join(' | '));
  });

  await passo('Sino: avisos aparecem', async () => {
    await page.getByRole('button', { name: /Avisos|Notificações/ }).first().click();
    await page.waitForTimeout(250);
    const t = await page.locator('body').innerText();
    await foto('09-sino');
    await page.keyboard.press('Escape');
    return t.includes('vence') || t.includes('Nenhum aviso') ? 'ok' : 'texto: ' + t.slice(0, 80);
  });

  await passo('Aprender: abrir aula e marcar como lida', async () => {
    await h.ir(page, 'aprender');
    await page.locator('main ol li button').first().click();
    await page.getByRole('button', { name: 'Marcar como lida' }).click();
    await h.ir(page, 'aprender');
    exigir((await main()).includes('1 de 3 aulas lidas'), 'contador de aulas');
  });

  await passo('Assistente fora do claude.ai mostra "em breve"', async () => {
    await h.ir(page, 'assistente');
    await page.waitForTimeout(600);
    exigir((await main()).includes('chega em breve'), 'estado inesperado');
  });

  await passo('Backup: exportar, apagar tudo e importar de volta', async () => {
    await h.ir(page, 'configuracoes');
    const antes = await page.evaluate(
      () =>
        new Promise((res) => {
          const r = indexedDB.open('kofra', 1);
          r.onsuccess = () => {
            const g = r.result.transaction('dados').objectStore('dados').get('principal');
            g.onsuccess = () => res(JSON.stringify(g.result));
          };
        }),
    );
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByRole('button', { name: 'Exportar', exact: true }).click()]);
    const arq = path.join(OUT, 'backup.json');
    await download.saveAs(arq);
    const conteudo = JSON.parse(fs.readFileSync(arq, 'utf8'));
    exigir(conteudo.app === 'kofra' && conteudo.dados.lancamentos.length > 0, 'backup sem dados');
    await page.getByRole('button', { name: 'Apagar tudo', exact: true }).click();
    const palavra = dlg().getByRole('textbox');
    await palavra.fill('APAGAR');
    await dlg().getByRole('button', { name: 'Apagar tudo', exact: true }).click();
    await page.waitForTimeout(400);
    await h.ir(page, 'configuracoes');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Escolher arquivo', exact: true }).click()]);
    await chooser.setFiles(arq);
    await page.waitForTimeout(300);
    await dlg().getByRole('button', { name: /Importar|Substituir/ }).last().click();
    await page.waitForTimeout(500);
    const depois = await page.evaluate(
      () =>
        new Promise((res) => {
          const r = indexedDB.open('kofra', 1);
          r.onsuccess = () => {
            const g = r.result.transaction('dados').objectStore('dados').get('principal');
            g.onsuccess = () => res(JSON.stringify(g.result));
          };
        }),
    );
    const a = JSON.parse(antes);
    const b = JSON.parse(depois);
    for (const k of ['lancamentos', 'recorrentes', 'investir', 'patrimonio', 'ativos', 'metas']) {
      exigir(JSON.stringify(a[k]) === JSON.stringify(b[k]), `${k} diferente depois de importar`);
    }
    exigir(JSON.stringify(a.reserva) === JSON.stringify(b.reserva), 'reserva diferente');
    return `backup ${Math.round(fs.statSync(arq).size / 1024)} KB · dados idênticos após apagar e importar`;
  });

  await passo('Dados persistem depois de recarregar', async () => {
    await page.reload();
    await page.waitForTimeout(600);
    await h.ir(page, 'orcamento');
    exigir((await main()).includes('Salário'), 'dados sumiram');
  });

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify(passos, null, 1));
  for (const p of passos) console.log(p.ok ? 'OK  ' : 'FALHA', p.nome, p.nota ? '— ' + p.nota : '', p.erros.length ? '\n      erros: ' + p.erros.join(' | ').slice(0, 300) : '');
})();
