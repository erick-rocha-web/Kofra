import type { Id, Meta } from '../storage/tipos';
import { novoId } from '../storage/padrao';
import { atualizar } from './loja';
import type { DataISO } from '../engine/datas';
import type { Centavos } from '../engine/dinheiro';

export type DadosMeta = Pick<Meta, 'nome' | 'emoji' | 'cor' | 'total' | 'prazo' | 'guardarEm'>;

export function criarMeta(p: DadosMeta): Id {
  const id = novoId();
  atualizar((d) => {
    d.metas.push({ id, ...p, nome: p.nome.trim(), movimentos: [], criadoEm: new Date().toISOString() });
  });
  return id;
}

export function editarMeta(id: Id, p: DadosMeta): void {
  atualizar((d) => {
    const m = d.metas.find((x) => x.id === id);
    if (m) Object.assign(m, { ...p, nome: p.nome.trim() });
  });
}

export function excluirMeta(id: Id): void {
  atualizar((d) => {
    d.metas = d.metas.filter((m) => m.id !== id);
    if (d.config.cardInicio.tipo === 'meta' && d.config.cardInicio.metaId === id) d.config.cardInicio = { tipo: 'patrimonio' };
  });
}

/** Valor positivo guarda; negativo retira. */
export function movimentarMeta(id: Id, data: DataISO, valor: Centavos): void {
  atualizar((d) => {
    const m = d.metas.find((x) => x.id === id);
    if (!m) return;
    m.movimentos.push({ id: novoId(), data, valor });
    m.movimentos.sort((a, b) => a.data.localeCompare(b.data));
  });
}

export function excluirMovimentoMeta(id: Id, movimentoId: Id): void {
  atualizar((d) => {
    const m = d.metas.find((x) => x.id === id);
    if (m) m.movimentos = m.movimentos.filter((x) => x.id !== movimentoId);
  });
}
