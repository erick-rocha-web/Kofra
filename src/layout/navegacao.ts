import type { RotaFixa } from '../estado/ui';

export interface ItemNav {
  rota: RotaFixa;
  rotulo: string;
  icone: string;
}

/** Ordem da planta. */
export const NAV: ItemNav[] = [
  { rota: 'inicio', rotulo: 'Início', icone: 'house' },
  { rota: 'visao-geral', rotulo: 'Visão geral', icone: 'chart-pie-slice' },
  { rota: 'orcamento', rotulo: 'Orçamento', icone: 'wallet' },
  { rota: 'assistente', rotulo: 'Assistente', icone: 'chat-teardrop-dots' },
  { rota: 'reserva', rotulo: 'Reserva de emergência', icone: 'umbrella' },
  { rota: 'metas', rotulo: 'Metas', icone: 'flag-banner' },
  { rota: 'investimentos', rotulo: 'Investimentos', icone: 'trend-up' },
  { rota: 'patrimonio', rotulo: 'Patrimônio', icone: 'scales' },
  { rota: 'aprender', rotulo: 'Aprender', icone: 'book-open' },
  { rota: 'calculadoras', rotulo: 'Calculadoras', icone: 'calculator' },
  { rota: 'suporte', rotulo: 'Suporte', icone: 'headset' },
  { rota: 'configuracoes', rotulo: 'Configurações', icone: 'sliders-horizontal' },
];

/** Barra inferior do celular. */
export const NAV_INFERIOR: RotaFixa[] = ['inicio', 'orcamento', 'investimentos', 'patrimonio'];

/** Rotas que pertencem a um item do menu (para marcar o item ativo). */
export function itemAtivo(rota: string): RotaFixa {
  if (rota === 'juros-compostos' || rota === 'primeiro-milhao') return 'calculadoras';
  if (rota === 'categorias') return 'orcamento';
  if (rota.startsWith('aula-')) return 'aprender';
  return rota as RotaFixa;
}
