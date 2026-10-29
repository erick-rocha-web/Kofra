import type { Centavos } from '../engine/dinheiro';
import type { DataISO, Mes } from '../engine/datas';

export type Id = string;

export type Tema = 'claro' | 'escuro' | 'sistema';

export type CardInicio =
  | { tipo: 'patrimonio' }
  | { tipo: 'investimentos' }
  | { tipo: 'despesas' }
  | { tipo: 'saldo' }
  | { tipo: 'reserva' }
  | { tipo: 'bens' }
  | { tipo: 'meta'; metaId: Id };

export interface Config {
  tema: Tema;
  moeda: 'BRL';
  ocultarValores: boolean;
  nome: string;
  cardInicio: CardInicio;
  contatoSuporte: { whatsapp: string; email: string };
  ultimoBackup: string | null;
  dicasVistas: string[];
  /** true enquanto o app mostra os dados de exemplo. */
  exemplo: boolean;
}

export type NaturezaCategoria = 'despesa' | 'receita';

export interface Categoria {
  id: Id;
  natureza: NaturezaCategoria;
  nome: string;
  icone: string;
  cor: string;
  arquivada: boolean;
  ordem: number;
}

/**
 * Lançamento de um mês só: receita avulsa, receita prevista (recebimento futuro)
 * ou despesa variável (inclusive cada parcela de uma compra parcelada).
 */
export interface Lancamento {
  id: Id;
  natureza: 'receita' | 'despesa';
  descricao: string;
  valor: Centavos;
  data: DataISO;
  categoriaId: Id;
  /** Só receita: ainda não entra na receita até ser marcada como recebida. */
  prevista?: { recebida: boolean };
  /** Só despesa variável parcelada. */
  parcela?: { grupoId: Id; numero: number; total: number; valorTotal: Centavos; dataCompra: DataISO };
  criadoEm: string;
}

/** Uma versão de um lançamento recorrente, válida a partir de um mês. */
export interface VersaoRecorrente {
  aPartirDe: Mes;
  descricao: string;
  valor: Centavos;
  dia: number;
  categoriaId: Id;
}

/** Receita que se repete todo mês ou despesa fixa. Existe de `inicio` até `fim` (inclusive). */
export interface Recorrente {
  id: Id;
  natureza: 'receita' | 'despesa';
  inicio: Mes;
  fim: Mes | null;
  versoes: VersaoRecorrente[];
  criadoEm: string;
}

/** Ajuste do "Investir": vale do mês em diante até o próximo ajuste. */
export interface AjusteInvestir {
  mes: Mes;
  modo: 'percentual' | 'valor';
  percentual: number;
  valor: Centavos;
}

export type GrupoPatrimonio = 'liquidez' | 'bem' | 'divida';
export type TipoBem = 'imovel' | 'veiculo' | 'outros';

export interface ValorMensal {
  mes: Mes;
  valor: Centavos;
}

/** Item de patrimônio com valor mês a mês (o valor vale para os meses seguintes até mudar). */
export interface ItemPatrimonio {
  id: Id;
  grupo: GrupoPatrimonio;
  tipoBem?: TipoBem;
  nome: string;
  valores: ValorMensal[];
  /** Último mês em que o item existe (inclusive). */
  fim: Mes | null;
  criadoEm: string;
}

export type TipoAtivo = 'renda_fixa' | 'renda_variavel' | 'fundos_imobiliarios' | 'internacional' | 'cripto';

export interface ValorAtivo {
  mes: Mes;
  investido: Centavos;
  atual: Centavos;
}

export interface Ativo {
  id: Id;
  nome: string;
  instituicao: string;
  tipo: TipoAtivo;
  valores: ValorAtivo[];
  fim: Mes | null;
  criadoEm: string;
}

export interface Movimento {
  id: Id;
  data: DataISO;
  /** Positivo = aporte; negativo = saque/retirada. */
  valor: Centavos;
}

export type NivelReserva = 'basico' | 'blindado';

export interface LocalReserva {
  id: Id;
  nome: string;
  vinculo: { tipo: 'manual' } | { tipo: 'ativo'; ativoId: Id };
  movimentos: Movimento[];
  criadoEm: string;
}

export interface Reserva {
  config: { nivel: NivelReserva; custoMensal: Centavos } | null;
  locais: LocalReserva[];
}

export interface Meta {
  id: Id;
  nome: string;
  emoji: string;
  cor: string;
  total: Centavos;
  prazo: DataISO | null;
  guardarEm: { tipo: 'texto'; texto: string } | { tipo: 'ativos'; ativoIds: Id[] };
  movimentos: Movimento[];
  criadoEm: string;
}

export interface Aula {
  id: Id;
  titulo: string;
  resumo: string;
  corpo: string;
  ordem: number;
  lidaEm: string | null;
}

export interface MensagemAssistente {
  id: Id;
  papel: 'user' | 'assistant';
  texto: string;
  em: string;
}

export const VERSAO_DADOS = 1 as const;

export interface Dados {
  versao: typeof VERSAO_DADOS;
  config: Config;
  categorias: Categoria[];
  lancamentos: Lancamento[];
  recorrentes: Recorrente[];
  investir: AjusteInvestir[];
  patrimonio: ItemPatrimonio[];
  ativos: Ativo[];
  reserva: Reserva;
  metas: Meta[];
  aulas: Aula[];
  conversa: MensagemAssistente[];
  avisosDispensados: string[];
}
