// Monta, com as próprias ações do Pila, réplicas dos dados de teste que estão na referência.
// Saída: sementes/*.json (objeto Dados, pronto para gravar no IndexedDB do app).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loja } from '../../src/estado/loja';
import {
  adicionarDespesaFixa,
  adicionarDespesaVariavel,
  adicionarReceita,
  criarCategoria,
  definirInvestir,
  marcarRecebida,
} from '../../src/estado/acoesOrcamento';
import { adicionarItemPatrimonio, atualizarItemPatrimonio } from '../../src/estado/acoesPatrimonio';
import { adicionarAtivo, atualizarAtivo } from '../../src/estado/acoesInvestimentos';
import { adicionarLocal, configurarReserva, movimentarLocal } from '../../src/estado/acoesReserva';
import { criarMeta, movimentarMeta } from '../../src/estado/acoesMetas';
import { dadosVazios } from '../../src/storage/padrao';
import type { Dados } from '../../src/storage/tipos';

const SAIDA = fileURLToPath(new URL('./sementes', import.meta.url));
mkdirSync(SAIDA, { recursive: true });

function novo(): void {
  loja.substituir(dadosVazios());
}
function cat(natureza: 'receita' | 'despesa', nome: string): string {
  const d = loja.obterDados();
  const achou = d.categorias.find((c) => c.natureza === natureza && c.nome === nome);
  return achou ? achou.id : criarCategoria(natureza, nome);
}
function salvar(nome: string, ajuste?: (d: Dados) => Dados): void {
  let d = structuredClone(loja.obterDados());
  if (ajuste) d = ajuste(d);
  writeFileSync(`${SAIDA}/${nome}.json`, JSON.stringify(d));
  console.log('gravado', nome);
}

/** Réplica do que existe na referência (só os dados de teste + a despesa fixa "Claude code", que só foi lida). */
function replica(dolar: number, janRecebida: boolean): void {
  novo();
  const RP = cat('receita', 'Renda Principal');
  const RE = cat('receita', 'Renda Extra');
  const OU = cat('receita', 'Outro');
  const MOR = cat('despesa', 'Moradia');
  const MER = cat('despesa', 'Mercado');
  const LAZ = cat('despesa', 'Lazer');
  const VES = cat('despesa', 'Vestuário');
  const TRA = cat('despesa', 'Trabalho');

  // Orçamento
  adicionarReceita({ descricao: 'TESTE KOFRA Julho', valor: 100000, data: '2026-07-10', categoriaId: RE, modo: 'avulsa' });
  adicionarReceita({ descricao: 'TESTE KOFRA Salario Set', valor: 400000, data: '2026-09-07', categoriaId: RP, modo: 'avulsa' });
  adicionarReceita({ descricao: 'TESTE KOFRA Bonus Set', valor: 1000000, data: '2026-09-20', categoriaId: RE, modo: 'avulsa' });
  adicionarDespesaVariavel({ descricao: 'TESTE KOFRA Lazer Set', valor: 50000, data: '2026-09-12', categoriaId: LAZ, parcelas: 1 });
  adicionarReceita({ descricao: 'TESTE KOFRA Salario', valor: 500000, data: '2026-10-05', categoriaId: RP, modo: 'avulsa' });
  adicionarReceita({ descricao: 'TESTE KOFRA Freela', valor: 100000, data: '2026-10-20', categoriaId: RE, modo: 'avulsa' });
  adicionarReceita({ descricao: 'TESTE KOFRA Centavos', valor: 5, data: '2026-10-20', categoriaId: OU, modo: 'avulsa' });
  adicionarReceita({ descricao: 'TESTE KOFRA Centavos 2', valor: 10, data: '2026-10-20', categoriaId: OU, modo: 'avulsa' });
  adicionarDespesaFixa({ descricao: 'TESTE KOFRA Aluguel', valor: 150000, vencimento: '2026-10-10', categoriaId: MOR });
  adicionarDespesaVariavel({ descricao: 'TESTE KOFRA Mercado', valor: 70000, data: '2026-10-15', categoriaId: MER, parcelas: 1 });
  adicionarDespesaVariavel({ descricao: 'TESTE KOFRA Parcelado', valor: 100000, data: '2026-10-01', categoriaId: VES, parcelas: 3 });
  adicionarDespesaVariavel({ descricao: 'TESTE KOFRA Parcelado 6x', valor: 10000, data: '2026-10-05', categoriaId: LAZ, parcelas: 6 });
  adicionarReceita({ descricao: 'TESTE KOFRA Recorrente', valor: 100000, data: '2026-11-05', categoriaId: RP, modo: 'recorrente' });
  adicionarReceita({ descricao: 'TESTE KOFRA Futuro', valor: 50000, data: '2026-11-10', categoriaId: RE, modo: 'prevista' });
  adicionarDespesaFixa({ descricao: 'Claude code', valor: 12000, vencimento: '2026-11-23', categoriaId: TRA });
  adicionarDespesaVariavel({ descricao: 'TESTE KOFRA Parcelado 4x', valor: 9999, data: '2027-01-20', categoriaId: LAZ, parcelas: 4 });
  adicionarReceita({ descricao: 'TESTE KOFRA Prevista Jan', valor: 33333, data: '2027-01-15', categoriaId: RE, modo: 'prevista' });
  adicionarReceita({ descricao: 'TESTE KOFRA Prevista Fev', valor: 25050, data: '2027-02-20', categoriaId: RE, modo: 'prevista' });
  const d0 = loja.obterDados();
  marcarRecebida(d0.lancamentos.find((l) => l.descricao === 'TESTE KOFRA Futuro')!.id);
  if (janRecebida) marcarRecebida(d0.lancamentos.find((l) => l.descricao === 'TESTE KOFRA Prevista Jan')!.id);
  definirInvestir('2026-10', 'percentual', 20, 0);
  definirInvestir('2026-11', 'percentual', 30, 0);

  // Patrimônio
  adicionarItemPatrimonio({ grupo: 'liquidez', nome: 'TESTE KOFRA Conta Set', valor: 500000, mes: '2026-09' });
  adicionarItemPatrimonio({ grupo: 'liquidez', nome: 'TESTE KOFRA Conta', valor: 1000000, mes: '2026-10' });
  adicionarItemPatrimonio({ grupo: 'liquidez', nome: 'TESTE KOFRA Dolar', valor: dolar, mes: '2026-10' });
  const carro = adicionarItemPatrimonio({ grupo: 'bem', tipoBem: 'veiculo', nome: 'TESTE KOFRA Carro', valor: 3000000, mes: '2026-10' });
  atualizarItemPatrimonio(carro, '2026-11', { valor: 2900000 });
  adicionarItemPatrimonio({ grupo: 'divida', nome: 'TESTE KOFRA Financiamento', valor: 1200000, mes: '2026-10' });

  // Investimentos
  const cdb = adicionarAtivo({ nome: 'TESTE KOFRA CDB', instituicao: 'Banco Teste', tipo: 'renda_fixa', investido: 1000000, atual: 1085000 }, '2026-10');
  const acoes = adicionarAtivo({ nome: 'TESTE KOFRA Acoes', instituicao: 'Corretora Teste', tipo: 'renda_variavel', investido: 500000, atual: 460000 }, '2026-10');
  atualizarAtivo(cdb, '2027-01', { atual: 1111111 });
  atualizarAtivo(acoes, '2027-01', { atual: 432109 });
  atualizarAtivo(cdb, '2027-02', { atual: 987654 });

  // Reserva (estado final do dia: 0,01 + 1.000,00)
  configurarReserva('blindado', 20000);
  adicionarLocal({ nome: 'TESTE KOFRA Reserva', valorInicial: 1, data: '2026-10-27' });
  adicionarLocal({ nome: 'TESTE KOFRA Reserva 2', valorInicial: 100000, data: '2026-10-27' });

  // Meta (estado final do dia: total 12.000, guardado 20.000)
  const viagem = criarMeta({ nome: 'TESTE KOFRA Viagem', emoji: '🎯', cor: 'c3', total: 1200000, prazo: '2027-12-31', guardarEm: { tipo: 'texto', texto: 'CDB' } });
  movimentarMeta(viagem, '2026-10-27', 150000);
  movimentarMeta(viagem, '2026-10-27', -20000);
  movimentarMeta(viagem, '2026-10-27', 1100000);
  movimentarMeta(viagem, '2026-10-28', -123456);
  movimentarMeta(viagem, '2026-10-28', 893456);
}

