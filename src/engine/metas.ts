import type { Dados, Meta } from '../storage/tipos';
import { mesDe, partesMes, type DataISO, type Mes } from './datas';
import { dividirEmReaisInteiros, porcentagem, somar, type Centavos } from './dinheiro';
import { atualDoAtivo } from './investimentos';

/** Guardado = aportes − retiradas (+ valor atual dos investimentos ligados, se houver). */
export function guardadoMeta(d: Pick<Dados, 'ativos'>, m: Meta, mes: Mes): Centavos {
  const movimentos = somar(m.movimentos.map((x) => x.valor));
  const ativos = m.guardarEm.tipo === 'ativos' ? somar(m.guardarEm.ativoIds.map((id) => atualDoAtivo(d, id, mes))) : 0;
  return movimentos + ativos;
}

export function faltaMeta(total: Centavos, guardado: Centavos): Centavos {
  return Math.max(0, total - guardado);
}

export function metaConcluida(total: Centavos, guardado: Centavos): boolean {
  return guardado >= total;
}

/** Barra de progresso: % inteiro limitado a 100. */
export function progressoMeta(total: Centavos, guardado: Centavos): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, porcentagem(guardado, total, 0) ?? 0));
}

/** Meses até o prazo, contando só mês e ano (o dia não conta); mínimo 1; null se o prazo já passou. */
export function mesesAtePrazo(hoje: DataISO, prazo: DataISO): number | null {
  if (prazo < hoje) return null;
  const h = partesMes(mesDe(hoje));
  const p = partesMes(mesDe(prazo));
  return Math.max(1, (p.ano - h.ano) * 12 + (p.mes - h.mes));
}

/**
 * "Separe ~R$ N por mês": o que falta ÷ meses até o prazo, em reais inteiros (CONFIRMADO).
 * null quando não há prazo, o prazo passou ou não falta nada.
 */
export function sugestaoMensal(total: Centavos, guardado: Centavos, prazo: DataISO | null, hoje: DataISO): Centavos | null {
  if (!prazo) return null;
  const falta = total - guardado;
  if (falta <= 0) return null;
  const meses = mesesAtePrazo(hoje, prazo);
  if (meses === null) return null;
  return dividirEmReaisInteiros(falta, meses);
}
