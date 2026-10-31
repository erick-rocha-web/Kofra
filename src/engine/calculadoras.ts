import Decimal from 'decimal.js';
import type { Centavos } from './dinheiro';
import { textoTempo } from './formato';

/** Instância própria: precisão alta e meio para cima, sem mexer na configuração global. */
const D = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP });
type Dec = InstanceType<typeof D>;

export type UnidadeTaxa = 'mensal' | 'anual';
export type UnidadePeriodo = 'meses' | 'anos';

const META_MILHAO_CENTAVOS = 100_000_000;
const LIMITE_MESES = 1200; // 100 anos

/** Taxa mensal: a própria (mensal) ou a equivalente (1 + anual)^(1/12) − 1. */
export function taxaMensal(taxaPct: number, unidade: UnidadeTaxa): Dec {
  const t = new D(taxaPct).div(100);
  return unidade === 'mensal' ? t : t.plus(1).pow(new D(1).div(12)).minus(1);
}

const paraCentavos = (reais: Dec): Centavos => reais.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
const pct1 = (parte: Dec, total: Dec): number => (total.isZero() ? 0 : parte.div(total).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber());

/* ───────────── Juros compostos ───────────── */

export interface EntradaJuros {
  inicial: Centavos;
  mensal: Centavos;
  taxa: number;
  unidadeTaxa: UnidadeTaxa;
  periodo: number;
  unidadePeriodo: UnidadePeriodo;
}

export interface LinhaMes {
  mes: number;
  juros: Centavos;
  investido: Centavos;
  acumulado: Centavos;
}

export type ResultadoJuros =
  | { ok: false; motivo: 'taxa-periodo' }
  | {
      ok: true;
      meses: number;
      final: Centavos;
      investido: Centavos;
      juros: Centavos;
      pctInvestido: number;
      pctJuros: number;
      linhas: LinhaMes[];
    };

/**
 * Mês a mês: juros = saldo anterior × i; saldo = saldo anterior × (1 + i) + aporte.
 * Sem arredondar no meio do caminho (CONFIRMADO: 6 casos + 131 linhas de tabela).
 */
export function jurosCompostos(e: EntradaJuros): ResultadoJuros {
  if (!(e.taxa > 0) || !(e.periodo > 0)) return { ok: false, motivo: 'taxa-periodo' };
  const n = e.unidadePeriodo === 'meses' ? Math.round(e.periodo) : Math.round(e.periodo * 12);
  const i = taxaMensal(e.taxa, e.unidadeTaxa);
  const pmt = new D(e.mensal).div(100);
  let saldo = new D(e.inicial).div(100);
  const linhas: LinhaMes[] = [];
  for (let m = 1; m <= n; m++) {
    const juros = saldo.times(i);
    saldo = saldo.plus(juros).plus(pmt);
    linhas.push({ mes: m, juros: paraCentavos(juros), investido: e.inicial + e.mensal * m, acumulado: paraCentavos(saldo) });
  }
  const investido = e.inicial + e.mensal * n;
  const investidoDec = new D(investido).div(100);
  return {
    ok: true,
    meses: n,
    final: paraCentavos(saldo),
    investido,
    juros: paraCentavos(saldo.minus(investidoDec)),
    pctInvestido: pct1(investidoDec, saldo),
    pctJuros: pct1(saldo.minus(investidoDec), saldo),
    linhas,
  };
}

/** Pontos para o gráfico: mês a mês até 2 anos; depois, o fim de cada ano (e o último mês). */
export function pontosDoGrafico(linhas: LinhaMes[], inicial: Centavos): { rotulo: string; investido: Centavos; acumulado: Centavos }[] {
  const inicio = { rotulo: 'Início', investido: inicial, acumulado: inicial };
  if (linhas.length <= 24) {
    return [inicio, ...linhas.map((l) => ({ rotulo: `Mês ${l.mes}`, investido: l.investido, acumulado: l.acumulado }))];
  }
  const pontos = linhas.filter((l) => l.mes % 12 === 0 || l.mes === linhas.length);
  return [
    inicio,
    ...pontos.map((l) => ({
      rotulo: l.mes % 12 === 0 ? `Ano ${l.mes / 12}` : `Mês ${l.mes}`,
      investido: l.investido,
      acumulado: l.acumulado,
    })),
  ];
}

