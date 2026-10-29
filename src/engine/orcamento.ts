import type { AjusteInvestir, Dados, Id, Lancamento, Recorrente, VersaoRecorrente } from '../storage/tipos';
import { dataNoMes, mesDe, somarMeses, type DataISO, type Mes } from './datas';
import { dividirEmParcelas, percentualDoValor, porcentagem, somar, type Centavos } from './dinheiro';

export type TipoItem = 'receita' | 'receita-prevista' | 'receita-recorrente' | 'fixa' | 'variavel' | 'parcela';

/** Uma linha do Orçamento num mês (lançamento avulso ou ocorrência de um recorrente). */
export interface ItemMes {
  chave: string;
  tipo: TipoItem;
  natureza: 'receita' | 'despesa';
  descricao: string;
  valor: Centavos;
  data: DataISO;
  categoriaId: Id;
  lancamentoId?: Id;
  recorrenteId?: Id;
  prevista?: { recebida: boolean };
  parcela?: Lancamento['parcela'];
}

export interface ResumoMes {
  receita: Centavos;
  aReceber: Centavos;
  despesasFixas: Centavos;
  despesasVariaveis: Centavos;
  despesas: Centavos;
  investir: Centavos;
  saldo: Centavos;
  ajusteInvestir: AjusteInvestir | null;
}

type DadosOrcamento = Pick<Dados, 'lancamentos' | 'recorrentes' | 'investir'>;

/** Versão de um recorrente válida no mês, ou null se ele não existe naquele mês. */
export function versaoNoMes(r: Recorrente, mes: Mes): VersaoRecorrente | null {
  if (mes < r.inicio) return null;
  if (r.fim && mes > r.fim) return null;
  let escolhida: VersaoRecorrente | null = null;
  for (const v of r.versoes) {
    if (v.aPartirDe <= mes && (!escolhida || v.aPartirDe >= escolhida.aPartirDe)) escolhida = v;
  }
  return escolhida;
}

export function tipoDoLancamento(l: Lancamento): TipoItem {
  if (l.natureza === 'receita') return l.prevista ? 'receita-prevista' : 'receita';
  return l.parcela ? 'parcela' : 'variavel';
}

export function itensDoMes(d: Pick<Dados, 'lancamentos' | 'recorrentes'>, mes: Mes): ItemMes[] {
  const itens: ItemMes[] = [];
  for (const l of d.lancamentos) {
    if (mesDe(l.data) !== mes) continue;
    itens.push({
      chave: l.id,
      tipo: tipoDoLancamento(l),
      natureza: l.natureza,
      descricao: l.descricao,
      valor: l.valor,
      data: l.data,
      categoriaId: l.categoriaId,
      lancamentoId: l.id,
      prevista: l.prevista,
      parcela: l.parcela,
    });
  }
  for (const r of d.recorrentes) {
    const v = versaoNoMes(r, mes);
    if (!v) continue;
    itens.push({
      chave: `${r.id}@${mes}`,
      tipo: r.natureza === 'receita' ? 'receita-recorrente' : 'fixa',
      natureza: r.natureza,
      descricao: v.descricao,
      valor: v.valor,
      data: dataNoMes(mes, v.dia),
      categoriaId: v.categoriaId,
      recorrenteId: r.id,
    });
  }
  return itens;
}

/** Ajuste do Investir que vale no mês: o último definido até ele. */
export function ajusteInvestirNoMes(ajustes: AjusteInvestir[], mes: Mes): AjusteInvestir | null {
  let escolhido: AjusteInvestir | null = null;
  for (const a of ajustes) {
    if (a.mes <= mes && (!escolhido || a.mes >= escolhido.mes)) escolhido = a;
  }
  return escolhido;
}

/** Próximo ajuste explícito depois do mês (para avisar até quando um ajuste vale). */
export function proximoAjusteInvestir(ajustes: AjusteInvestir[], mes: Mes): AjusteInvestir | null {
  let escolhido: AjusteInvestir | null = null;
  for (const a of ajustes) {
    if (a.mes > mes && (!escolhido || a.mes < escolhido.mes)) escolhido = a;
  }
  return escolhido;
}

export function valorInvestir(ajuste: AjusteInvestir | null, receita: Centavos): Centavos {
  if (!ajuste) return 0;
  if (ajuste.modo === 'valor') return ajuste.valor;
  return percentualDoValor(receita, ajuste.percentual);
}

