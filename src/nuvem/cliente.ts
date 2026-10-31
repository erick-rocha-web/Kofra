import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Dados } from '../storage/tipos';
import { ErroSemRede, type Gravacao, type Remoto } from './sincronizacao';

/** Limite do navegador para pedidos que continuam depois de a aba fechar. */
const LIMITE_KEEPALIVE = 60_000;

let abaEscondida = false;

export function marcarAbaEscondida(escondida: boolean): void {
  abaEscondida = escondida;
}

const fetchDaAba: typeof fetch = (entrada, init) => {
  const corpo = init?.body;
  const keepalive = abaEscondida && typeof corpo === 'string' && corpo.length < LIMITE_KEEPALIVE;
  return fetch(entrada, keepalive ? { ...init, keepalive } : init);
};

export function criarCliente(url: string, chave: string): SupabaseClient {
  return createClient(url, chave, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    global: { fetch: fetchDaAba },
  });
}

function falha(error: { message?: string; code?: string }): Error {
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(error.message ?? '')) return new ErroSemRede();
  return new Error(error.message ?? 'Falha na nuvem');
}

/** No banco, a revisão é a coluna `versao`; não confundir com Dados.versao, o formato dos dados. */
const gravacao = (linha: { versao: number; atualizado_em: string }): Gravacao => ({ revisao: linha.versao, atualizadoEm: linha.atualizado_em });

export function criarRemoto(cliente: SupabaseClient): Remoto {
  const tabela = () => cliente.from('documentos');
  return {
    async lerRevisao(usuarioId) {
      const { data, error } = await tabela().select('versao').eq('usuario_id', usuarioId).maybeSingle();
      if (error) throw falha(error);
      return data ? (data.versao as number) : null;
    },
    async baixar(usuarioId) {
      const { data, error } = await tabela().select('dados, versao, atualizado_em').eq('usuario_id', usuarioId).maybeSingle();
      if (error) throw falha(error);
      return data ? { dados: data.dados, ...gravacao(data) } : null;
    },
    async criar(usuarioId, dados: Dados, revisao) {
      const { data, error } = await tabela()
        .insert({ usuario_id: usuarioId, dados, versao: revisao })
        .select('versao, atualizado_em')
        .single();
      if (error?.code === '23505') return null;
      if (error) throw falha(error);
      return gravacao(data);
    },
    async atualizar(usuarioId, dados: Dados, revisaoBase) {
      const { data, error } = await tabela()
        .update({ dados, versao: revisaoBase + 1 })
        .eq('usuario_id', usuarioId)
        .eq('versao', revisaoBase)
        .select('versao, atualizado_em');
      if (error) throw falha(error);
      return data.length ? gravacao(data[0]) : null;
    },
    async apagar(usuarioId) {
      const { error } = await tabela().delete().eq('usuario_id', usuarioId);
      if (error) throw falha(error);
    },
  };
}
