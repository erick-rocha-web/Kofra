import { describe, expect, it } from 'vitest';
import type { Dados, LocalReserva } from '../storage/tipos';
import { dadosVazios } from '../storage/padrao';
import { c, lerCsv, num } from './csv-teste';
import { janelaAnterior, janelaDoPeriodo, resumoFluxo, estoques, type Janela, type Periodo } from './visaoGeral';
import { percentualDoOrcamento } from './inicio';
import { estadoReserva, metaReserva, percentualReserva, valorReserva, MESES_NIVEL } from './reserva';

const HOJE_MES = '2026-10';
let seq = 0;

function janelaDaLinha(filtro: string, janela: string): Janela {
  const [inicio, fim] = janela.split('..');
  const p: Periodo =
    filtro === 'Mês atual'
      ? { tipo: 'mes' }
      : filtro === 'Personalizado'
        ? { tipo: 'personalizado', inicio, fim }
        : { tipo: 'meses', n: Number(filtro.split(' ')[0]) as 3 | 6 | 12 };
  return janelaDoPeriodo(p, HOJE_MES);
}

function serie(s: string): [string, number][] {
  return s
    .split('|')
    .filter(Boolean)
    .map((p) => {
      const [m, v] = p.split(':');
      return [m, c(v)];
    });
}

describe('visao_geral.csv — somas da janela, variação contra a janela anterior de mesmo tamanho', () => {
  for (const r of lerCsv('visao_geral.csv')) {
    it(`${r.id} (${r.papel}) ${r.filtro} ${r.descricao}`, () => {
      const d = dadosVazios();
      for (const [mes, v] of serie(r.receitas_por_mes))
        d.lancamentos.push({ id: `r${++seq}`, natureza: 'receita', descricao: 'r', valor: v, data: `${mes}-05`, categoriaId: 'cr-1', criadoEm: '' });
      for (const [mes, v] of serie(r.gastos_por_mes))
        d.lancamentos.push({ id: `g${++seq}`, natureza: 'despesa', descricao: 'g', valor: v, data: `${mes}-15`, categoriaId: 'cd-1', criadoEm: '' });
      const j = janelaDaLinha(r.filtro, r.janela);
      expect(`${j.inicio}..${j.fim}`).toBe(r.janela);
      const a = janelaAnterior(j);
      expect(`${a.inicio}..${a.fim}`).toBe(r.janela_anterior);
      const f = resumoFluxo(d, j);
      expect(f.receita).toBe(c(r.obs_receita));
      if (r.obs_gastos) expect(f.gastos).toBe(c(r.obs_gastos));
      if (r.obs_saldo_periodo) expect(f.saldo).toBe(c(r.obs_saldo_periodo));
      const conferir = (obs: string, v: typeof f.variacaoReceita) => {
        if (!obs) return;
        if (obs === 'sem anterior') expect(v.semAnterior).toBe(true);
        else {
          expect(v.semAnterior).toBe(false);
          if (!v.semAnterior) expect(v.valor).toBe(c(obs));
        }
      };
      conferir(r.obs_receita_variacao, f.variacaoReceita);
      conferir(r.obs_gastos_variacao, f.variacaoGastos);
    });
  }
});

