import type { Dados, GrupoPatrimonio, ItemPatrimonio, ValorMensal } from '../storage/tipos';
import type { Mes } from './datas';
import { porcentagem, somar, type Centavos } from './dinheiro';
import { ROTULO_TIPO, TIPOS_ATIVO, resumoInvestimentos } from './investimentos';

/** Valor no mês: o último registro até ele; null se o item ainda não existia ou já saiu. */
export function valorNoMes(valores: ValorMensal[], mes: Mes, fim: Mes | null = null): Centavos | null {
  if (fim && mes > fim) return null;
  let escolhido: ValorMensal | null = null;
  for (const v of valores) {
    if (v.mes <= mes && (!escolhido || v.mes >= escolhido.mes)) escolhido = v;
  }
  return escolhido ? escolhido.valor : null;
}

export interface LinhaPatrimonio {
  item: ItemPatrimonio;
  valor: Centavos;
  /** O valor foi registrado neste mês (true) ou veio de um mês anterior (false). */
  registradoNoMes: boolean;
}

export function itensNoMes(d: Pick<Dados, 'patrimonio'>, mes: Mes, grupo?: GrupoPatrimonio): LinhaPatrimonio[] {
  const linhas: LinhaPatrimonio[] = [];
  for (const item of d.patrimonio) {
    if (grupo && item.grupo !== grupo) continue;
    const valor = valorNoMes(item.valores, mes, item.fim);
    if (valor === null) continue;
    linhas.push({ item, valor, registradoNoMes: item.valores.some((v) => v.mes === mes) });
  }
  return linhas.sort((a, b) => b.valor - a.valor);
}

export interface ResumoPatrimonio {
  liquidez: Centavos;
  investimentos: Centavos;
  bens: Centavos;
  dividas: Centavos;
  /** liquidez + investimentos + bens − dívidas (CONFIRMADO na Fase 2). */
  total: Centavos;
}

export function resumoPatrimonio(d: Pick<Dados, 'patrimonio' | 'ativos'>, mes: Mes): ResumoPatrimonio {
  const soma = (g: GrupoPatrimonio) => somar(itensNoMes(d, mes, g).map((l) => l.valor));
  const liquidez = soma('liquidez');
  const bens = soma('bem');
  const dividas = soma('divida');
  const investimentos = resumoInvestimentos(d, mes).atual;
  return { liquidez, investimentos, bens, dividas, total: liquidez + investimentos + bens - dividas };
}

export interface ParteComposicao {
  id: string;
  rotulo: string;
  grupo: 'liquidez' | 'investimentos' | 'bens';
  valor: Centavos;
  /** % inteiro sobre (liquidez + investimentos + bens); dívidas ficam fora. */
  pct: number;
}

/** Composição como na referência: itens de liquidez e bens + investimentos agrupados por tipo. */
export function composicaoDetalhada(d: Pick<Dados, 'patrimonio' | 'ativos'>, mes: Mes): ParteComposicao[] {
  const partes: Omit<ParteComposicao, 'pct'>[] = [];
  for (const l of itensNoMes(d, mes, 'liquidez')) partes.push({ id: l.item.id, rotulo: l.item.nome, grupo: 'liquidez', valor: l.valor });
  for (const t of resumoInvestimentos(d, mes).porTipo)
    partes.push({ id: `tipo:${t.tipo}`, rotulo: ROTULO_TIPO[t.tipo], grupo: 'investimentos', valor: t.atual });
  for (const l of itensNoMes(d, mes, 'bem')) partes.push({ id: l.item.id, rotulo: l.item.nome, grupo: 'bens', valor: l.valor });
  const base = somar(partes.map((p) => p.valor));
  return partes
    .map((p) => ({ ...p, pct: porcentagem(p.valor, base, 0) ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
}

export const GRUPOS_COMPOSICAO = [
  { grupo: 'liquidez' as const, rotulo: 'Liquidez', cor: 'c1' },
  { grupo: 'investimentos' as const, rotulo: 'Investimentos', cor: 'c3' },
  { grupo: 'bens' as const, rotulo: 'Bens', cor: 'c2' },
];

export { TIPOS_ATIVO };
