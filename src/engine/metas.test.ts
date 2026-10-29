import { describe, expect, it } from 'vitest';
import type { Meta } from '../storage/tipos';
import { c, dataCsv, lerCsv } from './csv-teste';
import { faltaMeta, guardadoMeta, metaConcluida, progressoMeta, sugestaoMensal } from './metas';

const meta = (total: number, movimentos: number[] = []): Meta => ({
  id: 'm',
  nome: 'Teste',
  emoji: '✈️',
  cor: 'c1',
  total,
  prazo: null,
  guardarEm: { tipo: 'texto', texto: '' },
  movimentos: movimentos.map((v, i) => ({ id: `x${i}`, data: '2026-10-01', valor: v })),
  criadoEm: '',
});

describe('metas_aporte_mensal.csv — falta ÷ meses até o prazo (dia não conta), reais inteiros', () => {
  for (const r of lerCsv('metas_aporte_mensal.csv')) {
    it(`${r.id} (${r.papel}) prazo ${r.prazo} ${r.descricao}`, () => {
      const s = sugestaoMensal(c(r.valor_total), c(r.guardado), dataCsv(r.prazo), dataCsv(r.hoje));
      if (r.obs_sugestao === 'oculto') expect(s).toBeNull();
      else expect(s).toBe(Number(r.obs_sugestao) * 100);
    });
  }
  it('sem prazo não sugere', () => {
    expect(sugestaoMensal(100000, 0, null, '2026-10-27')).toBeNull();
  });
});

describe('metas_progresso.csv — guardado, falta e concluída', () => {
  for (const r of lerCsv('metas_progresso.csv')) {
    it(`${r.id} ${r.descricao}`, () => {
      const movs = r.movimentacoes ? r.movimentacoes.split('|').map(c) : [];
      const m = meta(c(r.valor_total), movs);
      const g = guardadoMeta({ ativos: [] }, m, '2026-10');
      expect(g).toBe(c(r.obs_guardado));
      if (r.obs_falta) expect(faltaMeta(m.total, g)).toBe(c(r.obs_falta));
      expect(metaConcluida(m.total, g)).toBe(r.obs_concluida === 'sim');
    });
  }
  it('barra limitada a 100% e guardado com investimentos ligados', () => {
    expect(progressoMeta(1200000, 1230000)).toBe(100);
    expect(progressoMeta(1200000, 130000)).toBe(11);
    const m = meta(2000000);
    m.guardarEm = { tipo: 'ativos', ativoIds: ['a'] };
    const d = { ativos: [{ id: 'a', nome: 'CDB', instituicao: '', tipo: 'renda_fixa' as const, valores: [{ mes: '2026-10', investido: 1000000, atual: 1085000 }], fim: null, criadoEm: '' }] };
    expect(guardadoMeta(d, m, '2026-10')).toBe(1085000);
  });
});
