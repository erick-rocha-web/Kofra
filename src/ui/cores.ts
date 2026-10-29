/**
 * Cores de identidade (categorias, metas, gráficos): 8 matizes validados para
 * daltonismo e contraste nos dois temas + cinza para "Outros". Guardamos a chave
 * ("c1"…"c8", "c0"); o tom exato muda com o tema via CSS (--cat-N).
 */
export const SLOTS_COR = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c0'] as const;
export type SlotCor = (typeof SLOTS_COR)[number];

export const NOMES_COR: Record<SlotCor, string> = {
  c1: 'Azul',
  c2: 'Laranja',
  c3: 'Verde-água',
  c4: 'Amarelo',
  c5: 'Rosa',
  c6: 'Verde',
  c7: 'Violeta',
  c8: 'Vermelho',
  c0: 'Cinza',
};

/** "c3" → "var(--cat-3)". Valores antigos em hex passam direto. */
export function corVar(cor: string | undefined | null): string {
  if (!cor) return 'var(--cat-0)';
  const m = /^c(\d)$/.exec(cor);
  return m ? `var(--cat-${m[1]})` : cor;
}

/** Cor de série para tipos fixos (investimentos, grupos do patrimônio). */
export const COR_SERIE = {
  receita: 'var(--cat-3)',
  gastos: 'var(--cat-2)',
  positivo: 'var(--cat-1)',
  negativo: 'var(--cat-8)',
} as const;
