import type { Dados, Lancamento, Recorrente } from './tipos';
import { dadosVazios, novoId } from './padrao';
import { dataNoMes, hojeISO, mesDe, somarDias, somarMeses, type Mes } from '../engine/datas';
import { dividirEmParcelas } from '../engine/dinheiro';

/**
 * Dados de exemplo para conhecer o app. Sempre marcados como exemplo
 * (faixa no topo + botão para apagar). Valores relativos à data de hoje.
 */
export function gerarExemplo(hoje = hojeISO()): Dados {
  const d = dadosVazios();
  d.config.exemplo = true;
  d.config.nome = '';
  const agora = new Date().toISOString();
  const M = mesDe(hoje);
  const m = (k: number): Mes => somarMeses(M, k);
  const cat = (nome: string) => d.categorias.find((c) => c.nome === nome)!.id;

  const rec = (
    natureza: 'receita' | 'despesa',
    inicio: Mes,
    descricao: string,
    valor: number,
    dia: number,
    categoria: string,
  ): Recorrente => ({
    id: novoId(),
    natureza,
    inicio,
    fim: null,
    versoes: [{ aPartirDe: inicio, descricao, valor, dia, categoriaId: cat(categoria) }],
    criadoEm: agora,
  });

  d.recorrentes = [
    rec('receita', m(-2), 'Salário', 650000, 5, 'Salário'),
    rec('despesa', m(-2), 'Aluguel', 190000, 10, 'Moradia'),
    rec('despesa', m(-2), 'Internet', 12000, 15, 'Contas'),
    rec('despesa', m(-2), 'Academia', 9990, 8, 'Saúde'),
    rec('despesa', m(-2), 'Plano de celular', 5990, 20, 'Contas'),
  ];

  const lanc = (natureza: 'receita' | 'despesa', data: string, descricao: string, valor: number, categoria: string): Lancamento => ({
    id: novoId(),
    natureza,
    descricao,
    valor,
    data,
    categoriaId: cat(categoria),
    criadoEm: agora,
  });

  const variaveis: [number, number, string, number, string][] = [
    [-2, 6, 'Mercado do mês', 58240, 'Mercado'],
    [-2, 14, 'Feira', 9650, 'Mercado'],
    [-2, 18, 'Jantar fora', 18700, 'Restaurantes'],
    [-2, 22, 'Corridas de aplicativo', 11430, 'Transporte'],
    [-2, 26, 'Cinema', 7600, 'Lazer'],
    [-1, 5, 'Mercado do mês', 61290, 'Mercado'],
    [-1, 12, 'Farmácia', 6480, 'Saúde'],
    [-1, 16, 'Almoço de domingo', 14200, 'Restaurantes'],
    [-1, 19, 'Combustível', 22000, 'Transporte'],
    [-1, 24, 'Show', 18000, 'Lazer'],
    [-1, 27, 'Camiseta', 8990, 'Vestuário'],
    [0, 4, 'Mercado do mês', 54830, 'Mercado'],
    [0, 9, 'Padaria', 4320, 'Mercado'],
    [0, 11, 'Corridas de aplicativo', 8760, 'Transporte'],
  ];
  d.lancamentos = variaveis
    .map(([k, dia, desc, valor, c]) => lanc('despesa', dataNoMes(m(k), dia), desc, valor, c))
    .filter((l) => l.data <= hoje || mesDe(l.data) < M);

  d.lancamentos.push(lanc('receita', dataNoMes(m(-1), 18), 'Projeto freelance', 120000, 'Renda extra'));

  // receita prevista: reembolso daqui a 10 dias
  d.lancamentos.push({
    ...lanc('receita', somarDias(hoje, 10), 'Reembolso de despesas', 35000, 'Outros'),
    prevista: { recebida: false },
  });

  // compra parcelada: notebook em 6x, comprado no mês passado
  const grupo = novoId();
  const dataCompra = dataNoMes(m(-1), 8);
  dividirEmParcelas(360000, 6).forEach((valor, i) => {
    d.lancamentos.push({
      id: novoId(),
      natureza: 'despesa',
      descricao: 'Notebook',
      valor,
      data: dataNoMes(m(-1 + i), 1),
      categoriaId: cat('Trabalho'),
      parcela: { grupoId: grupo, numero: i + 1, total: 6, valorTotal: 360000, dataCompra },
      criadoEm: agora,
    });
  });

  d.investir = [{ mes: m(-2), modo: 'percentual', percentual: 15, valor: 0 }];

  d.patrimonio = [
    { id: novoId(), grupo: 'liquidez', nome: 'Conta corrente', valores: [{ mes: m(-2), valor: 320000 }, { mes: m(0), valor: 385000 }], fim: null, criadoEm: agora },
    { id: novoId(), grupo: 'bem', tipoBem: 'veiculo', nome: 'Carro', valores: [{ mes: m(-2), valor: 4200000 }], fim: null, criadoEm: agora },
    {
      id: novoId(),
      grupo: 'divida',
      nome: 'Financiamento do carro',
      valores: [{ mes: m(-2), valor: 1850000 }, { mes: m(-1), valor: 1760000 }, { mes: m(0), valor: 1670000 }],
      fim: null,
      criadoEm: agora,
    },
  ];

  const tesouro = novoId();
  d.ativos = [
    { id: tesouro, nome: 'Tesouro Selic', instituicao: 'Tesouro Direto', tipo: 'renda_fixa', valores: [{ mes: m(-2), investido: 760000, atual: 790000 }, { mes: m(0), investido: 800000, atual: 864000 }], fim: null, criadoEm: agora },
    { id: novoId(), nome: 'CDB liquidez diária', instituicao: 'Banco digital', tipo: 'renda_fixa', valores: [{ mes: m(-2), investido: 500000, atual: 521000 }], fim: null, criadoEm: agora },
    { id: novoId(), nome: 'Fundo imobiliário de logística', instituicao: 'Corretora', tipo: 'fundos_imobiliarios', valores: [{ mes: m(-2), investido: 300000, atual: 288000 }], fim: null, criadoEm: agora },
    { id: novoId(), nome: 'ETF de ações globais', instituicao: 'Corretora', tipo: 'internacional', valores: [{ mes: m(-2), investido: 250000, atual: 276000 }], fim: null, criadoEm: agora },
    { id: novoId(), nome: 'Bitcoin', instituicao: 'Exchange', tipo: 'cripto', valores: [{ mes: m(-2), investido: 100000, atual: 132000 }], fim: null, criadoEm: agora },
  ];

  d.reserva = {
    config: { nivel: 'basico', custoMensal: 350000 },
    locais: [
      { id: novoId(), nome: 'Tesouro Selic', vinculo: { tipo: 'ativo', ativoId: tesouro }, movimentos: [], criadoEm: agora },
      {
        id: novoId(),
        nome: 'Conta remunerada',
        vinculo: { tipo: 'manual' },
        movimentos: [
          { id: novoId(), data: dataNoMes(m(-2), 6), valor: 200000 },
          { id: novoId(), data: dataNoMes(m(-1), 6), valor: 120000 },
          { id: novoId(), data: dataNoMes(m(0), 6) <= hoje ? dataNoMes(m(0), 6) : hoje, valor: 100000 },
        ],
        criadoEm: agora,
      },
    ],
  };

  d.metas = [
    {
      id: novoId(), nome: 'Viagem de férias', emoji: '✈️', cor: 'c1', total: 900000,
      prazo: dataNoMes(m(8), 15), guardarEm: { tipo: 'texto', texto: 'Conta remunerada' },
      movimentos: [
        { id: novoId(), data: dataNoMes(m(-2), 12), valor: 150000 },
        { id: novoId(), data: dataNoMes(m(-1), 12), valor: 80000 },
      ],
      criadoEm: agora,
    },
    {
      id: novoId(), nome: 'Trocar o celular', emoji: '📱', cor: 'c7', total: 300000,
      prazo: dataNoMes(m(4), 30), guardarEm: { tipo: 'texto', texto: 'Poupança' },
      movimentos: [{ id: novoId(), data: dataNoMes(m(-1), 20), valor: 60000 }],
      criadoEm: agora,
    },
    {
      id: novoId(), nome: 'Entrada do apartamento', emoji: '🏠', cor: 'c3', total: 6000000,
      prazo: dataNoMes(m(36), 1), guardarEm: { tipo: 'texto', texto: 'CDB' },
      movimentos: [{ id: novoId(), data: dataNoMes(m(-2), 3), valor: 750000 }],
      criadoEm: agora,
    },
  ];

  return d;
}
