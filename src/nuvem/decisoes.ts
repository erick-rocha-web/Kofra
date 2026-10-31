// Decisões da sincronização: funções puras, sem rede nem IndexedDB.
import { dadosVazios, temDadosProprios } from '../storage/padrao';
import { VERSAO_DADOS, type Dados, type EstadoSinc } from '../storage/tipos';

export type Acao =
  | 'nada'
  | 'enviar'
  | 'baixar'
  /** A conta passa a ser dona da cópia local, sem documento na nuvem e sem nada a perguntar. */
  | 'assumir'
  /** O documento sumiu da nuvem e esta cópia não tem nada: só esquece a revisão antiga. */
  | 'esquecer-revisao'
  | 'perguntar-enviar'
  | 'perguntar-qual-manter'
  | 'conflito';

export interface Situacao {
  usuarioId: string;
  sinc: EstadoSinc;
  temDados: boolean;
  /** null quando a conta não tem documento na nuvem. */
  revisaoNuvem: number | null;
}

export function decidir({ usuarioId, sinc, temDados, revisaoNuvem }: Situacao): Acao {
  if (sinc.usuarioId !== usuarioId) {
    // Os dados deste navegador não são desta conta.
    if (revisaoNuvem === null) return temDados ? 'perguntar-enviar' : 'assumir';
    return temDados ? 'perguntar-qual-manter' : 'baixar';
  }
  if (revisaoNuvem === null) {
    if (sinc.revisaoBase === 0) return sinc.pendente ? 'enviar' : 'nada';
    // Esta cópia já esteve na nuvem e o documento sumiu: foi apagado em outro aparelho.
    return temDados || sinc.pendente ? 'conflito' : 'esquecer-revisao';
  }
  if (revisaoNuvem === sinc.revisaoBase) return sinc.pendente ? 'enviar' : 'nada';
  return sinc.pendente ? 'conflito' : 'baixar';
}

export type AcaoSaida = 'apagar-local' | 'manter-local' | 'avisar-perda';

/** Só apaga o que está garantido na nuvem. Dados que nunca foram da conta ficam no navegador. */
export function decidirSaida(usuarioId: string, sinc: EstadoSinc): AcaoSaida {
  if (sinc.usuarioId !== usuarioId) return 'manter-local';
  return sinc.pendente ? 'avisar-perda' : 'apagar-local';
}

/** Dados de exemplo não contam: são fictícios e nunca vão para a nuvem. */
export function temDadosLocais(d: Dados): boolean {
  if (d.config.exemplo) return false;
  if (temDadosProprios(d)) return true;
  const padrao = dadosVazios();
  return !iguais(d.categorias, padrao.categorias) || !iguais(d.aulas, padrao.aulas);
}

function canonico(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, canonico(o[k])]),
    );
  }
  return v;
}

/** Compara como JSON, sem depender da ordem das chaves: o jsonb do banco não a preserva. */
export function iguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonico(JSON.parse(JSON.stringify(a ?? null)))) === JSON.stringify(canonico(JSON.parse(JSON.stringify(b ?? null))));
}

export function documentoValido(d: unknown): d is Partial<Dados> {
  return !!d && typeof d === 'object' && 'config' in d && Array.isArray((d as Partial<Dados>).categorias);
}

/** Um formato mais novo que este app não pode ser lido aqui, nem sobrescrito. */
export function formatoMaisNovo(d: Partial<Dados>): boolean {
  return typeof d.versao === 'number' && d.versao > VERSAO_DADOS;
}