/** Itens que entram na receita do mês (previstas só depois de recebidas). */
export function contaNaReceita(i: ItemMes): boolean {
  return i.natureza === 'receita' && (!i.prevista || i.prevista.recebida);
}

export function resumoDosItens(itens: ItemMes[], ajuste: AjusteInvestir | null): ResumoMes {
  const receita = somar(itens.filter(contaNaReceita).map((i) => i.valor));
  const aReceber = somar(itens.filter((i) => i.prevista && !i.prevista.recebida).map((i) => i.valor));
  const despesasFixas = somar(itens.filter((i) => i.tipo === 'fixa').map((i) => i.valor));
  const despesasVariaveis = somar(itens.filter((i) => i.tipo === 'variavel' || i.tipo === 'parcela').map((i) => i.valor));
  const despesas = despesasFixas + despesasVariaveis;
  const investir = valorInvestir(ajuste, receita);
  return {
    receita,
    aReceber,
    despesasFixas,
    despesasVariaveis,
    despesas,
    investir,
    saldo: receita - despesas - investir,
    ajusteInvestir: ajuste,
  };
}

/** Saldo = receita − despesas fixas − despesas variáveis − investir (CONFIRMADO na Fase 2). */
export function resumoMes(d: DadosOrcamento, mes: Mes): ResumoMes {
  return resumoDosItens(itensDoMes(d, mes), ajusteInvestirNoMes(d.investir, mes));
}

export interface FatiaCategoria {
  categoriaId: Id;
  valor: Centavos;
  /** % inteiro sobre o total (meio para cima). */
  pct: number;
}

export type AbaOrcamento = 'receita' | 'fixa' | 'variavel';

/** Em que aba do Orçamento cada tipo de item aparece. */
export const ABA_DO_TIPO: Record<TipoItem, AbaOrcamento> = {
  receita: 'receita',
  'receita-prevista': 'receita',
  'receita-recorrente': 'receita',
  fixa: 'fixa',
  variavel: 'variavel',
  parcela: 'variavel',
};

/**
 * Itens que entram no gráfico de uma aba (CONFIRMADO na Fase 4): cada aba mostra só os seus
 * lançamentos — Receita (previstas só depois de recebidas), Fixa ou Variável (com as parcelas).
 */
export function itensDaAba(itens: ItemMes[], aba: AbaOrcamento): ItemMes[] {
  if (aba === 'receita') return itens.filter(contaNaReceita);
  return itens.filter((i) => ABA_DO_TIPO[i.tipo] === aba);
}

/** Soma por categoria, do maior para o menor, com % inteiro sobre o total. */
export function porCategoria(itens: ItemMes[]): FatiaCategoria[] {
  const mapa = new Map<Id, Centavos>();
  for (const i of itens) mapa.set(i.categoriaId, (mapa.get(i.categoriaId) ?? 0) + i.valor);
  const total = somar(mapa.values());
  return [...mapa.entries()]
    .map(([categoriaId, valor]) => ({ categoriaId, valor, pct: porcentagem(valor, total, 0) ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
}

export function despesasDoMes(d: Pick<Dados, 'lancamentos' | 'recorrentes'>, mes: Mes): ItemMes[] {
  return itensDoMes(d, mes).filter((i) => i.natureza === 'despesa');
}

export function receitasDoMes(d: Pick<Dados, 'lancamentos' | 'recorrentes'>, mes: Mes): ItemMes[] {
  return itensDoMes(d, mes).filter(contaNaReceita);
}

export interface ParcelaGerada {
  numero: number;
  valor: Centavos;
  data: DataISO;
}

/** Parcelas de uma compra: a 1ª absorve a sobra; cada uma no dia 1º, a partir do mês da compra. */
export function gerarParcelas(total: Centavos, n: number, dataCompra: DataISO): ParcelaGerada[] {
  const mes0 = mesDe(dataCompra);
  return dividirEmParcelas(total, n).map((valor, i) => ({
    numero: i + 1,
    valor,
    data: dataNoMes(somarMeses(mes0, i), 1),
  }));
}

/** Valor da parcela padrão, usado na prévia "3× de R$ 333,33". */
export function parcelaPadrao(total: Centavos, n: number): Centavos {
  const p = dividirEmParcelas(total, n);
  return p.length > 1 ? p[1] : p[0];
}
