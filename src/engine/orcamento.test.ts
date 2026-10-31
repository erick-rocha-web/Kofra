import { describe, expect, it } from 'vitest';
import type { AjusteInvestir, Dados, Lancamento, Recorrente } from '../storage/tipos';
import { c, centavos, dataCsv, lerCsv, num } from './csv-teste';
import { porcentagem } from './dinheiro';
import { formatarValor } from './formato';
import {
  ajusteInvestirNoMes,
  gerarParcelas,
  itensDaAba,
  itensDoMes,
  parcelaPadrao,
  porCategoria,
  resumoMes,
  versaoNoMes,
  type AbaOrcamento,
} from './orcamento';

type DadosOrc = Pick<Dados, 'lancamentos' | 'recorrentes' | 'investir'>;
const vazio = (): DadosOrc => ({ lancamentos: [], recorrentes: [], investir: [] });
let seq = 0;
const lanc = (p: Partial<Lancamento> & Pick<Lancamento, 'natureza' | 'valor' | 'data'>): Lancamento => ({
  id: `l${++seq}`,
  descricao: 'teste',
  categoriaId: 'cat',
  criadoEm: '',
  ...p,
});
const recorrente = (natureza: 'receita' | 'despesa', inicio: string, valor: number, dia = 10, categoriaId = 'cat'): Recorrente => ({
  id: `r${++seq}`,
  natureza,
  inicio,
  fim: null,
  versoes: [{ aPartirDe: inicio, descricao: 'teste', valor, dia, categoriaId }],
  criadoEm: '',
});

describe('orcamento_saldo.csv — saldo = receita − fixas − variáveis − investir', () => {
  for (const r of lerCsv('orcamento_saldo.csv')) {
    it(`${r.id} (${r.papel}) ${r.descricao}`, () => {
      const d = vazio();
      const mes = r.mes;
      if (c(r.receita)) d.lancamentos.push(lanc({ natureza: 'receita', valor: c(r.receita), data: `${mes}-05` }));
      if (c(r.despesas_fixas)) d.recorrentes.push(recorrente('despesa', mes, c(r.despesas_fixas)));
      if (c(r.despesas_variaveis)) d.lancamentos.push(lanc({ natureza: 'despesa', valor: c(r.despesas_variaveis), data: `${mes}-15` }));
      d.investir.push({ mes, modo: 'valor', percentual: 0, valor: c(r.investir) });
      const res = resumoMes(d, mes);
      expect(res.saldo).toBe(c(r.obs_saldo));
      if (r.obs_despesas) expect(res.despesas).toBe(c(r.obs_despesas));
    });
  }
});

describe('orcamento_investir.csv — percentual com meio centavo para cima, ou valor fixo', () => {
  for (const r of lerCsv('orcamento_investir.csv')) {
    it(`${r.id} (${r.papel}) ${r.descricao}`, () => {
      const d = vazio();
      const receita = c(r.receita);
      d.lancamentos.push(lanc({ natureza: 'receita', valor: receita, data: `${r.mes}-05` }));
      if (r.modo === 'percentual') d.investir.push({ mes: r.mes, modo: 'percentual', percentual: num(r.percentual), valor: 0 });
      if (r.modo === 'fixo') d.investir.push({ mes: r.mes, modo: 'valor', percentual: 0, valor: c(r.valor_fixo) });
      // "nenhum": um ajuste num mês posterior não pode valer para trás
      if (r.modo === 'nenhum') d.investir.push({ mes: '2026-10', modo: 'percentual', percentual: 30, valor: 0 });
      const res = resumoMes(d, r.mes);
      expect(res.investir).toBe(c(r.obs_investir));
      if (r.obs_percentual_exibido) expect(porcentagem(res.investir, receita, 1)).toBe(num(r.obs_percentual_exibido));
    });
  }
});

describe('orcamento_receita_prevista.csv — prevista só conta depois de recebida', () => {
  for (const r of lerCsv('orcamento_receita_prevista.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const d = vazio();
      d.lancamentos.push(lanc({ natureza: 'receita', valor: c(r.receitas_confirmadas), data: `${r.mes}-05` }));
      const pend = c(r.receitas_previstas_pendentes);
      if (pend) d.lancamentos.push(lanc({ natureza: 'receita', valor: pend, data: `${r.mes}-28`, prevista: { recebida: false } }));
      const res = resumoMes(d, r.mes);
      expect(res.receita).toBe(c(r.obs_receita));
      if (r.obs_a_receber) expect(res.aReceber).toBe(c(r.obs_a_receber));
    });
  }
});

/**
 * Monta um mês a partir da coluna "itens": "Nome (tipo, Categoria):valor|…".
 * Tipos: receita, prevista-pendente, prevista-recebida, fixa, variavel, parcela.
 * A categoria vira o próprio id, para o resultado sair com o nome que a referência mostrou.
 */
