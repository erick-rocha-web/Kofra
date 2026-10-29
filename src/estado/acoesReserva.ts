import type { Id, NivelReserva } from '../storage/tipos';
import { novoId } from '../storage/padrao';
import { atualizar } from './loja';
import type { DataISO } from '../engine/datas';
import type { Centavos } from '../engine/dinheiro';

export function configurarReserva(nivel: NivelReserva, custoMensal: Centavos): void {
  atualizar((d) => {
    d.reserva.config = { nivel, custoMensal };
  });
}

export function adicionarLocal(p: { nome: string; ativoId?: Id; valorInicial?: Centavos; data: DataISO }): Id {
  const id = novoId();
  atualizar((d) => {
    d.reserva.locais.push({
      id,
      nome: p.nome.trim(),
      vinculo: p.ativoId ? { tipo: 'ativo', ativoId: p.ativoId } : { tipo: 'manual' },
      movimentos: !p.ativoId && p.valorInicial ? [{ id: novoId(), data: p.data, valor: p.valorInicial }] : [],
      criadoEm: new Date().toISOString(),
    });
  });
  return id;
}

/** Aporte (valor positivo) ou saque (negativo) num local manual. */
export function movimentarLocal(localId: Id, data: DataISO, valor: Centavos): void {
  atualizar((d) => {
    const l = d.reserva.locais.find((x) => x.id === localId);
    if (!l) return;
    l.movimentos.push({ id: novoId(), data, valor });
    l.movimentos.sort((a, b) => a.data.localeCompare(b.data));
  });
}

export function excluirMovimentoLocal(localId: Id, movimentoId: Id): void {
  atualizar((d) => {
    const l = d.reserva.locais.find((x) => x.id === localId);
    if (l) l.movimentos = l.movimentos.filter((m) => m.id !== movimentoId);
  });
}

export function renomearLocal(localId: Id, nome: string): void {
  atualizar((d) => {
    const l = d.reserva.locais.find((x) => x.id === localId);
    if (l) l.nome = nome.trim();
  });
}

export function excluirLocal(localId: Id): void {
  atualizar((d) => {
    d.reserva.locais = d.reserva.locais.filter((l) => l.id !== localId);
  });
}
