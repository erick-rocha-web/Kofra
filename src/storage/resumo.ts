import type { Dados } from './tipos';

/** Resumo em palavras do que há nos dados, para as confirmações. */
export function contar(d: Dados): string {
  const partes = [
    [d.lancamentos.length + d.recorrentes.length, 'lançamento', 'lançamentos'],
    [d.patrimonio.length, 'item de patrimônio', 'itens de patrimônio'],
    [d.ativos.length, 'investimento', 'investimentos'],
    [d.metas.length, 'meta', 'metas'],
  ] as const;
  const txt = partes.filter(([n]) => n > 0).map(([n, um, varios]) => `${n} ${n === 1 ? um : varios}`);
  return txt.length ? txt.join(', ') : 'nenhum dado cadastrado';
}