replica(53513, false);
salvar('A');
replica(53513, true);
salvar('B', (d) => ({ ...d, config: { ...d.config, cardInicio: { tipo: 'despesas' } } }));
replica(53350, false);
salvar('C');

// Reserva: um conjunto por total observado (meta R$ 2.400,00)
for (const [nome, extra] of [
  ['res-100001', 0],
  ['res-120000', 19999],
  ['res-238800', 19999 + 118800],
  ['res-240000', 19999 + 118800 + 1200],
  ['res-360000', 19999 + 118800 + 1200 + 120000],
] as const) {
  novo();
  configurarReserva('blindado', 20000);
  adicionarLocal({ nome: 'TESTE KOFRA Reserva', valorInicial: 1, data: '2026-10-27' });
  const l2 = adicionarLocal({ nome: 'TESTE KOFRA Reserva 2', valorInicial: 100000, data: '2026-10-27' });
  if (extra) movimentarLocal(l2, '2026-10-28', extra);
  salvar(nome);
}

// Metas: 5 estados de progresso + 5 prévias de sugestão (guardado zero)
novo();
const estados: [string, number, number[]][] = [
  ['P1 total 20.000', 2000000, [150000, -20000, 1100000]],
  ['P2 total 20.000', 2000000, [150000, -20000, 1100000, -123456]],
  ['P3 total 20.000', 2000000, [150000, -20000, 1100000, -123456, 893456]],
  ['P4 total 25.000', 2500000, [150000, -20000, 1100000, -123456, 893456]],
  ['P5 total 12.000', 1200000, [150000, -20000, 1100000, -123456, 893456]],
];
for (const [nome, total, movs] of estados) {
  const id = criarMeta({ nome, emoji: '🎯', cor: 'c3', total, prazo: '2027-12-31', guardarEm: { tipo: 'texto', texto: 'CDB' } });
  for (const v of movs) movimentarMeta(id, '2026-10-27', v);
}
for (const [nome, total, prazo] of [
  ['S1', 500000, '2027-03-15'],
  ['S2', 123456, '2026-11-28'],
  ['S3', 205000, '2027-02-10'],
  ['S4', 1000000, '2026-10-31'],
  ['S5', 99999, '2030-12-31'],
  ['S6 passado', 300000, '2026-09-15'],
] as const) {
  criarMeta({ nome, emoji: '🎯', cor: 'c3', total, prazo, guardarEm: { tipo: 'texto', texto: '' } });
}
salvar('metas');
console.log('categorias:', loja.obterDados().categorias.map((c) => `${c.natureza}:${c.nome}`).join(', '));
process.exit(0);
