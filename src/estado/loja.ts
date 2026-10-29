import { produce, type Draft } from 'immer';
import { useSyncExternalStore } from 'react';
import type { Dados } from '../storage/tipos';
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

  obterDados = (): Dados => this.dados;
  obterEstado = (): EstadoLoja => this.estado;

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
    this.sujo = true;
    this.emitir();
    this.agendar();
  }

  substituir(dados: Dados): void {
    this.dados = dados;
    this.sujo = true;
    this.emitir();
    void this.salvarAgora();
  }

  private agendar() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.salvarAgora(), 300);
  }

  async salvarAgora(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    if (!this.armazenamento || !this.sujo) return;
    try {
      await this.armazenamento.salvar(this.dados);
      this.sujo = false;
      if (this.estado.erroAoSalvar) this.mudarEstado({ erroAoSalvar: null });
    } catch (e) {
      this.mudarEstado({ erroAoSalvar: e instanceof Error ? e.message : 'Falha ao salvar' });
    }
  }

  async apagarTudo(): Promise<void> {
    this.dados = dadosVazios();
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

export const atualizar = (receita: (rascunho: Draft<Dados>) => void) => loja.atualizar(receita);
