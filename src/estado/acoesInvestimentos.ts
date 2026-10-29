import type { Id, TipoAtivo } from '../storage/tipos';
import { novoId } from '../storage/padrao';
import { atualizar, loja } from './loja';
import { hojeISO, mesAtual, somarMeses, type Mes } from '../engine/datas';
import type { Centavos } from '../engine/dinheiro';
import { valorAtivoNoMes } from '../engine/investimentos';

export interface DadosAtivo {
  nome: string;
  instituicao: string;
  tipo: TipoAtivo;
  investido: Centavos;
  atual: Centavos;
}

export function adicionarAtivo(p: DadosAtivo, mes: Mes): Id {
  const id = novoId();
  atualizar((d) => {
    d.ativos.push({
      id,
      nome: p.nome.trim(),
      instituicao: p.instituicao.trim(),
      tipo: p.tipo,
      valores: [{ mes, investido: p.investido, atual: p.atual }],
      fim: null,
      criadoEm: new Date().toISOString(),
    });
  });
  return id;
}

/** Atualiza dados do ativo e registra os valores do mês (valem dali em diante até o próximo registro). */
export function atualizarAtivo(id: Id, mes: Mes, p: Partial<DadosAtivo>): void {
  atualizar((d) => {
    const a = d.ativos.find((x) => x.id === id);
    if (!a) return;
    if (p.nome !== undefined) a.nome = p.nome.trim();
    if (p.instituicao !== undefined) a.instituicao = p.instituicao.trim();
    if (p.tipo) a.tipo = p.tipo;
    if (p.investido !== undefined || p.atual !== undefined) {
      const vigente = valorAtivoNoMes(a, mes);
      const novo = { investido: p.investido ?? vigente?.investido ?? 0, atual: p.atual ?? vigente?.atual ?? 0 };
      const reg = a.valores.find((v) => v.mes === mes);
      if (reg) Object.assign(reg, novo);
      else a.valores.push({ mes, ...novo });
      a.valores.sort((x, y) => x.mes.localeCompare(y.mes));
      if (a.fim && mes > a.fim) a.fim = null;
    }
  });
}

/** Onde o ativo está ligado (reserva e metas), para avisar antes de excluir. */
export function vinculosDoAtivo(id: Id): { locais: string[]; metas: string[] } {
  const d = loja.obterDados();
  return {
    locais: d.reserva.locais.filter((l) => l.vinculo.tipo === 'ativo' && l.vinculo.ativoId === id).map((l) => l.nome),
    metas: d.metas.filter((m) => m.guardarEm.tipo === 'ativos' && m.guardarEm.ativoIds.includes(id)).map((m) => m.nome),
  };
}

/**
 * 'desde': o ativo sai do mês em diante (histórico fica). 'tudo': apaga.
 * Ao apagar, locais da reserva e metas ligados a ele passam a guardar o último valor como aporte,
 * para o total deles não cair de repente.
 */
export function excluirAtivo(id: Id, mes: Mes, modo: 'desde' | 'tudo'): void {
  atualizar((d) => {
    const a = d.ativos.find((x) => x.id === id);
    if (!a) return;
    const primeiro = a.valores.reduce((m, v) => (v.mes < m ? v.mes : m), a.valores[0]?.mes ?? mes);
    const apagarTudo = modo === 'tudo' || mes <= primeiro;
    if (!apagarTudo) {
      a.fim = somarMeses(mes, -1);
      a.valores = a.valores.filter((v) => v.mes <= (a.fim as Mes));
      return;
    }
    const ultimo = valorAtivoNoMes(a, mesAtual())?.atual ?? a.valores[a.valores.length - 1]?.atual ?? 0;
    const hoje = hojeISO();
    for (const l of d.reserva.locais) {
      if (l.vinculo.tipo === 'ativo' && l.vinculo.ativoId === id) {
        l.vinculo = { tipo: 'manual' };
        if (ultimo > 0) l.movimentos.push({ id: novoId(), data: hoje, valor: ultimo });
      }
    }
    for (const m of d.metas) {
      if (m.guardarEm.tipo === 'ativos' && m.guardarEm.ativoIds.includes(id)) {
        m.guardarEm.ativoIds = m.guardarEm.ativoIds.filter((x) => x !== id);
        if (ultimo > 0) m.movimentos.push({ id: novoId(), data: hoje, valor: ultimo });
        if (!m.guardarEm.ativoIds.length) m.guardarEm = { tipo: 'texto', texto: a.nome };
      }
    }
    d.ativos = d.ativos.filter((x) => x.id !== id);
  });
}

/** Registra de uma vez os valores atuais (e investidos) de vários ativos no mês. */
export function atualizarValoresDoMes(mes: Mes, valores: { id: Id; investido: Centavos; atual: Centavos }[]): void {
  for (const v of valores) atualizarAtivo(v.id, mes, { investido: v.investido, atual: v.atual });
}
