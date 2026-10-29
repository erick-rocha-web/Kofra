import type { Centavos } from './dinheiro';

const NUM_INT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const OCULTO = '••••••';

/** "1.234,56" (sem símbolo). Com `semCentavos`, arredonda para reais inteiros. */
export function formatarNumero(c: Centavos, semCentavos = false): string {
  const abs = Math.abs(c);
  if (semCentavos) return NUM_INT.format(Math.round(abs / 100));
  // monta a parte inteira e os centavos sem passar por float
  const reais = Math.trunc(abs / 100);
  const cent = abs % 100;
  return `${NUM_INT.format(reais)},${String(cent).padStart(2, '0')}`;
}

export interface OpcoesValor {
  /** Mostra "+" em positivos. */
  sinal?: boolean;
  semCentavos?: boolean;
  /** Inclui "R$". Padrão: true. */
  simbolo?: boolean;
}

/** "R$ 1.234,56", "−R$ 50,00", "+R$ 10,00". */
export function formatarValor(c: Centavos, opcoes: OpcoesValor = {}): string {
  const { sinal = false, semCentavos = false, simbolo = true } = opcoes;
  const pref = c < 0 ? '−' : sinal && c > 0 ? '+' : '';
  const n = formatarNumero(c, semCentavos);
  return simbolo ? `${pref}R$ ${n}` : `${pref}${n}`;
}

/** "12,5%". `casas` define as decimais exibidas. */
export function formatarPct(n: number, casas = 0, sinal = false): string {
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const pref = n < 0 ? '−' : sinal && n > 0 ? '+' : '';
  return `${pref}${s}%`;
}

/** Iniciais para o avatar: "Erick Roberto" → "ER". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'K';
  const p = partes[0][0] ?? '';
  const u = partes.length > 1 ? partes[partes.length - 1][0] ?? '' : '';
  return (p + u).toUpperCase();
}

/** Plural simples: plural(3, 'mês', 'meses') → "3 meses". */
export function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
}

/** "19 anos e 4 meses", "1 ano", "11 meses", "1 mês". */
export function textoTempo(meses: number): string {
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anos) partes.push(anos === 1 ? '1 ano' : `${anos} anos`);
  if (resto) partes.push(resto === 1 ? '1 mês' : `${resto} meses`);
  return partes.join(' e ') || '0 meses';
}

/** Normaliza texto para busca (sem acento, minúsculas). */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
