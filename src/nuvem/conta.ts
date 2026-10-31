// Ponto de entrada da nuvem para o app: sessão, ações de conta e estado para as telas.
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { loja } from '../estado/loja';
import { criarCliente, criarRemoto, marcarAbaEscondida } from './cliente';
import { nuvemDisponivel } from './disponivel';
import { mensagemErroAuth } from './erros';
import { Sincronizador, type EstadoSincronizador } from './sincronizacao';

export interface EstadoConta {
  disponivel: boolean;
  /** A sessão guardada ainda está sendo lida. */
  carregando: boolean;
  /** A pessoa voltou pelo link de redefinição e precisa definir a senha nova. */
  recuperandoSenha: boolean;
  erroLink: string | null;
  saida: 'nenhuma' | 'saindo' | 'avisar-perda';
}

const ERRO_LINK = 'Não foi possível usar este link. Ele pode ter expirado ou ter sido aberto em outro navegador. Peça um novo em Configurações → Conta.';

const PARADO: EstadoSincronizador = { usuario: null, situacao: 'parada', erro: null, escolha: null, escolhaAberta: false };

let conta: EstadoConta = { disponivel: false, carregando: false, recuperandoSenha: false, erroLink: null, saida: 'nenhuma' };
let cliente: SupabaseClient | null = null;
let sincronizador: Sincronizador | null = null;
const ouvintes = new Set<() => void>();

function emitir() {
  for (const fn of ouvintes) fn();
}

function mudarConta(parcial: Partial<EstadoConta>) {
  conta = { ...conta, ...parcial };
  emitir();
}

const assinar = (fn: () => void) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const useConta = (): EstadoConta => useSyncExternalStore(assinar, () => conta);

const estadoSinc = () => sincronizador?.obterEstado() ?? PARADO;
export const useNuvem = (): EstadoSincronizador => useSyncExternalStore(assinar, estadoSinc);

export const obterSincronizador = () => sincronizador;

export function iniciarNuvem(): void {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!nuvemDisponivel({ url, chave }, window) || !url || !chave) return;

  const retornoDeLink = /[?&]code=/.test(location.search) || /[#&]error_description=/.test(location.search + location.hash);
  const c = criarCliente(url, chave);
  cliente = c;
  const s = new Sincronizador(loja, criarRemoto(c), async () => {
    await c.auth.signOut({ scope: 'local' });
  });
  sincronizador = s;
  s.assinar(emitir);
  loja.definirAoAlterar(() => s.aoAlterarDados());
  conta = { ...conta, disponivel: true, carregando: true };
  emitir();

  c.auth.onAuthStateChange((evento, sessao) => {
    // Fora do callback: o cliente segura uma trava enquanto avisa os ouvintes.
    setTimeout(() => {
      if (evento === 'PASSWORD_RECOVERY') mudarConta({ recuperandoSenha: true });
      s.definirUsuario(sessao ? { id: sessao.user.id, email: sessao.user.email ?? '' } : null);
      if (evento === 'SIGNED_OUT') {
        mudarConta({ recuperandoSenha: false });
        void loja.recarregarSeLimpo();
      }
    }, 0);
  });

  void c.auth.initialize().then(({ error }) => {
    // Aberto em outro navegador, o link não dá erro: o cliente só ignora o código e o deixa na URL.
    const codigoIgnorado = /[?&]code=/.test(location.search);
    if (retornoDeLink && (error || codigoIgnorado)) {
      history.replaceState(history.state, '', location.pathname);
      mudarConta({ erroLink: ERRO_LINK, carregando: false });
    } else {
      mudarConta({ carregando: false });
    }
  });

  document.addEventListener('visibilitychange', () => {
    const escondida = document.visibilityState === 'hidden';
    marcarAbaEscondida(escondida);
    if (escondida) void s.enviarPendente();
    else void s.verificar();
  });
  window.addEventListener('pagehide', () => {
    marcarAbaEscondida(true);
    void s.enviarPendente();
  });
  window.addEventListener('online', () => void s.verificar());
  window.addEventListener('offline', () => s.ficouSemInternet());
}

const online = () => navigator.onLine;

function erroDe(e: unknown): string {
  return mensagemErroAuth((e ?? {}) as { code?: string; message?: string; name?: string }, online());
}

export async function entrar(email: string, senha: string): Promise<string | null> {
  if (!cliente) return null;
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  return error ? erroDe(error) : null;
}

export async function criarConta(email: string, senha: string): Promise<string | null> {
  if (!cliente) return null;
  const { error } = await cliente.auth.signUp({ email, password: senha });
  return error ? erroDe(error) : null;
}

export async function pedirRedefinicao(email: string): Promise<string | null> {
  if (!cliente) return null;
  const { error } = await cliente.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/` });
  return error ? erroDe(error) : null;
}

export async function definirSenhaNova(senha: string): Promise<string | null> {
  if (!cliente) return null;
  const { error } = await cliente.auth.updateUser({ password: senha });
  if (error) return erroDe(error);
  mudarConta({ recuperandoSenha: false });
  return null;
}

export function fecharRecuperacao(): void {
  mudarConta({ recuperandoSenha: false });
}

export function fecharErroLink(): void {
  mudarConta({ erroLink: null });
}

/** true quando saiu; false quando falta a pessoa decidir o que fazer com o que não foi enviado. */
export async function sair(): Promise<boolean> {
  if (!sincronizador) return false;
  mudarConta({ saida: 'saindo' });
  const acao = await sincronizador.prepararSaida();
  if (acao === 'avisar-perda') {
    mudarConta({ saida: 'avisar-perda' });
    return false;
  }
  await sincronizador.concluirSaida(acao === 'apagar-local');
  mudarConta({ saida: 'nenhuma' });
  return true;
}

export async function sairMesmoAssim(): Promise<void> {
  await sincronizador?.concluirSaida(true);
  mudarConta({ saida: 'nenhuma' });
}

export function cancelarSaida(): void {
  mudarConta({ saida: 'nenhuma' });
}
