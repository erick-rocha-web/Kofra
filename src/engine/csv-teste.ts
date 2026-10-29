// Leitura dos CSVs da Fase 2 (pasta testes/) para os testes do engine.
// Formato: separador ";", vírgula decimal, primeira linha = cabeçalho.
import { readFileSync } from 'node:fs';
import { lerValor } from './dinheiro';

export type LinhaCsv = Record<string, string>;

export function lerCsv(nome: string): LinhaCsv[] {
  const texto = readFileSync(new URL(`../../testes/${nome}`, import.meta.url), 'utf8');
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const cab = linhas[0].split(';');
  return linhas.slice(1).map((l) => {
    const cel = l.split(';');
    return Object.fromEntries(cab.map((c, i) => [c, (cel[i] ?? '').trim()]));
  });
}

/** "6000,15" → 600015 centavos; vazio → null. */
export function centavos(s: string): number | null {
  if (!s) return null;
  const v = lerValor(s);
  if (v === null) throw new Error(`Valor inválido no CSV: "${s}"`);
  return v;
}

/** Igual a `centavos`, mas exige valor. */
export function c(s: string): number {
  const v = centavos(s);
  if (v === null) throw new Error('Valor obrigatório ausente no CSV');
  return v;
}

/** "12,5" → 12.5 */
export function num(s: string): number {
  return Number(s.replace(',', '.'));
}

/** "27/10/2026" → "2026-10-27" */
export function dataCsv(s: string): string {
  const [d, m, a] = s.split('/');
  return `${a}-${m}-${d}`;
}

/** Diferença máxima aceita entre o calculado e o observado (R$ 0,01). */
export const TOLERANCIA = 1;