/* ───────────── Primeiro milhão ───────────── */

export interface EntradaTempo {
  inicial: Centavos;
  mensal: Centavos;
  taxa: number;
  unidadeTaxa: UnidadeTaxa;
}

export interface Composicao {
  investido: Centavos;
  juros: Centavos;
  pctInvestido: number;
  pctJuros: number;
}

function composicaoNaMeta(investido: Centavos): Composicao {
  const inv = new D(investido);
  const meta = new D(META_MILHAO_CENTAVOS);
  return {
    investido,
    juros: META_MILHAO_CENTAVOS - investido,
    pctInvestido: pct1(inv, meta),
    pctJuros: pct1(meta.minus(inv), meta),
  };
}

export type ResultadoTempo =
  | { ok: false; motivo: 'ja-atingiu' | 'inalcancavel' }
  | ({ ok: true; meses: number; texto: string } & Composicao);

/** Menor número de meses (até 1.200) para chegar a R$ 1 milhão (CONFIRMADO, inclusive o limite). */
export function tempoParaMilhao(e: EntradaTempo): ResultadoTempo {
  if (e.inicial >= META_MILHAO_CENTAVOS) return { ok: false, motivo: 'ja-atingiu' };
  const i = taxaMensal(e.taxa, e.unidadeTaxa);
  const pmt = new D(e.mensal).div(100);
  const meta = new D(1_000_000);
  let saldo = new D(e.inicial).div(100);
  for (let n = 1; n <= LIMITE_MESES; n++) {
    saldo = saldo.times(i.plus(1)).plus(pmt);
    if (saldo.gte(meta)) {
      return { ok: true, meses: n, texto: textoTempo(n), ...composicaoNaMeta(e.inicial + e.mensal * n) };
    }
  }
  return { ok: false, motivo: 'inalcancavel' };
}

export interface EntradaAporte {
  inicial: Centavos;
  prazo: number;
  unidadePrazo: UnidadePeriodo;
  taxa: number;
  unidadeTaxa: UnidadeTaxa;
}

export type ResultadoAporte =
  | { ok: false; motivo: 'prazo' }
  | ({ ok: true; suficiente: boolean; aporte: Centavos; meses: number } & Composicao);

/**
 * Aporte mensal para chegar a R$ 1 milhão no prazo: PMT = (meta − PV·(1+i)^n)·i ÷ ((1+i)^n − 1).
 * O investido usa o aporte sem arredondar (CONFIRMADO). Taxa zero: (meta − PV) ÷ n (DECISÃO PILA).
 */
export function aporteParaMilhao(e: EntradaAporte): ResultadoAporte {
  const n = e.unidadePrazo === 'meses' ? Math.round(e.prazo) : Math.round(e.prazo * 12);
  if (!(n >= 1)) return { ok: false, motivo: 'prazo' };
  const i = taxaMensal(Math.max(0, e.taxa), e.unidadeTaxa);
  const pv = new D(e.inicial).div(100);
  const meta = new D(1_000_000);
  const fator = i.plus(1).pow(n);
  if (pv.times(fator).gte(meta)) {
    return { ok: true, suficiente: true, aporte: 0, meses: n, ...composicaoNaMeta(e.inicial) };
  }
  const pmt = i.isZero() ? meta.minus(pv).div(n) : meta.minus(pv.times(fator)).times(i).div(fator.minus(1));
  const investido = paraCentavos(pv.plus(pmt.times(n)));
  return { ok: true, suficiente: false, aporte: paraCentavos(pmt), meses: n, ...composicaoNaMeta(investido) };
}
