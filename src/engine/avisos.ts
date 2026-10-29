import type { Dados } from '../storage/tipos';
import { diferencaDias, formatarData, mesDe, somarDias, type DataISO } from './datas';
import type { Centavos } from './dinheiro';
import { itensDoMes } from './orcamento';
import { faltaMeta, guardadoMeta } from './metas';

export type TipoAviso = 'receita-atrasada' | 'despesa-vencendo' | 'meta-prazo';

export interface AvisoApp {
  /** Estável: permite dispensar um aviso específico. */
  id: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  valor?: Centavos;
  rota: 'orcamento' | 'metas';
  quando: DataISO;
}

function quandoRelativo(hoje: DataISO, data: DataISO): string {
  const d = diferencaDias(hoje, data);
  if (d === 0) return 'vence hoje';
  if (d === 1) return 'vence amanhã';
  return `vence em ${d} dias`;
}

/** Avisos calculados ao abrir o app (sem notificação push). */
export function calcularAvisos(d: Dados, hoje: DataISO): AvisoApp[] {
  const avisos: AvisoApp[] = [];

  for (const l of d.lancamentos) {
    if (l.prevista && !l.prevista.recebida && l.data < hoje) {
      avisos.push({
        id: `prevista:${l.id}:${l.data}`,
        tipo: 'receita-atrasada',
        titulo: `${l.descricao}: recebimento atrasado`,
        texto: `Estava prevista para ${formatarData(l.data)}. Confirme ou escolha uma nova data.`,
        valor: l.valor,
        rota: 'orcamento',
        quando: l.data,
      });
    }
  }

  const limite = somarDias(hoje, 3);
  const meses = [...new Set([mesDe(hoje), mesDe(limite)])];
  for (const mes of meses) {
    for (const i of itensDoMes(d, mes)) {
      if (i.tipo !== 'fixa' || i.data < hoje || i.data > limite) continue;
      avisos.push({
        id: `fixa:${i.recorrenteId}:${i.data}`,
        tipo: 'despesa-vencendo',
        titulo: `${i.descricao} ${quandoRelativo(hoje, i.data)}`,
        texto: `Despesa fixa com vencimento em ${formatarData(i.data)}.`,
        valor: i.valor,
        rota: 'orcamento',
        quando: i.data,
      });
    }
  }

  const limiteMetas = somarDias(hoje, 30);
  for (const m of d.metas) {
    if (!m.prazo || m.prazo < hoje || m.prazo > limiteMetas) continue;
    const falta = faltaMeta(m.total, guardadoMeta(d, m, mesDe(hoje)));
    if (falta <= 0) continue;
    const dias = diferencaDias(hoje, m.prazo);
    avisos.push({
      id: `meta:${m.id}:${m.prazo}`,
      tipo: 'meta-prazo',
      titulo: `${m.emoji} ${m.nome}: ${dias === 0 ? 'o prazo é hoje' : dias === 1 ? 'o prazo é amanhã' : `faltam ${dias} dias`}`,
      texto: `Prazo em ${formatarData(m.prazo)}. Ainda falta guardar:`,
      valor: falta,
      rota: 'metas',
      quando: m.prazo,
    });
  }

  return avisos.sort((a, b) => a.quando.localeCompare(b.quando));
}
