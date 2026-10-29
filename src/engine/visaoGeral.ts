import type { Dados } from '../storage/tipos';
import { diferencaMeses, listarMeses, nomeMes, somarMeses, type Mes } from './datas';
import { porcentagem, somar, type Centavos } from './dinheiro';
import { resumoMes } from './orcamento';
import { resumoPatrimonio } from './patrimonio';
import { valorReservaNoFimDoMes } from './reserva';

export type Periodo =
  | { tipo: 'mes' }
  | { tipo: 'meses'; n: 3 | 6 | 12 }
  | { tipo: 'personalizado'; inicio: Mes; fim: Mes };

export interface Janela {
  inicio: Mes;
  fim: Mes;
  /** quantidade de meses */
  n: number;
}

/** A janela sempre termina no mês atual, exceto a personalizada (até o mês atual). */
export function janelaDoPeriodo(p: Periodo, mesAtual: Mes): Janela {
  if (p.tipo === 'personalizado') {
    const fim = p.fim > mesAtual ? mesAtual : p.fim;
    const inicio = p.inicio > fim ? fim : p.inicio;
    return { inicio, fim, n: diferencaMeses(inicio, fim) + 1 };
  }
  const n = p.tipo === 'mes' ? 1 : p.n;
  return { inicio: somarMeses(mesAtual, -(n - 1)), fim: mesAtual, n };
}

/** Janela anterior: mesmo tamanho, imediatamente antes (CONFIRMADO). */
export function janelaAnterior(j: Janela): Janela {
  return { inicio: somarMeses(j.inicio, -j.n), fim: somarMeses(j.inicio, -1), n: j.n };
}

export type Variacao = { semAnterior: true } | { semAnterior: false; valor: Centavos; pct: number | null };

/** Variação contra o período anterior; zero no anterior = "sem período anterior" (CONFIRMADO, card a card). */
export function variacao(atual: Centavos, anterior: Centavos): Variacao {
  if (anterior === 0) return { semAnterior: true };
  return { semAnterior: false, valor: atual - anterior, pct: porcentagem(atual - anterior, Math.abs(anterior), 1) };
}

export interface MesFluxo {
  mes: Mes;
  receita: Centavos;
  gastos: Centavos;
  saldo: Centavos;
}

export interface ResumoFluxo {
  receita: Centavos;
  gastos: Centavos;
  /** receita − gastos: não desconta o investir (CONFIRMADO). */
  saldo: Centavos;
  receitaAnterior: Centavos;
  gastosAnterior: Centavos;
  variacaoReceita: Variacao;
  variacaoGastos: Variacao;
  porMes: MesFluxo[];
}

type DadosVG = Pick<Dados, 'lancamentos' | 'recorrentes' | 'investir'>;

function fluxoDoMes(d: DadosVG, mes: Mes): MesFluxo {
  const r = resumoMes(d, mes);
  return { mes, receita: r.receita, gastos: r.despesas, saldo: r.receita - r.despesas };
}

export function resumoFluxo(d: DadosVG, j: Janela): ResumoFluxo {
  const porMes = listarMeses(j.inicio, j.fim).map((m) => fluxoDoMes(d, m));
  const ant = janelaAnterior(j);
  const anteriores = listarMeses(ant.inicio, ant.fim).map((m) => fluxoDoMes(d, m));
  const receita = somar(porMes.map((m) => m.receita));
  const gastos = somar(porMes.map((m) => m.gastos));
  const receitaAnterior = somar(anteriores.map((m) => m.receita));
  const gastosAnterior = somar(anteriores.map((m) => m.gastos));
  return {
    receita,
    gastos,
    saldo: receita - gastos,
    receitaAnterior,
    gastosAnterior,
    variacaoReceita: variacao(receita, receitaAnterior),
    variacaoGastos: variacao(gastos, gastosAnterior),
    porMes,
  };
}

export interface Estoque {
  valor: Centavos;
  anterior: Centavos;
  variacao: Variacao;
}

/** Patrimônio, investimentos e reserva: valor no último mês da janela contra o último da janela anterior. */
export function estoques(d: Pick<Dados, 'patrimonio' | 'ativos' | 'reserva'>, j: Janela): {
  patrimonio: Estoque;
  investimentos: Estoque;
  reserva: Estoque;
} {
  const fimAnt = janelaAnterior(j).fim;
  const pAt = resumoPatrimonio(d, j.fim);
  const pAnt = resumoPatrimonio(d, fimAnt);
  const rAt = valorReservaNoFimDoMes(d, j.fim);
  const rAnt = valorReservaNoFimDoMes(d, fimAnt);
  const temPatrimonioAnterior = pAnt.liquidez + pAnt.investimentos + pAnt.bens + pAnt.dividas > 0;
  const variacaoPatrimonio: Variacao = !temPatrimonioAnterior
    ? { semAnterior: true }
    : {
        semAnterior: false,
        valor: pAt.total - pAnt.total,
        pct: pAnt.total !== 0 ? porcentagem(pAt.total - pAnt.total, Math.abs(pAnt.total), 1) : null,
      };
  return {
    patrimonio: { valor: pAt.total, anterior: pAnt.total, variacao: variacaoPatrimonio },
    investimentos: { valor: pAt.investimentos, anterior: pAnt.investimentos, variacao: variacao(pAt.investimentos, pAnt.investimentos) },
    reserva: { valor: rAt, anterior: rAnt, variacao: variacao(rAt, rAnt) },
  };
}

/** "comparado com o mês anterior" / "com os 3 meses anteriores (mai–jul/2026)". */
export function textoComparacao(j: Janela): string {
  const a = janelaAnterior(j);
  if (j.n === 1) return `Comparado com ${nomeMes(a.inicio)}`;
  return `Comparado com os ${j.n} meses anteriores (${nomeMes(a.inicio, 'sigla')}–${nomeMes(a.fim, 'curto')})`;
}
