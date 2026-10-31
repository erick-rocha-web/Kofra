/**
 * Dinheiro no Pila é sempre um número inteiro de centavos.
 * Toda divisão que pode gerar fração de centavo passa por `dividirArredondando`,
 * que arredonda "meio para cima" (para longe do zero), a regra confirmada na Fase 2:
 * 30% de 6.000,15 = 1.800,045 → 1.800,05.
 */
export type Centavos = number;

/** Divide dois inteiros arredondando meio para cima (para longe do zero). */
export function dividirArredondando(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new RangeError('Divisão por zero');
  const negativo = a < 0n !== b < 0n;
  const A = a < 0n ? -a : a;
  const B = b < 0n ? -b : b;
  const q = (2n * A + B) / (2n * B);
  return negativo ? -q : q;
}

function inteiro(n: number, nome: string): bigint {
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new RangeError(`${nome} precisa ser um inteiro (recebido ${n})`);
  }
  return BigInt(n);
}

/** p% de um valor, em centavos. Aceita percentual com até 2 casas decimais. */
export function percentualDoValor(valor: Centavos, percentual: number): Centavos {
  const p100 = Math.round(percentual * 100);
  return Number(dividirArredondando(inteiro(valor, 'valor') * BigInt(p100), 10000n));
}

/**
 * Quanto `parte` representa de `total`, em %, com `casas` decimais (meio para cima).
 * Ex.: porcentagem(75000, 600000, 1) = 12.5. Retorna null quando o total é zero.
 */
export function porcentagem(parte: number, total: number, casas = 0): number | null {
  if (total === 0) return null;
  const escala = 10n ** BigInt(casas);
  const q = dividirArredondando(inteiro(parte, 'parte') * 100n * escala, inteiro(total, 'total'));
  return Number(q) / Number(escala);
}

/** Divide um total em n parcelas: a padrão é total ÷ n arredondado; a 1ª absorve a sobra. */
export function dividirEmParcelas(total: Centavos, n: number): Centavos[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('Número de parcelas inválido');
  const padrao = Number(dividirArredondando(inteiro(total, 'total'), BigInt(n)));
  const primeira = total - (n - 1) * padrao;
  return [primeira, ...Array.from({ length: n - 1 }, () => padrao)];
}

/** Divide e arredonda para reais inteiros (resultado em centavos múltiplo de 100). */
export function dividirEmReaisInteiros(valor: Centavos, divisor: number): Centavos {
  return Number(dividirArredondando(inteiro(valor, 'valor'), inteiro(divisor, 'divisor') * 100n)) * 100;
}

export function somar(valores: Iterable<Centavos>): Centavos {
  let t = 0;
  for (const v of valores) t += v;
  return t;
}

/** Converte "1.234,56", "1234,56", "1234.56" ou "1234" em centavos. Retorna null se inválido. */
export function lerValor(texto: string): Centavos | null {
  const limpo = texto.replace(/[R$\s ]/g, '').trim();
  if (!limpo) return null;
  const negativo = limpo.startsWith('-');
  const semSinal = limpo.replace(/^[-+]/, '');
  let normal: string;
  if (semSinal.includes(',')) {
    normal = semSinal.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(semSinal)) {
    normal = semSinal.replace(/\./g, '');
  } else {
    normal = semSinal;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const [int, dec = ''] = normal.split('.');
  const c = Number(int) * 100 + Number((dec + '00').slice(0, 2));
  return negativo ? -c : c;
}
