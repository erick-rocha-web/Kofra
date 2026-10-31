import { describe, expect, it } from 'vitest';
import { ErroBackup, gerarBackup, lerBackup, nomeArquivoBackup } from './backup';
import { dadosVazios } from './padrao';

describe('backup', () => {
  const agora = new Date(2026, 9, 30, 12);

  it('exporta com o nome pila-backup-… e app pila', () => {
    expect(nomeArquivoBackup(agora)).toBe('pila-backup-2026-10-30.json');
    expect(JSON.parse(gerarBackup(dadosVazios(), agora)).app).toBe('pila');
  });

  it('lê de volta o que exportou', () => {
    const dados = dadosVazios();
    dados.config.nome = 'Ana';
    const lido = lerBackup(gerarBackup(dados, agora));
    expect(lido.dados).toEqual(dados);
    expect(lido.exportadoEm).toBe(agora.toISOString());
  });

  it('aceita um backup antigo, com app kofra', () => {
    const dados = dadosVazios();
    dados.config.nome = 'Ana';
    const antigo = JSON.stringify({ app: 'kofra', formato: 1, exportadoEm: agora.toISOString(), dados });
    expect(lerBackup(antigo).dados).toEqual(dados);
  });

  it('recusa texto que não é JSON e JSON de outro app', () => {
    expect(() => lerBackup('isto não é json')).toThrow(ErroBackup);
    const deOutroApp = JSON.stringify({ app: 'outro', formato: 1, dados: dadosVazios() });
    expect(() => lerBackup(deOutroApp)).toThrow(ErroBackup);
  });
});
