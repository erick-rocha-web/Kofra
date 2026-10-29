import type { Dados } from './tipos';
import { VERSAO_DADOS } from './tipos';
import { normalizarDados } from './padrao';

interface ArquivoBackup {
  app: 'kofra';
  formato: 1;
  exportadoEm: string;
  dados: Dados;
}

export function nomeArquivoBackup(agora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `kofra-backup-${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}.json`;
}

export function gerarBackup(dados: Dados, agora = new Date()): string {
  const arquivo: ArquivoBackup = { app: 'kofra', formato: 1, exportadoEm: agora.toISOString(), dados };
  return JSON.stringify(arquivo, null, 2);
}

export class ErroBackup extends Error {}

/** Lê o texto de um backup e devolve dados prontos para uso, ou lança ErroBackup com explicação. */
export function lerBackup(texto: string): { dados: Dados; exportadoEm: string | null } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroBackup('O arquivo não é um JSON válido. Escolha o arquivo .json exportado pelo Kofra.');
  }
  if (!bruto || typeof bruto !== 'object') throw new ErroBackup('Arquivo vazio ou num formato desconhecido.');
  const obj = bruto as Partial<ArquivoBackup> & Partial<Dados>;
  const dados = (obj.app === 'kofra' ? obj.dados : obj) as Partial<Dados> | undefined;
  if (!dados || typeof dados !== 'object' || !('config' in dados) || !Array.isArray(dados.categorias)) {
    throw new ErroBackup('Este arquivo não parece ser um backup do Kofra.');
  }
  if (typeof dados.versao === 'number' && dados.versao > VERSAO_DADOS) {
    throw new ErroBackup('Este backup veio de uma versão mais nova do Kofra. Atualize o app antes de importar.');
  }
  return { dados: normalizarDados(dados), exportadoEm: typeof obj.exportadoEm === 'string' ? obj.exportadoEm : null };
}
