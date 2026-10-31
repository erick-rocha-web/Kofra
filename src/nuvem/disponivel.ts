/**
 * A nuvem só existe com as duas chaves públicas e fora do claude.ai: lá a página tem
 * window.claude e não pode acessar outros sites.
 */
export function nuvemDisponivel(env: { url?: string; chave?: string }, janela: object): boolean {
  return Boolean(env.url?.trim() && env.chave?.trim()) && !('claude' in janela);
}
