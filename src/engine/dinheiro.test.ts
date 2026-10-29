import { describe, expect, it } from 'vitest';
import {
  dividirArredondando,
  dividirEmParcelas,
  dividirEmReaisInteiros,
  lerValor,
  percentualDoValor,
  porcentagem,
} from './dinheiro';
import { formatarPct, formatarValor, textoTempo } from './formato';
import { dataNoMes, diferencaMeses, listarMeses, nomeMes, somarMeses } from './datas';

describe('arredondamento meio para cima', () => {
  it('arredonda .5 para longe do zero', () => {
    expect(dividirArredondando(5n, 2n)).toBe(3n);
    expect(dividirArredondando(-5n, 2n)).toBe(-3n);
    expect(dividirArredondando(4n, 3n)).toBe(1n);
    expect(dividirArredondando(5n, 3n)).toBe(2n);
  });
  it('percentual com meio centavo sobe (não é arredondamento bancário)', () => {
    expect(percentualDoValor(600015, 30)).toBe(180005); // 1.800,045 → 1.800,05
    expect(percentualDoValor(600005, 30)).toBe(180002); // 1.800,015 → 1.800,02
    expect(percentualDoValor(600015, 20)).toBe(120003);
    expect(percentualDoValor(0, 30)).toBe(0);
  });
  it('porcentagem com casas', () => {
    expect(porcentagem(75000, 600000, 1)).toBe(12.5);
    expect(porcentagem(622500, 1500000, 0)).toBe(42); // 41,5%
    expect(porcentagem(1492500, 1500000, 0)).toBe(100); // 99,5%
    expect(porcentagem(11750000, 100000000, 1)).toBe(11.8); // 11,75%
    expect(porcentagem(88250000, 100000000, 1)).toBe(88.3); // 88,25%
    expect(porcentagem(1, 0)).toBeNull();
  });
  it('reais inteiros', () => {
    expect(dividirEmReaisInteiros(1200000, 14)).toBe(85700);
    expect(dividirEmReaisInteiros(915000, 14)).toBe(65400);
  });
});

describe('parcelas', () => {
  it('a primeira absorve a sobra', () => {
    expect(dividirEmParcelas(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(dividirEmParcelas(10000, 6)).toEqual([1665, 1667, 1667, 1667, 1667, 1667]);
    expect(dividirEmParcelas(500, 1)).toEqual([500]);
  });
});

describe('leitura e formato', () => {
  it('lê valores em pt-BR', () => {
    expect(lerValor('1.234,56')).toBe(123456);
    expect(lerValor('R$ 1.000')).toBe(100000);
    expect(lerValor('-2200,00')).toBe(-220000);
    expect(lerValor('0,05')).toBe(5);
    expect(lerValor('12,345')).toBeNull();
    expect(lerValor('')).toBeNull();
  });
  it('formata valores e percentuais', () => {
    expect(formatarValor(123456)).toBe('R$ 1.234,56');
    expect(formatarValor(-220000)).toBe('−R$ 2.200,00');
    expect(formatarValor(85000, { sinal: true })).toBe('+R$ 850,00');
    expect(formatarValor(4298321, { semCentavos: true })).toBe('R$ 42.983');
    expect(formatarPct(12.5, 1)).toBe('12,5%');
    expect(formatarPct(-8, 1)).toBe('−8,0%');
  });
  it('texto de tempo', () => {
    expect(textoTempo(232)).toBe('19 anos e 4 meses');
    expect(textoTempo(12)).toBe('1 ano');
    expect(textoTempo(11)).toBe('11 meses');
    expect(textoTempo(240)).toBe('20 anos');
    expect(textoTempo(13)).toBe('1 ano e 1 mês');
  });
});

describe('datas', () => {
  it('meses', () => {
    expect(somarMeses('2026-10', 3)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(diferencaMeses('2026-10', '2027-12')).toBe(14);
    expect(listarMeses('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(dataNoMes('2027-02', 31)).toBe('2027-02-28');
    expect(nomeMes('2026-10', 'rotulo')).toBe('Out 2026');
    expect(nomeMes('2026-10', 'longo')).toBe('outubro de 2026');
  });
});
