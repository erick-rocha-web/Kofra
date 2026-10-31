import type { Aula, Categoria, Config, Dados } from './tipos';
import { VERSAO_DADOS } from './tipos';

let contador = 0;
/** Id curto e único o bastante para dados locais. */
export function novoId(): string {
  contador = (contador + 1) % 1296;
  return Date.now().toString(36) + contador.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 7);
}

/** Chaves de cor (ver ui/cores.ts): 8 matizes validados + cinza. */
export const CORES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c0'] as const;

const CAT_DESPESA: [string, string, string][] = [
  ['Moradia', 'house-line', 'c1'],
  ['Mercado', 'shopping-cart', 'c3'],
  ['Transporte', 'car', 'c2'],
  ['Saúde', 'first-aid-kit', 'c8'],
  ['Educação', 'graduation-cap', 'c6'],
  ['Lazer', 'popcorn', 'c7'],
  ['Restaurantes', 'fork-knife', 'c5'],
  ['Contas', 'receipt', 'c4'],
  ['Vestuário', 't-shirt', 'c5'],
  ['Trabalho', 'briefcase', 'c6'],
  ['Outros', 'dots-three', 'c0'],
];

const CAT_RECEITA: [string, string, string][] = [
  ['Salário', 'money', 'c3'],
  ['Renda extra', 'coins', 'c1'],
  ['Outros', 'dots-three', 'c0'],
];

export function categoriasPadrao(): Categoria[] {
  const despesa = CAT_DESPESA.map(([nome, icone, cor], i) => ({
    id: `cd-${i + 1}`, natureza: 'despesa' as const, nome, icone, cor, arquivada: false, ordem: i,
  }));
  const receita = CAT_RECEITA.map(([nome, icone, cor], i) => ({
    id: `cr-${i + 1}`, natureza: 'receita' as const, nome, icone, cor, arquivada: false, ordem: i,
  }));
  return [...despesa, ...receita];
}

export function aulasPadrao(): Aula[] {
  return [
    {
      id: 'aula-1',
      ordem: 1,
      lidaEm: null,
      titulo: 'Reserva de emergência: o seu guarda-chuva',
      resumo: 'Para que serve, de quanto precisa e onde guardar.',
      corpo: [
        'A reserva de emergência é o dinheiro que segura as pontas quando algo sai do plano: um conserto, uma despesa médica, um mês sem renda. Com ela, um imprevisto vira só um imprevisto, e não uma dívida.',
        '## De quanto você precisa',
        'Comece pelo custo essencial do mês: moradia, mercado, contas, transporte, saúde. Fica de fora o que dá para cortar numa fase apertada.',
        '- Renda estável (salário fixo): guarde 6 vezes esse custo.',
        '- Renda que varia (autônomo, comissão, empresa própria): guarde 12 vezes.',
        'No Pila esses são os níveis Básico e Blindado. Você escolhe o nível e o app calcula a meta.',
        '## Onde guardar',
        'Reserva precisa estar disponível rápido e não pode perder valor quando você mais precisar dela. Por isso ela costuma ficar em aplicações de baixo risco e resgate imediato, e não em ações ou em investimentos com prazo de carência.',
        '## Como montar sem sufoco',
        '- Defina um valor fixo por mês e trate como uma conta a pagar.',
        '- Registre cada aporte na tela Reserva de emergência: o guarda-chuva vai se abrindo conforme você avança.',
        '- Usou a reserva? Registre o saque e volte a recompor aos poucos.',
      ].join('\n'),
    },
    {
      id: 'aula-2',
      ordem: 2,
      lidaEm: null,
      titulo: 'Orçamento em quatro números',
      resumo: 'Receita, despesas, investir e saldo: como ler o seu mês.',
      corpo: [
        'O Orçamento do Pila resume o mês em quatro números. Entender cada um ajuda a decidir para onde o dinheiro vai.',
        '## Receita',
        'Tudo o que entrou no mês: salário, trabalhos extras, outras entradas. Receitas que você ainda vai receber podem ser lançadas como previstas: elas aparecem em "a receber" e só contam quando você confirma o recebimento.',
        '## Despesas',
        '- Fixas: se repetem todo mês, como aluguel e internet. Você cadastra uma vez e elas aparecem nos meses seguintes.',
        '- Variáveis: mudam de um mês para o outro, como mercado e lazer. Compras parceladas viram uma parcela em cada mês.',
        '## Investir',
        'É a parte da receita que você separa para o futuro antes de gastar. Pode ser um percentual (por exemplo, 20% do que entrar) ou um valor fixo.',
        '## Saldo',
        'Saldo = receita − despesas − investir. Se ficar negativo, o mês está gastando mais do que entra depois de separar o investimento. Vale rever as variáveis ou o valor de investir daquele mês.',
      ].join('\n'),
    },
    {
      id: 'aula-3',
      ordem: 3,
      lidaEm: null,
      titulo: 'Juros compostos a seu favor',
      resumo: 'Por que constância pesa mais do que o valor de cada aporte.',
      corpo: [
        'Nos juros compostos, o rendimento de cada mês passa a render também nos meses seguintes. No começo a diferença é pequena; com o tempo, ela cresce cada vez mais rápido.',
        '## Um exemplo',
        'R$ 1.000,00 guardados hoje, mais R$ 100,00 por mês, a 1% ao mês, viram R$ 2.395,08 em 12 meses. Você terá colocado R$ 2.200,00; os outros R$ 195,08 são juros.',
        '## O que mais pesa',
        '- Tempo: quanto mais meses, mais os juros se acumulam sobre juros.',
        '- Constância: aportes todo mês mantêm a bola de neve crescendo.',
        '- Taxa: pequenas diferenças na taxa fazem grande diferença em prazos longos.',
        '## Experimente',
        'Na tela Calculadoras você pode simular seus próprios números e ver a evolução mês a mês, ou descobrir em quanto tempo chegaria ao primeiro milhão.',
      ].join('\n'),
    },
  ];
}

