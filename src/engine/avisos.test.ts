import { describe, expect, it } from 'vitest';
import { dadosVazios } from '../storage/padrao';
import { calcularAvisos } from './avisos';

describe('avisos', () => {
  it('receita prevista atrasada e despesa fixa vencendo em até 3 dias', () => {
    const d = dadosVazios();
    d.lancamentos.push({ id: 'p1', natureza: 'receita', descricao: 'Reembolso', valor: 35000, data: '2026-10-20', categoriaId: 'cr-3', prevista: { recebida: false }, criadoEm: '' });
    d.lancamentos.push({ id: 'p2', natureza: 'receita', descricao: 'Bônus', valor: 1000, data: '2026-10-30', categoriaId: 'cr-3', prevista: { recebida: false }, criadoEm: '' });
    d.recorrentes.push({ id: 'r1', natureza: 'despesa', inicio: '2026-01', fim: null, versoes: [{ aPartirDe: '2026-01', descricao: 'Aluguel', valor: 190000, dia: 29, categoriaId: 'cd-1' }], criadoEm: '' });
    d.recorrentes.push({ id: 'r2', natureza: 'despesa', inicio: '2026-01', fim: null, versoes: [{ aPartirDe: '2026-01', descricao: 'Internet', valor: 12000, dia: 1, categoriaId: 'cd-9' }], criadoEm: '' });
    d.recorrentes.push({ id: 'r3', natureza: 'despesa', inicio: '2026-01', fim: null, versoes: [{ aPartirDe: '2026-01', descricao: 'Academia', valor: 9990, dia: 15, categoriaId: 'cd-4' }], criadoEm: '' });
    const avisos = calcularAvisos(d, '2026-10-29');
    expect(avisos.map((a) => a.tipo)).toEqual(['receita-atrasada', 'despesa-vencendo', 'despesa-vencendo']);
    expect(avisos[1].titulo).toBe('Aluguel vence hoje');
    expect(avisos[2].titulo).toBe('Internet vence em 3 dias'); // 01/11, virada de mês
  });
  it('meta com prazo em até 30 dias e ainda incompleta', () => {
    const d = dadosVazios();
    const base = { emoji: '✈️', cor: 'c1', guardarEm: { tipo: 'texto' as const, texto: '' }, criadoEm: '' };
    d.metas.push({ ...base, id: 'm1', nome: 'Viagem', total: 100000, prazo: '2026-11-20', movimentos: [{ id: 'a', data: '2026-10-01', valor: 40000 }] });
    d.metas.push({ ...base, id: 'm2', nome: 'Pronta', total: 100000, prazo: '2026-11-10', movimentos: [{ id: 'b', data: '2026-10-01', valor: 100000 }] });
    d.metas.push({ ...base, id: 'm3', nome: 'Longe', total: 100000, prazo: '2027-06-01', movimentos: [] });
    const avisos = calcularAvisos(d, '2026-10-29');
    expect(avisos.map((a) => a.id)).toEqual(['meta:m1:2026-11-20']);
    expect(avisos[0].valor).toBe(60000);
    expect(avisos[0].titulo).toBe('✈️ Viagem: faltam 22 dias');
  });
});
