import type { Dados } from '../storage/tipos';
import { claudeDisponivel } from './arquivos';
import { itensDoMes, porCategoria, resumoMes } from '../engine/orcamento';
import { resumoPatrimonio } from '../engine/patrimonio';
import { ROTULO_TIPO, ativosNoMes } from '../engine/investimentos';
import { metaReserva, percentualReserva, valorReserva } from '../engine/reserva';
import { faltaMeta, guardadoMeta, sugestaoMensal } from '../engine/metas';
import { formatarData, mesDe, nomeMes, somarMeses, type DataISO } from '../engine/datas';
import { formatarPct, formatarValor } from '../engine/formato';

/* ───────────── Acesso ao Claude (capacidade "sample" do claude.ai) ───────────── */

export interface SampleTool {
  name: string;
  description: string;
  inputSchema?: { type: 'object'; properties?: Record<string, unknown>; required?: string[] };
  execute(input: Record<string, unknown>, context: { signal: AbortSignal }): unknown;
}

export interface SampleFn {
  (
    input: string | { role: 'user' | 'assistant'; content: string }[],
    options?: {
      onText?: (u: { text: string; delta: string }) => void;
      signal?: AbortSignal;
      tools?: SampleTool[];
      modelTier?: 'default' | 'complex' | 'quick';
      cache?: boolean;
    },
  ): Promise<{ text: string; truncated: boolean }>;
  limits(): Promise<{ maxPromptBytes: number; tools?: { maxCount: number } }>;
}

let promessa: Promise<SampleFn | null> | null = null;

/** Resolve a função do Claude, ou null fora do claude.ai (arquivo aberto direto no navegador). */
export function obterSample(): Promise<SampleFn | null> {
  if (!promessa) {
    const c = claudeDisponivel();
    promessa = c ? (c.use('sample') as Promise<SampleFn | null>).catch(() => null) : Promise.resolve(null);
  }
  return promessa;
}

/* ───────────── O que o Claude lê ───────────── */

export const INSTRUCOES = [
  'Você é o assistente do Kofra, um app pessoal de finanças. Fale em português do Brasil, de forma curta, direta e gentil.',
  'Use apenas os dados do Kofra que vêm a seguir. Não invente números nem estatísticas; se algo não estiver nos dados, diga que não sabe.',
  'Não recomende ativos específicos para comprar ou vender: dê orientações gerais de organização financeira e lembre que não é consultoria.',
  'Escreva valores como R$ 1.234,56. Prefira respostas com até 6 frases ou uma lista curta.',
  'Quando a pessoa pedir para registrar um lançamento (gasto, receita, compra parcelada), chame a ferramenta proporLancamento uma vez por lançamento e avise que ele aparece na conversa para ela confirmar. Nunca diga que já foi registrado.',
].join('\n');