describe('visao_geral_estoques.csv — valor no fim da janela contra o fim da janela anterior', () => {
  for (const r of lerCsv('visao_geral_estoques.csv')) {
    it(`${r.id} ${r.indicador} (${r.filtro})`, () => {
      const d: Pick<Dados, 'patrimonio' | 'ativos' | 'reserva'> = { patrimonio: [], ativos: [], reserva: { config: null, locais: [] } };
      const filtro = r.filtro;
      const janela =
        filtro === 'Mês atual' ? '2026-10..2026-10' : filtro === '3 meses' ? '2026-08..2026-10' : '2026-09..2026-10';
      const j = janelaDaLinha(filtro, janela);
      const fimAnt = janelaAnterior(j).fim;
      const fim = c(r.valor_fim_janela);
      const ant = c(r.valor_fim_janela_anterior);
      if (r.indicador === 'Patrimônio') {
        if (ant) d.patrimonio.push({ id: 'p1', grupo: 'liquidez', nome: 'a', valores: [{ mes: fimAnt, valor: ant }], fim: null, criadoEm: '' });
        d.patrimonio.push({ id: 'p2', grupo: 'liquidez', nome: 'b', valores: [{ mes: j.fim, valor: fim - ant }], fim: null, criadoEm: '' });
      } else if (r.indicador === 'Investimentos') {
        if (ant) d.ativos.push({ id: 'a1', nome: 'a', instituicao: '', tipo: 'renda_fixa', valores: [{ mes: fimAnt, investido: ant, atual: ant }], fim: null, criadoEm: '' });
        d.ativos.push({ id: 'a2', nome: 'b', instituicao: '', tipo: 'renda_fixa', valores: [{ mes: j.fim, investido: fim - ant, atual: fim - ant }], fim: null, criadoEm: '' });
      } else {
        const local: LocalReserva = { id: 'l1', nome: 'x', vinculo: { tipo: 'manual' }, movimentos: [], criadoEm: '' };
        if (ant) local.movimentos.push({ id: 'm1', data: `${fimAnt}-10`, valor: ant });
        local.movimentos.push({ id: 'm2', data: `${j.fim}-10`, valor: fim - ant });
        d.reserva.locais.push(local);
      }
      const e = estoques(d, j);
      const alvo = r.indicador === 'Patrimônio' ? e.patrimonio : r.indicador === 'Investimentos' ? e.investimentos : e.reserva;
      expect(alvo.valor).toBe(c(r.obs_valor));
      if (r.obs_variacao === 'sem anterior') expect(alvo.variacao.semAnterior).toBe(true);
      else if (!alvo.variacao.semAnterior) expect(alvo.variacao.valor).toBe(c(r.obs_variacao));
      else throw new Error('esperava variação');
    });
  }
});

describe('inicio_indicadores.csv — despesas ÷ (receita − investir)', () => {
  for (const r of lerCsv('inicio_indicadores.csv')) {
    it(r.id, () => {
      expect(percentualDoOrcamento(c(r.despesas), c(r.receita), c(r.investir))).toBe(Number(r.obs_percentual));
    });
  }
  it('sem orçamento livre devolve null', () => {
    expect(percentualDoOrcamento(100, 1000, 1000)).toBeNull();
  });
});

describe('reserva_meta.csv — custo × meses do nível', () => {
  for (const r of lerCsv('reserva_meta.csv')) {
    it(`${r.id} ${r.nivel}`, () => {
      const nivel = r.nivel === 'Básico' ? 'basico' : 'blindado';
      expect(MESES_NIVEL[nivel]).toBe(Number(r.meses));
      expect(metaReserva({ nivel, custoMensal: c(r.custo_mensal) })).toBe(c(r.obs_meta));
    });
  }
});

describe('reserva_percentual.csv — soma dos locais; % inteiro meio para cima; 3 estados', () => {
  for (const r of lerCsv('reserva_percentual.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const d: Pick<Dados, 'ativos' | 'reserva'> = { ativos: [], reserva: { config: null, locais: [] } };
      r.locais
        .split('|')
        .filter(Boolean)
        .forEach((v, i) => d.reserva.locais.push({ id: `l${i}`, nome: 'x', vinculo: { tipo: 'manual' }, movimentos: [{ id: `m${i}`, data: '2026-10-01', valor: c(v) }], criadoEm: '' }));
      const atual = valorReserva(d, '2026-10-27');
      const meta = c(r.meta);
      expect(atual).toBe(c(r.obs_valor_atual));
      expect(estadoReserva(atual, meta)).toBe(r.estado_pila);
      if (r.obs_percentual) expect(percentualReserva(atual, meta)).toBe(num(r.obs_percentual));
    });
  }
  it('local ligado a investimento acompanha o valor atual dele', () => {
    const d: Pick<Dados, 'ativos' | 'reserva'> = {
      ativos: [{ id: 'a', nome: 'Selic', instituicao: '', tipo: 'renda_fixa', valores: [{ mes: '2026-09', investido: 100000, atual: 101000 }, { mes: '2026-10', investido: 100000, atual: 102000 }], fim: null, criadoEm: '' }],
      reserva: { config: null, locais: [{ id: 'l', nome: 'Selic', vinculo: { tipo: 'ativo', ativoId: 'a' }, movimentos: [], criadoEm: '' }] },
    };
    expect(valorReserva(d, '2026-09-30')).toBe(101000);
    expect(valorReserva(d, '2026-10-27')).toBe(102000);
  });
});
