import type { Categoria, Id, Lancamento, NaturezaCategoria, VersaoRecorrente } from '../storage/tipos';
import { novoId } from '../storage/padrao';
import { atualizar, loja } from './loja';
import { dataNoMes, diaDe, mesDe, somarMeses, type DataISO, type Mes } from '../engine/datas';
import { gerarParcelas, versaoNoMes } from '../engine/orcamento';
import type { Centavos } from '../engine/dinheiro';
import { normalizar } from '../engine/formato';

const agora = () => new Date().toISOString();

/* ───────────── Receitas ───────────── */

export interface DadosReceita {
  descricao: string;
  valor: Centavos;
  data: DataISO;
  categoriaId: Id;
  modo: 'avulsa' | 'recorrente' | 'prevista';
}

export function adicionarReceita(r: DadosReceita): void {
  atualizar((d) => {
    if (r.modo === 'recorrente') {
      const inicio = mesDe(r.data);
      d.recorrentes.push({
        id: novoId(),
        natureza: 'receita',
        inicio,
        fim: null,
        versoes: [{ aPartirDe: inicio, descricao: r.descricao, valor: r.valor, dia: diaDe(r.data), categoriaId: r.categoriaId }],
        criadoEm: agora(),
      });
      return;
    }
    d.lancamentos.push({
      id: novoId(),
      natureza: 'receita',
      descricao: r.descricao,
      valor: r.valor,
      data: r.data,
      categoriaId: r.categoriaId,
      ...(r.modo === 'prevista' ? { prevista: { recebida: false } } : {}),
      criadoEm: agora(),
    });
  });
}

/* ───────────── Despesas ───────────── */

export function adicionarDespesaFixa(p: { descricao: string; valor: Centavos; vencimento: DataISO; categoriaId: Id }): void {
  atualizar((d) => {
    const inicio = mesDe(p.vencimento);
    d.recorrentes.push({
      id: novoId(),
      natureza: 'despesa',
      inicio,
      fim: null,
      versoes: [{ aPartirDe: inicio, descricao: p.descricao, valor: p.valor, dia: diaDe(p.vencimento), categoriaId: p.categoriaId }],
      criadoEm: agora(),
    });
  });
}

export interface DadosVariavel {
  descricao: string;
  valor: Centavos;
  data: DataISO;
  categoriaId: Id;
  parcelas: number;
}

function lancamentosDaCompra(p: DadosVariavel, grupoId: Id): Lancamento[] {
  if (p.parcelas <= 1) {
    return [{ id: novoId(), natureza: 'despesa', descricao: p.descricao, valor: p.valor, data: p.data, categoriaId: p.categoriaId, criadoEm: agora() }];
  }
  return gerarParcelas(p.valor, p.parcelas, p.data).map((x) => ({
    id: novoId(),
    natureza: 'despesa' as const,
    descricao: p.descricao,
    valor: x.valor,
    data: x.data,
    categoriaId: p.categoriaId,
    parcela: { grupoId, numero: x.numero, total: p.parcelas, valorTotal: p.valor, dataCompra: p.data },
    criadoEm: agora(),
  }));
}

export function adicionarDespesaVariavel(p: DadosVariavel): void {
  const novos = lancamentosDaCompra(p, novoId());
  atualizar((d) => {
    d.lancamentos.push(...novos);
  });
}

/** Regrava todas as parcelas de uma compra (ou converte em compra à vista). */
export function editarCompra(grupoOuId: { grupoId?: Id; lancamentoId?: Id }, p: DadosVariavel): void {
  const grupoId = grupoOuId.grupoId ?? novoId();
  const novos = lancamentosDaCompra(p, grupoId);
  atualizar((d) => {
    d.lancamentos = d.lancamentos.filter((l) =>
      grupoOuId.grupoId ? l.parcela?.grupoId !== grupoOuId.grupoId : l.id !== grupoOuId.lancamentoId,
    );
    d.lancamentos.push(...novos);
  });
}

/* ───────────── Edição e exclusão ───────────── */

export function editarLancamento(id: Id, campos: Partial<Pick<Lancamento, 'descricao' | 'valor' | 'data' | 'categoriaId'>>): void {
  atualizar((d) => {
    const l = d.lancamentos.find((x) => x.id === id);
    if (l) Object.assign(l, campos);
  });
}

export function excluirLancamento(id: Id): void {
  atualizar((d) => {
    d.lancamentos = d.lancamentos.filter((l) => l.id !== id);
  });
}

export function excluirCompra(grupoId: Id): void {
  atualizar((d) => {
    d.lancamentos = d.lancamentos.filter((l) => l.parcela?.grupoId !== grupoId);
  });
}

/** Edita um recorrente a partir de um mês ("vale deste mês em diante", até a próxima versão). */
export function editarRecorrente(id: Id, mes: Mes, campos: Omit<VersaoRecorrente, 'aPartirDe'>): void {
  atualizar((d) => {
    const r = d.recorrentes.find((x) => x.id === id);
    if (!r) return;
    const aPartirDe = mes < r.inicio ? r.inicio : mes;
    const existente = r.versoes.find((v) => v.aPartirDe === aPartirDe);
    if (existente) Object.assign(existente, campos);
    else r.versoes.push({ aPartirDe, ...campos });
    r.versoes.sort((a, b) => a.aPartirDe.localeCompare(b.aPartirDe));
  });
}

/** Exclui um recorrente deste mês em diante (se for o primeiro mês, apaga tudo). */
export function excluirRecorrenteDesde(id: Id, mes: Mes): void {
  atualizar((d) => {
    const r = d.recorrentes.find((x) => x.id === id);
    if (!r) return;
    if (mes <= r.inicio) {
      d.recorrentes = d.recorrentes.filter((x) => x.id !== id);
      return;
    }
    r.fim = somarMeses(mes, -1);
    r.versoes = r.versoes.filter((v) => v.aPartirDe <= (r.fim as Mes));
  });
}