export function configPadrao(): Config {
  return {
    tema: 'sistema',
    moeda: 'BRL',
    ocultarValores: false,
    nome: '',
    cardInicio: { tipo: 'patrimonio' },
    contatoSuporte: { whatsapp: '', email: '' },
    ultimoBackup: null,
    dicasVistas: [],
    exemplo: false,
  };
}

export function dadosVazios(): Dados {
  return {
    versao: VERSAO_DADOS,
    config: configPadrao(),
    categorias: categoriasPadrao(),
    lancamentos: [],
    recorrentes: [],
    investir: [],
    patrimonio: [],
    ativos: [],
    reserva: { config: null, locais: [] },
    metas: [],
    aulas: aulasPadrao(),
    conversa: [],
    avisosDispensados: [],
  };
}

/** Completa campos ausentes (dados antigos ou backups parciais) sem perder o que existe. */
export function normalizarDados(bruto: Partial<Dados>): Dados {
  const base = dadosVazios();
  const lista = <T>(v: unknown, padrao: T[]): T[] => (Array.isArray(v) ? (v as T[]) : padrao);
  return {
    versao: VERSAO_DADOS,
    config: { ...base.config, ...(bruto.config ?? {}) },
    categorias: lista(bruto.categorias, base.categorias),
    lancamentos: lista(bruto.lancamentos, []),
    recorrentes: lista(bruto.recorrentes, []),
    investir: lista(bruto.investir, []),
    patrimonio: lista(bruto.patrimonio, []),
    ativos: lista(bruto.ativos, []),
    reserva: {
      config: bruto.reserva?.config ?? null,
      locais: lista(bruto.reserva?.locais, []),
    },
    metas: lista(bruto.metas, []),
    aulas: lista(bruto.aulas, base.aulas),
    conversa: lista(bruto.conversa, []),
    avisosDispensados: lista(bruto.avisosDispensados, []),
  };
}

/** Há algo cadastrado pela pessoa? (categorias e aulas padrão não contam) */
export function temDadosProprios(d: Dados): boolean {
  return (
    d.lancamentos.length > 0 ||
    d.recorrentes.length > 0 ||
    d.investir.length > 0 ||
    d.patrimonio.length > 0 ||
    d.ativos.length > 0 ||
    d.reserva.config !== null ||
    d.reserva.locais.length > 0 ||
    d.metas.length > 0
  );
}
