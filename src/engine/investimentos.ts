import type { Ativo, Dados, TipoAtivo, ValorAtivo } from '../storage/tipos';
import type { Mes } from './datas';
import { porcentagem, somar, type Centavos } from './dinheiro';

export const TIPOS_ATIVO: { tipo: TipoAtivo; rotulo: string; cor: string; icone: string }[] = [
  { tipo: 'renda_fixa', rotulo: 'Renda fixa', cor: 'c1', icone: 'bank' },
  { tipo: 'renda_variavel', rotulo: 'Renda variável', cor: 'c2', icone: 'chart-line-up' },
  { tipo: 'fundos_imobiliarios', rotulo: 'Fundos imobiliários', cor: 'c3', icone: 'buildings' },
  { tipo: 'internacional', rotulo: 'Internacional', cor: 'c4', icone: 'globe-hemisphere-west' },
  { tipo: 'cripto', rotulo: 'Criptoativos', cor: 'c5', icone: 'currency-circle-dollar' },
];

export const ROTULO_TIPO: Record<TipoAtivo, string> = Object.fromEntries(TIPOS_ATIVO.map((t) => [t.tipo, t.rotulo])) as Record<
  TipoAtivo,
  string
>;

/** Valores do ativo no mês: o último registro até ele (vale para os meses seguintes até mudar). */
export function valorAtivoNoMes(a: Ativo, mes: Mes): ValorAtivo | null {
  if (a.fim && mes > a.fim) return null;
  let escolhido: ValorAtivo | null = null;
  for (const v of a.valores) {
    if (v.mes <= mes && (!escolhido || v.mes >= escolhido.mes)) escolhido = v;
  }
  return escolhido;
}

export interface LinhaAtivo {
  ativo: Ativo;
  investido: Centavos;
  atual: Centavos;
  rendimento: Centavos;
  /** % com 1 casa sobre o investido; null quando o investido é zero. */
  rendimentoPct: number | null;
}

export function rendimento(investido: Centavos, atual: Centavos): { valor: Centavos; pct: number | null } {
  return { valor: atual - investido, pct: investido > 0 ? porcentagem(atual - investido, investido, 1) : null };
}

export function ativosNoMes(d: Pick<Dados, 'ativos'>, mes: Mes): LinhaAtivo[] {
  const linhas: LinhaAtivo[] = [];
  for (const a of d.ativos) {
    const v = valorAtivoNoMes(a, mes);
    if (!v) continue;
    const r = rendimento(v.investido, v.atual);
    linhas.push({ ativo: a, investido: v.investido, atual: v.atual, rendimento: r.valor, rendimentoPct: r.pct });
  }
  return linhas;
}

export interface ResumoInvestimentos {
  atual: Centavos;
  investido: Centavos;
  rendimento: Centavos;
  rendimentoPct: number | null;
  porTipo: { tipo: TipoAtivo; atual: Centavos; investido: Centavos; rendimento: Centavos; rendimentoPct: number | null; quantidade: number; pct: number }[];
}

export function resumoInvestimentos(d: Pick<Dados, 'ativos'>, mes: Mes): ResumoInvestimentos {
  const linhas = ativosNoMes(d, mes);
  const atual = somar(linhas.map((l) => l.atual));
  const investido = somar(linhas.map((l) => l.investido));
  const r = rendimento(investido, atual);
  const porTipo = TIPOS_ATIVO.map(({ tipo }) => {
    const doTipo = linhas.filter((l) => l.ativo.tipo === tipo);
    const at = somar(doTipo.map((l) => l.atual));
    const inv = somar(doTipo.map((l) => l.investido));
    const rt = rendimento(inv, at);
    return { tipo, atual: at, investido: inv, rendimento: rt.valor, rendimentoPct: rt.pct, quantidade: doTipo.length, pct: porcentagem(at, atual, 0) ?? 0 };
  }).filter((t) => t.quantidade > 0);
  return { atual, investido, rendimento: r.valor, rendimentoPct: r.pct, porTipo };
}

/** Valor atual de um ativo no mês (0 se não existir). */
export function atualDoAtivo(d: Pick<Dados, 'ativos'>, ativoId: string, mes: Mes): Centavos {
  const a = d.ativos.find((x) => x.id === ativoId);
  const v = a ? valorAtivoNoMes(a, mes) : null;
  return v?.atual ?? 0;
}
