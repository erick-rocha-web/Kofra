import type { Dados, LocalReserva, NivelReserva, Reserva } from '../storage/tipos';
import { mesDe, ultimoDia, type DataISO, type Mes } from './datas';
import { porcentagem, somar, type Centavos } from './dinheiro';
import { atualDoAtivo } from './investimentos';

export const MESES_NIVEL: Record<NivelReserva, number> = { basico: 6, blindado: 12 };

/** Meta = custo essencial mensal × meses do nível (CONFIRMADO). */
export function metaReserva(config: Reserva['config']): Centavos | null {
  if (!config) return null;
  return config.custoMensal * MESES_NIVEL[config.nivel];
}

/** Valor de um local numa data: soma dos aportes/saques até ela, ou o valor atual do investimento ligado. */
export function valorLocal(d: Pick<Dados, 'ativos'>, local: LocalReserva, data: DataISO): Centavos {
  if (local.vinculo.tipo === 'ativo') return atualDoAtivo(d, local.vinculo.ativoId, mesDe(data));
  return somar(local.movimentos.filter((m) => m.data <= data).map((m) => m.valor));
}

/** Valor atual da reserva = soma dos locais (CONFIRMADO). */
export function valorReserva(d: Pick<Dados, 'ativos' | 'reserva'>, data: DataISO): Centavos {
  return somar(d.reserva.locais.map((l) => valorLocal(d, l, data)));
}

export function valorReservaNoFimDoMes(d: Pick<Dados, 'ativos' | 'reserva'>, mes: Mes): Centavos {
  return valorReserva(d, ultimoDia(mes));
}

/** % inteiro, meio para cima: 41,5% → 42%; 99,5% → 100% (CONFIRMADO). */
export function percentualReserva(atual: Centavos, meta: Centavos | null): number | null {
  if (!meta) return null;
  return porcentagem(atual, meta, 0);
}

export type EstadoReserva = 'zero' | 'parcial' | 'completo';

/** Os 3 estados da planta (DECISÃO PILA). */
export function estadoReserva(atual: Centavos, meta: Centavos | null): EstadoReserva {
  if (atual <= 0) return 'zero';
  if (meta !== null && atual >= meta) return 'completo';
  return 'parcial';
}

/** Fração (0–1) para desenhar o guarda-chuva, limitada a 100%. */
export function fracaoCobertura(atual: Centavos, meta: Centavos | null): number {
  if (!meta || meta <= 0) return 0;
  return Math.max(0, Math.min(1, atual / meta));
}