export function resumoParaAssistente(d: Dados, hoje: DataISO): string {
  const mes = mesDe(hoje);
  const orc = resumoMes(d, mes);
  const cat = new Map(d.categorias.map((c) => [c.id, c.nome]));
  const linhas: string[] = [];
  linhas.push(`Hoje: ${formatarData(hoje)}. Mês atual: ${nomeMes(mes)}.`);
  linhas.push('');
  linhas.push(`ORÇAMENTO DE ${nomeMes(mes).toUpperCase()}`);
  linhas.push(
    `Receita ${formatarValor(orc.receita)}; a receber ${formatarValor(orc.aReceber)}; despesas fixas ${formatarValor(orc.despesasFixas)}; despesas variáveis ${formatarValor(orc.despesasVariaveis)}; investir ${formatarValor(orc.investir)}; saldo ${formatarValor(orc.saldo)} (saldo = receita − despesas − investir).`,
  );
  const despesas = itensDoMes(d, mes).filter((i) => i.natureza === 'despesa');
  const porCat = porCategoria(despesas);
  if (porCat.length)
    linhas.push('Despesas por categoria: ' + porCat.map((f) => `${cat.get(f.categoriaId) ?? 'Outros'} ${formatarValor(f.valor)} (${formatarPct(f.pct)})`).join('; ') + '.');
  const itens = itensDoMes(d, mes)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-40)
    .map(
      (i) =>
        `- ${formatarData(i.data, 'diaMes')} · ${i.natureza === 'receita' ? (i.prevista && !i.prevista.recebida ? 'receita prevista' : 'receita') : i.tipo === 'fixa' ? 'despesa fixa' : 'despesa variável'} · ${i.descricao} · ${cat.get(i.categoriaId) ?? 'Outros'} · ${formatarValor(i.valor)}${i.parcela ? ` (parcela ${i.parcela.numero}/${i.parcela.total})` : ''}`,
    );
  if (itens.length) {
    linhas.push('Lançamentos do mês:');
    linhas.push(...itens);
  }
  linhas.push('');
  linhas.push('ÚLTIMOS 6 MESES (receita / despesas / investir / saldo)');
  for (let k = -5; k <= 0; k++) {
    const m = somarMeses(mes, k);
    const r = resumoMes(d, m);
    linhas.push(`- ${nomeMes(m, 'curto')}: ${formatarValor(r.receita)} / ${formatarValor(r.despesas)} / ${formatarValor(r.investir)} / ${formatarValor(r.saldo)}`);
  }
  const pat = resumoPatrimonio(d, mes);
  linhas.push('');
  linhas.push(
    `PATRIMÔNIO: liquidez ${formatarValor(pat.liquidez)}; investimentos ${formatarValor(pat.investimentos)}; bens ${formatarValor(pat.bens)}; dívidas ${formatarValor(pat.dividas)}; total ${formatarValor(pat.total)}.`,
  );
  const ativos = ativosNoMes(d, mes);
  if (ativos.length)
    linhas.push(
      'Investimentos: ' +
        ativos
          .map((a) => `${a.ativo.nome} (${ROTULO_TIPO[a.ativo.tipo]}) investido ${formatarValor(a.investido)}, atual ${formatarValor(a.atual)}`)
          .join('; ') +
        '.',
    );
  const metaRes = metaReserva(d.reserva.config);
  const atualRes = valorReserva(d, hoje);
  linhas.push(
    metaRes
      ? `RESERVA DE EMERGÊNCIA: ${formatarValor(atualRes)} de uma meta de ${formatarValor(metaRes)} (${formatarPct(percentualReserva(atualRes, metaRes) ?? 0)}).`
      : `RESERVA DE EMERGÊNCIA: meta ainda não definida; guardado ${formatarValor(atualRes)}.`,
  );
  if (d.metas.length) {
    linhas.push('METAS:');
    for (const m of d.metas) {
      const g = guardadoMeta(d, m, mes);
      const s = sugestaoMensal(m.total, g, m.prazo, hoje);
      linhas.push(
        `- ${m.nome}: ${formatarValor(g)} de ${formatarValor(m.total)}; faltam ${formatarValor(faltaMeta(m.total, g))}${m.prazo ? `; prazo ${formatarData(m.prazo)}` : ''}${s ? `; sugestão ${formatarValor(s, { semCentavos: true })}/mês` : ''}`,
      );
    }
  }
  linhas.push('');
  linhas.push('Categorias de despesa: ' + d.categorias.filter((c) => c.natureza === 'despesa' && !c.arquivada).map((c) => c.nome).join(', ') + '.');
  linhas.push('Fontes de renda: ' + d.categorias.filter((c) => c.natureza === 'receita' && !c.arquivada).map((c) => c.nome).join(', ') + '.');
  return linhas.join('\n');
}

/* ───────────── Ferramenta: proposta de lançamento ───────────── */

export interface Proposta {
  id: string;
  natureza: 'receita' | 'despesa';
  descricao: string;
  valor: number; // centavos
  data: DataISO;
  categoria: string;
  parcelas: number;
  recorrente: boolean;
  estado: 'pendente' | 'confirmada' | 'descartada';
}

export const ESQUEMA_PROPOSTA = {
  type: 'object' as const,
  properties: {
    natureza: { type: 'string', enum: ['receita', 'despesa'], description: 'receita (entrada) ou despesa (saída)' },
    descricao: { type: 'string', description: 'descrição curta, ex.: "Mercado"' },
    valor: { type: 'number', description: 'valor total em reais, ex.: 52.9' },
    data: { type: 'string', description: 'data no formato AAAA-MM-DD; use a data de hoje se não for dita' },
    categoria: { type: 'string', description: 'nome de uma categoria existente do Kofra' },
    parcelas: { type: 'number', description: 'número de parcelas para compra parcelada (1 se à vista)' },
    recorrente: { type: 'boolean', description: 'true se repete todo mês (receita fixa ou despesa fixa)' },
  },
  required: ['natureza', 'descricao', 'valor'],
};
