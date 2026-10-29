import type { Aula, Id } from '../storage/tipos';
import { aulasPadrao, novoId } from '../storage/padrao';
import { atualizar, loja } from './loja';

export function marcarAulaLida(id: Id, lida: boolean): void {
  atualizar((d) => {
    const a = d.aulas.find((x) => x.id === id);
    if (a) a.lidaEm = lida ? new Date().toISOString() : null;
  });
}

export function salvarAula(id: Id | null, campos: Pick<Aula, 'titulo' | 'resumo' | 'corpo'>): Id {
  const novo = id ?? `aula-${novoId()}`;
  atualizar((d) => {
    const a = id ? d.aulas.find((x) => x.id === id) : null;
    if (a) Object.assign(a, campos);
    else d.aulas.push({ id: novo, ...campos, ordem: d.aulas.length ? Math.max(...d.aulas.map((x) => x.ordem)) + 1 : 1, lidaEm: null });
  });
  return novo;
}

export function excluirAula(id: Id): void {
  atualizar((d) => {
    d.aulas = d.aulas.filter((a) => a.id !== id);
  });
}

/** Devolve as aulas de exemplo que foram apagadas (não mexe nas editadas ou nas novas). */
export function restaurarAulasPadrao(): number {
  const existentes = new Set(loja.obterDados().aulas.map((a) => a.id));
  const faltando = aulasPadrao().filter((a) => !existentes.has(a.id));
  atualizar((d) => {
    d.aulas.push(...faltando);
    d.aulas.sort((a, b) => a.ordem - b.ordem);
  });
  return faltando.length;
}
