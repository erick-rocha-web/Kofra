import { describe, expect, it } from 'vitest';
import type { Ativo, Dados, GrupoPatrimonio, ItemPatrimonio, TipoAtivo } from '../storage/tipos';
import { c, lerCsv, num } from './csv-teste';
import { composicaoDetalhada, itensNoMes, resumoPatrimonio, valorNoMes } from './patrimonio';
import { resumoInvestimentos, rendimento, TIPOS_ATIVO } from './investimentos';

type D = Pick<Dados, 'patrimonio' | 'ativos'>;
let seq = 0;
const item = (grupo: GrupoPatrimonio, nome: string, mes: string, valor: number): ItemPatrimonio => ({
  id: `i${++seq}`,
  grupo,
  nome,
  valores: [{ mes, valor }],
  fim: null,
  criadoEm: '',
});
const ativo = (tipo: TipoAtivo, mes: string, investido: number, atual: number, nome = 'ativo'): Ativo => ({
  id: `a${++seq}`,
  nome,
  instituicao: '',
  tipo,
  valores: [{ mes, investido, atual }],
  fim: null,
  criadoEm: '',
});

describe('patrimonio.csv — liquidez + investimentos + bens − dívidas', () => {
  for (const r of lerCsv('patrimonio.csv')) {
    it(`${r.id} (${r.papel}) ${r.descricao}`, () => {
      const d: D = { patrimonio: [], ativos: [] };
      if (c(r.liquidez)) d.patrimonio.push(item('liquidez', 'liquidez', r.mes, c(r.liquidez)));
      if (c(r.bens)) d.patrimonio.push(item('bem', 'bem', r.mes, c(r.bens)));
      if (c(r.dividas)) d.patrimonio.push(item('divida', 'dívida', r.mes, c(r.dividas)));
      if (c(r.investimentos)) d.ativos.push(ativo('renda_fixa', r.mes, c(r.investimentos), c(r.investimentos)));
      const total = resumoPatrimonio(d, r.mes).total;
      if (r.precisao_obs === 'reais') expect(Math.round(total / 100)).toBe(Number(r.obs_patrimonio));
      else expect(total).toBe(c(r.obs_patrimonio));
    });
  }
});

describe('patrimonio_composicao.csv — % inteiro sem as dívidas, investimentos por tipo', () => {
  const tipoPorRotulo = Object.fromEntries(TIPOS_ATIVO.map((t) => [t.rotulo, t.tipo]));
  for (const r of lerCsv('patrimonio_composicao.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const d: D = { patrimonio: [], ativos: [] };
      const partes = r.itens.split('|').map((p) => p.split(':'));
      for (const [nome, grupo, valor] of partes) {
        if (grupo === 'investimento') d.ativos.push(ativo(tipoPorRotulo[nome], r.mes, c(valor), c(valor)));
        else d.patrimonio.push(item(grupo === 'bem' ? 'bem' : grupo === 'divida' ? 'divida' : 'liquidez', nome, r.mes, c(valor)));
      }
      const comp = Object.fromEntries(composicaoDetalhada(d, r.mes).map((p) => [p.rotulo, p.pct]));
      const esperado = r.obs_percentuais.split('|');
      partes.forEach(([nome, grupo], i) => {
        if (grupo === 'divida') expect(comp[nome]).toBeUndefined();
        else expect(comp[nome]).toBe(Number(esperado[i]));
      });
    });
  }
});

describe('investimentos_rendimento.csv — rendimento = atual − investido; % sobre o investido', () => {
  for (const r of lerCsv('investimentos_rendimento.csv')) {
    it(`${r.id} ${r.ativo}`, () => {
      const res = rendimento(c(r.valor_investido), c(r.valor_atual));
      expect(res.valor).toBe(c(r.obs_rendimento));
      if (r.obs_rendimento_pct) expect(res.pct).toBe(num(r.obs_rendimento_pct));
      if (c(r.valor_investido) === 0) expect(res.pct).toBeNull();
    });
  }
  it('R03 pelos totais da carteira', () => {
    const d: D = { patrimonio: [], ativos: [ativo('renda_fixa', '2026-10', 1000000, 1085000), ativo('renda_variavel', '2026-10', 500000, 460000)] };
    const res = resumoInvestimentos(d, '2026-10');
    expect(res.atual).toBe(1545000);
    expect(res.investido).toBe(1500000);
    expect(res.rendimento).toBe(45000);
    expect(res.rendimentoPct).toBe(3);
    expect(res.porTipo.map((t) => t.rendimentoPct)).toEqual([8.5, -8]);
  });
});

describe('modelo mês a mês (CONFIRMADO)', () => {
  it('o valor vale para os meses seguintes até mudar; antes da criação o item não existe', () => {
    const carro = item('bem', 'Carro', '2026-10', 3000000);
    carro.valores.push({ mes: '2026-11', valor: 2900000 });
    expect(valorNoMes(carro.valores, '2026-09')).toBeNull();
    expect(valorNoMes(carro.valores, '2026-10')).toBe(3000000);
    expect(valorNoMes(carro.valores, '2026-12')).toBe(2900000);
    carro.fim = '2027-01';
    expect(valorNoMes(carro.valores, '2027-02', carro.fim)).toBeNull();
  });
  it('item criado em setembro continua valendo em outubro (PT07 → PT08)', () => {
    const d: D = { patrimonio: [item('liquidez', 'Conta Set', '2026-09', 500000)], ativos: [] };
    expect(resumoPatrimonio(d, '2026-10').liquidez).toBe(500000);
    expect(itensNoMes(d, '2026-10')[0].registradoNoMes).toBe(false);
  });
});
