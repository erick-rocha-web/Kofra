// Fase 4 — casos novos observados na referência em 28/10/2026 (testes/conferencia/*.csv).
// Mesmo cálculo da interface, conferido aqui direto no engine.
import { describe, expect, it } from 'vitest';
import type { Dados, Lancamento, Recorrente } from '../storage/tipos';
import { c, lerCsv, num } from './csv-teste';
import { aporteParaMilhao, jurosCompostos, tempoParaMilhao, type UnidadePeriodo, type UnidadeTaxa } from './calculadoras';
import { itensDaAba, itensDoMes, porCategoria, type AbaOrcamento } from './orcamento';

describe('conferencia/juros_compostos.csv', () => {
  for (const r of lerCsv('conferencia/juros_compostos.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const res = jurosCompostos({
        inicial: c(r.valor_inicial),
        mensal: c(r.valor_mensal),
        taxa: num(r.taxa),
        unidadeTaxa: r.unidade_taxa as UnidadeTaxa,
        periodo: Number(r.periodo),
        unidadePeriodo: r.unidade_periodo as UnidadePeriodo,
      });
      if (!res.ok) throw new Error('esperava resultado');
      expect(res.final).toBe(c(r.ref_valor_final));
      expect(res.investido).toBe(c(r.ref_total_investido));
      expect(res.juros).toBe(c(r.ref_total_juros));
      expect(res.pctInvestido).toBe(num(r.ref_pct_investido));
      expect(res.pctJuros).toBe(num(r.ref_pct_juros));
    });
  }
});

describe('conferencia/primeiro_milhao_tempo.csv', () => {
  for (const r of lerCsv('conferencia/primeiro_milhao_tempo.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const res = tempoParaMilhao({ inicial: c(r.valor_inicial), mensal: c(r.valor_mensal), taxa: num(r.taxa), unidadeTaxa: r.unidade_taxa as UnidadeTaxa });
      if (!res.ok) throw new Error('esperava resultado');
      expect(res.texto).toBe(r.ref_tempo);
      expect(res.investido).toBe(c(r.ref_investido));
      expect(res.juros).toBe(c(r.ref_juros));
      expect(res.pctInvestido).toBe(num(r.ref_pct_investido));
      expect(res.pctJuros).toBe(num(r.ref_pct_juros));
    });
  }
});

describe('conferencia/primeiro_milhao_aporte.csv', () => {
  for (const r of lerCsv('conferencia/primeiro_milhao_aporte.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const res = aporteParaMilhao({
        inicial: c(r.valor_inicial),
        prazo: Number(r.prazo),
        unidadePrazo: r.unidade_prazo as UnidadePeriodo,
        taxa: num(r.taxa),
        unidadeTaxa: r.unidade_taxa as UnidadeTaxa,
      });
      if (!res.ok) throw new Error('esperava resultado');
      expect(res.aporte).toBe(c(r.ref_aporte));
      expect(res.investido).toBe(c(r.ref_investido));
      expect(res.juros).toBe(c(r.ref_juros));
      expect(res.pctInvestido).toBe(num(r.ref_pct_investido));
      expect(res.pctJuros).toBe(num(r.ref_pct_juros));
    });
  }
});

/* Gráfico por aba do Orçamento */
type DadosOrc = Pick<Dados, 'lancamentos' | 'recorrentes' | 'investir'>;
let seq = 0;
function mesDosItens(itens: string, mes: string): DadosOrc {
  const d: DadosOrc = { lancamentos: [], recorrentes: [], investir: [] };
  const lanc = (p: Partial<Lancamento> & Pick<Lancamento, 'natureza' | 'valor' | 'data' | 'categoriaId'>): Lancamento => ({ id: `l${++seq}`, descricao: 't', criadoEm: '', ...p });
  for (const parte of itens.split('|')) {
    const m = /^(.*) \(([\w-]+), ([^)]+)\):([\d.,]+)$/.exec(parte.trim());
    if (!m) throw new Error(`Item inválido: ${parte}`);
    const [, , tipo, cat, valorTxt] = m;
    const valor = c(valorTxt);
    if (tipo === 'fixa') {
      const r: Recorrente = { id: `r${++seq}`, natureza: 'despesa', inicio: mes, fim: null, versoes: [{ aPartirDe: mes, descricao: 't', valor, dia: 10, categoriaId: cat }], criadoEm: '' };
      d.recorrentes.push(r);
    } else if (tipo === 'variavel') d.lancamentos.push(lanc({ natureza: 'despesa', valor, data: `${mes}-15`, categoriaId: cat }));
    else if (tipo === 'parcela')
      d.lancamentos.push(lanc({ natureza: 'despesa', valor, data: `${mes}-01`, categoriaId: cat, parcela: { grupoId: `g${seq}`, numero: 1, total: 2, valorTotal: valor * 2, dataCompra: `${mes}-01` } }));
    else if (tipo === 'receita') d.lancamentos.push(lanc({ natureza: 'receita', valor, data: `${mes}-05`, categoriaId: cat }));
    else if (tipo === 'prevista-pendente') d.lancamentos.push(lanc({ natureza: 'receita', valor, data: `${mes}-20`, categoriaId: cat, prevista: { recebida: false } }));
    else if (tipo === 'prevista-recebida') d.lancamentos.push(lanc({ natureza: 'receita', valor, data: `${mes}-20`, categoriaId: cat, prevista: { recebida: true } }));
    else throw new Error(`Tipo desconhecido: ${tipo}`);
  }
  return d;
}

describe('conferencia/orcamento_categorias.csv — cada aba tem o seu gráfico', () => {
  for (const r of lerCsv('conferencia/orcamento_categorias.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const d = mesDosItens(r.itens, r.mes);
      const fatias = porCategoria(itensDaAba(itensDoMes(d, r.mes), r.aba as AbaOrcamento));
      expect(fatias.map((f) => `${f.categoriaId}:${f.pct}`).join('|')).toBe(r.obs_percentuais);
    });
  }
});
