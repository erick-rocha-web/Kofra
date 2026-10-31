import { describe, expect, it } from 'vitest';
import { c, lerCsv, num } from './csv-teste';
import { aporteParaMilhao, jurosCompostos, tempoParaMilhao, type EntradaJuros } from './calculadoras';

const casosJuros = new Map<string, EntradaJuros>();

describe('juros_compostos.csv — saldo × (1 + i) + aporte, mês a mês', () => {
  for (const r of lerCsv('juros_compostos.csv')) {
    const e: EntradaJuros = {
      inicial: c(r.valor_inicial),
      mensal: c(r.valor_mensal),
      taxa: num(r.taxa),
      unidadeTaxa: r.unidade_taxa as 'mensal' | 'anual',
      periodo: Number(r.periodo),
      unidadePeriodo: r.unidade_periodo as 'meses' | 'anos',
    };
    casosJuros.set(r.id, e);
    it(`${r.id} (${r.papel}) ${r.descricao}`, () => {
      const res = jurosCompostos(e);
      if (r.obs_aviso) {
        expect(res.ok).toBe(false);
        return;
      }
      if (!res.ok) throw new Error('esperava resultado');
      expect(res.final).toBe(c(r.obs_valor_final));
      expect(res.investido).toBe(c(r.obs_total_investido));
      expect(res.juros).toBe(c(r.obs_total_juros));
      expect(res.pctInvestido).toBe(num(r.obs_pct_investido));
      expect(res.pctJuros).toBe(num(r.obs_pct_juros));
    });
  }
});

describe('juros_compostos_mes_a_mes.csv — 131 linhas da tabela mês a mês', () => {
  const linhas = lerCsv('juros_compostos_mes_a_mes.csv');
  it(`confere ${linhas.length} linhas (juros do mês, investido, acumulado)`, () => {
    const cache = new Map<string, ReturnType<typeof jurosCompostos>>();
    for (const r of linhas) {
      if (!cache.has(r.caso)) cache.set(r.caso, jurosCompostos(casosJuros.get(r.caso)!));
      const res = cache.get(r.caso)!;
      if (!res.ok) throw new Error(`caso ${r.caso} sem resultado`);
      const l = res.linhas[Number(r.mes) - 1];
      expect([r.caso, r.mes, l.juros, l.investido, l.acumulado]).toEqual([r.caso, r.mes, c(r.obs_juros_mes), c(r.obs_total_investido), c(r.obs_total_acumulado)]);
    }
  });
});

describe('primeiro_milhao_tempo.csv — menor nº de meses até R$ 1 milhão (máx. 1.200)', () => {
  for (const r of lerCsv('primeiro_milhao_tempo.csv')) {
    it(`${r.id} (${r.papel}) ${r.descricao || r.obs_tempo || r.obs_aviso}`, () => {
      const res = tempoParaMilhao({ inicial: c(r.valor_inicial), mensal: c(r.valor_mensal), taxa: num(r.taxa), unidadeTaxa: r.unidade_taxa as 'mensal' | 'anual' });
      if (r.obs_aviso) {
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.motivo).toBe(r.obs_aviso.startsWith('valor inicial') ? 'ja-atingiu' : 'inalcancavel');
        return;
      }
      if (!res.ok) throw new Error('esperava resultado');
      expect(res.texto).toBe(r.obs_tempo);
      expect(res.investido).toBe(c(r.obs_investido));
      expect(res.juros).toBe(c(r.obs_juros));
      if (r.obs_pct_investido) expect(res.pctInvestido).toBe(num(r.obs_pct_investido));
      if (r.obs_pct_juros) expect(res.pctJuros).toBe(num(r.obs_pct_juros));
    });
  }
});

describe('primeiro_milhao_aporte.csv — aporte da série que chega a R$ 1 milhão no prazo', () => {
  for (const r of lerCsv('primeiro_milhao_aporte.csv')) {
    it(`${r.id} (${r.papel})`, () => {
      const res = aporteParaMilhao({
        inicial: c(r.valor_inicial),
        prazo: Number(r.prazo),
        unidadePrazo: r.unidade_prazo as 'anos' | 'meses',
        taxa: num(r.taxa),
        unidadeTaxa: r.unidade_taxa as 'mensal' | 'anual',
      });
      if (!res.ok) throw new Error('esperava resultado');
      if (r.obs_aviso) expect(res.suficiente).toBe(true);
      else expect(res.aporte).toBe(c(r.obs_aporte));
      expect(res.investido).toBe(c(r.obs_investido));
      expect(res.juros).toBe(c(r.obs_juros));
      if (r.obs_pct_investido) expect(res.pctInvestido).toBe(num(r.obs_pct_investido));
      if (r.obs_pct_juros) expect(res.pctJuros).toBe(num(r.obs_pct_juros));
    });
  }
  it('taxa zero divide o que falta pelo prazo (decisão Pila)', () => {
    const res = aporteParaMilhao({ inicial: 0, prazo: 10, unidadePrazo: 'anos', taxa: 0, unidadeTaxa: 'mensal' });
    if (!res.ok) throw new Error('esperava resultado');
    expect(res.aporte).toBe(833333);
  });
});