export function versaoAtual(id: Id, mes: Mes): VersaoRecorrente | null {
  const r = loja.obterDados().recorrentes.find((x) => x.id === id);
  return r ? versaoNoMes(r, mes) : null;
}

/* ───────────── Receita prevista ───────────── */

export function marcarRecebida(id: Id): void {
  atualizar((d) => {
    const l = d.lancamentos.find((x) => x.id === id);
    if (l?.prevista) l.prevista.recebida = true;
  });
}

export function desmarcarRecebida(id: Id): void {
  atualizar((d) => {
    const l = d.lancamentos.find((x) => x.id === id);
    if (l?.prevista) l.prevista.recebida = false;
  });
}

export function adiarPrevista(id: Id, novaData: DataISO): void {
  atualizar((d) => {
    const l = d.lancamentos.find((x) => x.id === id);
    if (l) l.data = novaData;
  });
}

/* ───────────── Investir ───────────── */

export function definirInvestir(mes: Mes, modo: 'percentual' | 'valor', percentual: number, valor: Centavos): void {
  atualizar((d) => {
    const a = d.investir.find((x) => x.mes === mes);
    if (a) Object.assign(a, { modo, percentual, valor });
    else d.investir.push({ mes, modo, percentual, valor });
    d.investir.sort((x, y) => x.mes.localeCompare(y.mes));
  });
}

export function removerAjusteInvestir(mes: Mes): void {
  atualizar((d) => {
    d.investir = d.investir.filter((x) => x.mes !== mes);
  });
}

/* ───────────── Mês inteiro ───────────── */

/** Lançamentos avulsos do mês que "Limpar mês" remove (recorrentes e parcelas ficam). */
export function avulsosDoMes(lancamentos: Lancamento[], mes: Mes): Lancamento[] {
  return lancamentos.filter((l) => mesDe(l.data) === mes && !l.parcela);
}

export function limparMes(mes: Mes): number {
  const n = avulsosDoMes(loja.obterDados().lancamentos, mes).length;
  atualizar((d) => {
    d.lancamentos = d.lancamentos.filter((l) => !(mesDe(l.data) === mes && !l.parcela));
  });
  return n;
}

/** Copia receitas avulsas e/ou despesas variáveis (sem parcelas) de um mês para outro, no mesmo dia. */
export function copiarMes(origem: Mes, destino: Mes, tipos: { receitas: boolean; despesas: boolean }): number {
  const fonte = loja
    .obterDados()
    .lancamentos.filter(
      (l) =>
        mesDe(l.data) === origem &&
        !l.parcela &&
        !l.prevista &&
        ((l.natureza === 'receita' && tipos.receitas) || (l.natureza === 'despesa' && tipos.despesas)),
    );
  if (!fonte.length) return 0;
  atualizar((d) => {
    for (const l of fonte) {
      d.lancamentos.push({
        id: novoId(),
        natureza: l.natureza,
        descricao: l.descricao,
        valor: l.valor,
        data: dataNoMes(destino, diaDe(l.data)),
        categoriaId: l.categoriaId,
        criadoEm: agora(),
      });
    }
  });
  return fonte.length;
}

/* ───────────── Categorias ───────────── */

const ICONE_PADRAO: Record<NaturezaCategoria, string> = { despesa: 'tag', receita: 'coins' };

export function criarCategoria(natureza: NaturezaCategoria, nome: string, icone?: string, cor?: string): Id {
  const id = novoId();
  atualizar((d) => {
    const mesmas = d.categorias.filter((c) => c.natureza === natureza);
    const usadas = new Set(mesmas.map((c) => c.cor));
    const livre = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].find((s) => !usadas.has(s)) ?? 'c1';
    d.categorias.push({
      id,
      natureza,
      nome: nome.trim(),
      icone: icone ?? ICONE_PADRAO[natureza],
      cor: cor ?? livre,
      arquivada: false,
      ordem: mesmas.length ? Math.max(...mesmas.map((c) => c.ordem)) + 1 : 0,
    });
  });
  return id;
}

export function editarCategoria(id: Id, campos: Partial<Pick<Categoria, 'nome' | 'icone' | 'cor' | 'arquivada'>>): void {
  atualizar((d) => {
    const c = d.categorias.find((x) => x.id === id);
    if (c) Object.assign(c, campos);
  });
}

/** Exclui a categoria; se `moverPara` vier, os lançamentos passam para ela. */
export function excluirCategoria(id: Id, moverPara?: Id): void {
  atualizar((d) => {
    if (moverPara) {
      for (const l of d.lancamentos) if (l.categoriaId === id) l.categoriaId = moverPara;
      for (const r of d.recorrentes) for (const v of r.versoes) if (v.categoriaId === id) v.categoriaId = moverPara;
    }
    d.categorias = d.categorias.filter((c) => c.id !== id);
  });
}

export function usosDaCategoria(id: Id): number {
  const d = loja.obterDados();
  return (
    d.lancamentos.filter((l) => l.categoriaId === id).length +
    d.recorrentes.filter((r) => r.versoes.some((v) => v.categoriaId === id)).length
  );
}

export function nomeCategoriaExiste(natureza: NaturezaCategoria, nome: string, excetoId?: Id): boolean {
  return loja
    .obterDados()
    .categorias.some((c) => c.natureza === natureza && c.id !== excetoId && normalizar(c.nome) === normalizar(nome));
}
