import { produce, type Draft } from 'immer';
import { useSyncExternalStore } from 'react';
import { SINC_INICIAL, type Dados, type EstadoSinc } from '../storage/tipos';
import { criarArmazenamento, type Armazenamento } from '../storage/armazenamento';
import { dadosVazios, normalizarDados } from '../storage/padrao';

export interface EstadoLoja {
  status: 'carregando' | 'pronto';
  /** false quando o navegador não deixa guardar (dados só na memória desta aba). */
  persistente: boolean;
  erroAoSalvar: string | null;
}

type Ouvinte = () => void;

class Loja {
  private dados: Dados = dadosVazios();
  private estado: EstadoLoja = { status: 'carregando', persistente: true, erroAoSalvar: null };
  private ouvintes = new Set<Ouvinte>();
  private armazenamento: Armazenamento | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sujo = false;
  private sinc: EstadoSinc = SINC_INICIAL;
  private aoAlterar: Ouvinte | null = null;

  obterDados = (): Dados => this.dados;
  obterEstado = (): EstadoLoja => this.estado;
  obterSinc = (): EstadoSinc => this.sinc;

  assinar = (fn: Ouvinte): (() => void) => {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  };

  private emitir() {
    for (const fn of this.ouvintes) fn();
  }

  private mudarEstado(parcial: Partial<EstadoLoja>) {
    this.estado = { ...this.estado, ...parcial };
    this.emitir();
  }

  async iniciar(): Promise<void> {
    this.armazenamento = await criarArmazenamento();
    let persistente = this.armazenamento.tipo === 'indexeddb';
    try {
      const salvo = await this.armazenamento.carregar();
      if (salvo) this.dados = normalizarDados(salvo);
      this.sinc = (await this.armazenamento.carregarSinc()) ?? SINC_INICIAL;
    } catch {
      persistente = false;
    }
    this.mudarEstado({ status: 'pronto', persistente });
    const salvarAoSair = () => void this.salvarAgora();
    window.addEventListener('pagehide', salvarAoSair);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') salvarAoSair();
    });
  }

  /** Aplica uma alteração (rascunho mutável via immer) e agenda o salvamento. */
  atualizar(receita: (rascunho: Draft<Dados>) => void): void {
    this.dados = produce(this.dados, receita);
    this.marcarAlterado();
    this.agendar();
  }

  substituir(dados: Dados): void {
    this.dados = dados;
    this.marcarAlterado();
    void this.salvarAgora();
  }

  private marcarAlterado() {
    this.sujo = true;
    if (this.sinc.usuarioId && !this.sinc.pendente) this.sinc = { ...this.sinc, pendente: true };
    this.emitir();
    this.aoAlterar?.();
  }

  /** A sincronização assina aqui: é chamada a cada alteração feita pela pessoa. */
  definirAoAlterar(fn: Ouvinte | null): void {
    this.aoAlterar = fn;
  }

  async definirSinc(sinc: EstadoSinc): Promise<void> {
    this.sinc = sinc;
    this.emitir();
    try {
      await this.armazenamento?.salvarSinc(sinc);
    } catch {
      /* o próximo salvamento grava de novo; no pior caso, a nuvem acusa conflito */
    }
  }

  /** Troca os dados pelos da nuvem e grava junto o novo estado da sincronização. */
  async aplicarDaNuvem(dados: Dados, sinc: EstadoSinc): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.dados = dados;
    this.sinc = sinc;
    this.sujo = true;
    this.emitir();
    await this.salvarAgora();
  }

  async limpar(sinc: EstadoSinc): Promise<void> {
    await this.apagarTudo();
    await this.definirSinc(sinc);
  }

  /** Outra aba saiu da conta e apagou a cópia local: esta aba acompanha. */
  async recarregarSeLimpo(): Promise<void> {
    if (!this.armazenamento || !this.sinc.usuarioId) return;
    const sinc = await this.armazenamento.carregarSinc();
    if (sinc?.usuarioId) return;
    const salvo = await this.armazenamento.carregar();
    if (this.timer) clearTimeout(this.timer);
    this.dados = salvo ? normalizarDados(salvo) : dadosVazios();
    this.sinc = sinc ?? SINC_INICIAL;
    this.sujo = false;
    this.emitir();
  }

  private agendar() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.salvarAgora(), 300);
  }

  async salvarAgora(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    if (!this.armazenamento || !this.sujo) return;
    const gravados = this.dados;
    try {
      await this.armazenamento.salvar(gravados, this.sinc);
      // Uma alteração feita durante a gravação continua pendente para o próximo salvamento.
      if (this.dados === gravados) this.sujo = false;
      if (this.estado.erroAoSalvar) this.mudarEstado({ erroAoSalvar: null });
    } catch (e) {
      this.mudarEstado({ erroAoSalvar: e instanceof Error ? e.message : 'Falha ao salvar' });
    }
  }

  async apagarTudo(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.dados = dadosVazios();
    this.sinc = SINC_INICIAL;
    this.sujo = false;
    this.emitir();
    try {
      await this.armazenamento?.apagarTudo();
    } catch {
      /* se falhar, o próximo salvamento sobrescreve */
    }
  }
}

export const loja = new Loja();

export function useDados(): Dados {
  return useSyncExternalStore(loja.assinar, loja.obterDados, loja.obterDados);
}

export function useEstadoLoja(): EstadoLoja {
  return useSyncExternalStore(loja.assinar, loja.obterEstado, loja.obterEstado);
}

export function useSinc(): EstadoSinc {
  return useSyncExternalStore(loja.assinar, loja.obterSinc, loja.obterSinc);
}

export const atualizar = (receita: (rascunho: Draft<Dados>) => void) => loja.atualizar(receita);