function mesDosItens(itens: string, mes: string): DadosOrc {
  const d = vazio();
  for (const parte of itens.split('|')) {
    const m = /^(.*) \(([\w-]+), ([^)]+)\):([\d.,]+)$/.exec(parte.trim());
    if (!m) throw new Error(`Item inválido: ${parte}`);
    const [, nome, tipo, cat, valorTxt] = m;
    const valor = c(valorTxt);
    const base = { descricao: nome, valor, categoriaId: cat };
    if (tipo === 'fixa') d.recorrentes.push({ ...recorrente('despesa', mes, valor, 10, cat) });
    else if (tipo === 'variavel') d.lancamentos.push(lanc({ ...base, natureza: 'despesa', data: `${mes}-15` }));
    else if (tipo === 'parcela')
      d.lancamentos.push(
        lanc({ ...base, natureza: 'despesa', data: `${mes}-01`, parcela: { grupoId: 'g', numero: 1, total: 3, valorTotal: valor * 3, dataCompra: `${mes}-01` } }),
      );
    else if (tipo === 'receita') d.lancamentos.push(lanc({ ...base, natureza: 'receita', data: `${mes}-05` }));
    else if (tipo === 'prevista-pendente') d.lancamentos.push(lanc({ ...base, natureza: 'receita', data: `${mes}-20`, prevista: { recebida: false } }));
    else if (tipo === 'prevista-recebida') d.lancamentos.push(lanc({ ...base, natureza: 'receita', data: `${mes}-20`, prevista: { recebida: true } }));
    else throw new Error(`Tipo desconhecido: ${tipo}`);
  }
  return d;
}

describe('orcamento_categorias.csv — cada aba tem o seu gráfico; % inteiro sobre o total da aba', () => {
  for (const r of lerCsv('orcamento_categorias.csv')) {
    it(`${r.id} (${r.aba}) ${r.descricao.slice(0, 60)}`, () => {
      const d = mesDosItens(r.itens, r.mes);
      const fatias = porCategoria(itensDaAba(itensDoMes(d, r.mes), r.aba as AbaOrcamento));
      expect(fatias.map((f) => `${f.categoriaId}:${f.pct}`).join('|')).toBe(r.obs_percentuais);
    });
  }
});

describe('parcelamento.csv — 1ª parcela absorve a sobra; dia 1º de cada mês', () => {
  for (const r of lerCsv('parcelamento.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const total = c(r.valor_total);
      const n = Number(r.parcelas);
      const dataCompra = r.data_compra.includes('/') ? dataCsv(r.data_compra) : `${r.data_compra}-15`;
      const p = gerarParcelas(total, n, dataCompra);
      expect(`${n}x de ${formatarValor(parcelaPadrao(total, n))}`).toBe(r.obs_previa);
      expect(p[0].valor).toBe(c(r.obs_parcela_1));
      expect(p[1].valor).toBe(c(r.obs_parcela_2));
      if (r.obs_parcela_3) expect(p[2].valor).toBe(c(r.obs_parcela_3));
      expect(p[0].data).toBe(dataCsv(r.obs_data_parcela_1));
      expect(p[1].data).toBe(dataCsv(r.obs_data_parcela_2));
      expect(p.reduce((s, x) => s + x.valor, 0)).toBe(total);
    });
  }
});

describe('regras do Pila', () => {
  it('recorrente: versões valem do mês em diante; fim encerra', () => {
    const r = recorrente('despesa', '2026-10', 150000, 10);
    r.versoes.push({ aPartirDe: '2027-01', descricao: 'reajuste', valor: 160000, dia: 10, categoriaId: 'cat' });
    expect(versaoNoMes(r, '2026-09')).toBeNull();
    expect(versaoNoMes(r, '2026-12')?.valor).toBe(150000);
    expect(versaoNoMes(r, '2027-03')?.valor).toBe(160000);
    r.fim = '2027-02';
    expect(versaoNoMes(r, '2027-03')).toBeNull();
  });
  it('dia 31 vira o último dia do mês curto', () => {
    const d = vazio();
    d.recorrentes.push(recorrente('despesa', '2027-01', 1000, 31));
    expect(itensDoMes(d, '2027-02')[0].data).toBe('2027-02-28');
  });
  it('investir vale deste mês em diante até o próximo ajuste (decisão do Checkpoint 2)', () => {
    const ajustes: AjusteInvestir[] = [
      { mes: '2026-10', modo: 'percentual', percentual: 30, valor: 0 },
      { mes: '2027-01', modo: 'percentual', percentual: 20, valor: 0 },
    ];
    expect(ajusteInvestirNoMes(ajustes, '2026-09')).toBeNull();
    expect(ajusteInvestirNoMes(ajustes, '2026-12')?.percentual).toBe(30);
    expect(ajusteInvestirNoMes(ajustes, '2027-05')?.percentual).toBe(20);
    // mudar novembro para 25% vale para nov e dez; janeiro mantém o ajuste próprio
    ajustes.push({ mes: '2026-11', modo: 'percentual', percentual: 25, valor: 0 });
    expect(ajusteInvestirNoMes(ajustes, '2026-12')?.percentual).toBe(25);
    expect(ajusteInvestirNoMes(ajustes, '2027-01')?.percentual).toBe(20);
  });
  it('centavos() aceita vazio', () => {
    expect(centavos('')).toBeNull();
  });
});
