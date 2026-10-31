// Liga a cópia local à nuvem. Rede e IndexedDB chegam de fora, para dar para testar sem eles.
import { normalizarDados } from '../storage/padrao';
import type { Dados, EstadoSinc } from '../storage/tipos';
import { decidir, decidirSaida, documentoValido, formatoMaisNovo, iguais, temDadosLocais, type AcaoSaida } from './decisoes';

export const ATRASO_ENVIO_MS = 2000;

export interface DocumentoNuvem {
  dados: unknown;
  revisao: number;
  atualizadoEm: string;
}

export type Gravacao = Pick<DocumentoNuvem, 'revisao' | 'atualizadoEm'>;

export class ErroSemRede extends Error {}

export interface Remoto {
  lerRevisao(usuarioId: string): Promise<number | null>;
  baixar(usuarioId: string): Promise<DocumentoNuvem | null>;
  /** null: o documento já existe. */
  criar(usuarioId: string, dados: Dados, revisao: number): Promise<Gravacao | null>;
  /** null: a revisão no banco não é mais `revisaoBase`. */
  atualizar(usuarioId: string, dados: Dados, revisaoBase: number): Promise<Gravacao | null>;
  apagar(usuarioId: string): Promise<void>;
}

export interface CopiaLocal {
  obterDados(): Dados;
  obterSinc(): EstadoSinc;
  salvarAgora(): Promise<void>;
  definirSinc(sinc: EstadoSinc): Promise<void>;
  aplicarDaNuvem(dados: Dados, sinc: EstadoSinc): Promise<void>;
  limpar(sinc: EstadoSinc): Promise<void>;
}

export type Situacao = 'parada' | 'verificando' | 'enviando' | 'salvo' | 'sem-internet' | 'erro' | 'decidir';

export interface Escolha {
  tipo: 'enviar' | 'manter' | 'conflito';
  /** Versão da nuvem; null quando a conta não tem documento. */
  remota: { dados: Dados; revisao: number } | null;
}

export type OpcaoEscolha = 'nuvem' | 'local' | 'enviar' | 'vazia';

export interface EstadoSincronizador {
  usuario: { id: string; email: string } | null;
  situacao: Situacao;
  erro: string | null;
  escolha: Escolha | null;
  /** A pessoa pode adiar a escolha; nada é enviado até ela decidir. */
  escolhaAberta: boolean;
}

const ERRO_FORMATO = 'Seus dados na nuvem vieram de uma versão mais nova do Pila. Recarregue a página para atualizar o app.';
const ERRO_GERAL = 'Não foi possível falar com a nuvem.';
const ERRO_DOCUMENTO = 'O documento da nuvem não pôde ser lido. Nada foi alterado.';

class ErroConhecido extends Error {}

/**
 * Revisão de um documento novo. Apagar e recriar o documento não pode repetir um número
 * que outro aparelho ainda conhece, senão ele acharia que está em dia.
 */
const revisaoInicial = () => Date.now();

export class Sincronizador {
  private estado: EstadoSincronizador = { usuario: null, situacao: 'parada', erro: null, escolha: null, escolhaAberta: false };
  private ouvintes = new Set<() => void>();
  private fila: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private local: CopiaLocal,
    private remoto: Remoto,
    private encerrarSessao: () => Promise<void>,
  ) {}

  obterEstado = (): EstadoSincronizador => this.estado;

  assinar = (fn: () => void): (() => void) => {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  };

  private mudar(parcial: Partial<EstadoSincronizador>) {
    this.estado = { ...this.estado, ...parcial };
    for (const fn of this.ouvintes) fn();
  }

  /** Uma operação de cada vez: consulta, envio e download nunca se cruzam. */
  private enfileirar<T>(fn: () => Promise<T>): Promise<T> {
    const r = this.fila.then(fn);
    this.fila = r.catch(() => undefined);
    return r;
  }

  private cancelarEnvio() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private falhou(e: unknown) {
    if (e instanceof ErroSemRede) this.mudar({ situacao: 'sem-internet', erro: null });
    else this.mudar({ situacao: 'erro', erro: e instanceof ErroConhecido ? e.message : ERRO_GERAL });
  }

  definirUsuario(usuario: EstadoSincronizador['usuario']): void {
    const anterior = this.estado.usuario?.id;
    if (usuario?.id === anterior) {
      if (usuario && usuario.email !== this.estado.usuario?.email) this.mudar({ usuario });
      return;
    }
    this.cancelarEnvio();
    this.mudar({ usuario, situacao: 'parada', erro: null, escolha: null, escolhaAberta: false });
    if (usuario) void this.verificar();
  }

  /** Consulta a revisão da nuvem e faz o que for preciso. Nunca lança erro. */
  verificar(): Promise<void> {
    return this.enfileirar(async () => {
      const usuarioId = this.estado.usuario?.id;
      if (!usuarioId || this.estado.escolha) return;
      if (this.estado.situacao !== 'enviando') this.mudar({ situacao: 'verificando', erro: null });
      try {
        await this.passo(usuarioId, 3);
      } catch (e) {
        this.falhou(e);
      }
    });
  }

  private decidirCom(usuarioId: string, revisaoNuvem: number | null) {
    return decidir({ usuarioId, sinc: this.local.obterSinc(), temDados: temDadosLocais(this.local.obterDados()), revisaoNuvem });
  }

  private async passo(usuarioId: string, tentativas: number): Promise<void> {
    const revisaoNuvem = await this.remoto.lerRevisao(usuarioId);
    if (this.estado.usuario?.id !== usuarioId) return;
    const acao = this.decidirCom(usuarioId, revisaoNuvem);
    const sinc = this.local.obterSinc();
    switch (acao) {
      case 'nada':
        return this.mudar({ situacao: 'salvo', erro: null });
      case 'assumir':
        if (this.local.obterDados().config.exemplo) await this.local.limpar({ ...sinc, usuarioId, revisaoBase: 0, pendente: false });
        else await this.local.definirSinc({ ...sinc, usuarioId, revisaoBase: 0, pendente: false });
        return this.mudar({ situacao: 'salvo', erro: null });
      case 'esquecer-revisao':
        await this.local.definirSinc({ ...sinc, revisaoBase: 0, sincronizadoEm: null });
        return this.mudar({ situacao: 'salvo', erro: null });
      case 'enviar':
        return this.enviar(usuarioId, tentativas);
      case 'baixar':
        return this.baixar(usuarioId, tentativas);
      case 'perguntar-enviar':
        return this.abrirEscolha('enviar', null);
      case 'perguntar-qual-manter':
        return this.abrirEscolha('manter', await this.baixarRemota(usuarioId));
      case 'conflito': {
        const remota = revisaoNuvem === null ? null : await this.baixarRemota(usuarioId);
        // Um envio que chegou ao banco, mas perdeu a resposta, não é conflito.
        if (remota && iguais(remota.bruto, this.local.obterDados())) {
          await this.local.definirSinc({ ...sinc, revisaoBase: remota.revisao, pendente: false });
          return this.mudar({ situacao: 'salvo', erro: null });
        }
        return this.abrirEscolha('conflito', remota);
      }
    }
  }

  private async baixarRemota(usuarioId: string) {
    const doc = await this.remoto.baixar(usuarioId);
    if (!doc) return null;
    if (!documentoValido(doc.dados)) throw new ErroConhecido(ERRO_DOCUMENTO);
    if (formatoMaisNovo(doc.dados)) throw new ErroConhecido(ERRO_FORMATO);
    return { dados: normalizarDados(doc.dados), bruto: doc.dados, revisao: doc.revisao, atualizadoEm: doc.atualizadoEm };
  }

  private async baixar(usuarioId: string, tentativas: number) {
    const remota = await this.baixarRemota(usuarioId);
    // A pessoa pode ter editado enquanto o download acontecia: decide de novo com o que há agora.
    const acao = this.decidirCom(usuarioId, remota?.revisao ?? null);
    if (!remota || acao !== 'baixar') {
      if (tentativas <= 0) throw new Error('sincronização não estabilizou');
      return this.passo(usuarioId, tentativas - 1);
    }
    await this.local.aplicarDaNuvem(remota.dados, {
      usuarioId,
      revisaoBase: remota.revisao,
      pendente: false,
      sincronizadoEm: remota.atualizadoEm,
    });
    this.mudar({ situacao: 'salvo', erro: null });
  }

  private abrirEscolha(tipo: Escolha['tipo'], remota: Escolha['remota']) {
    this.cancelarEnvio();
    this.mudar({ situacao: 'decidir', erro: null, escolha: { tipo, remota }, escolhaAberta: true });
  }

  private async enviar(usuarioId: string, tentativas: number): Promise<void> {
    const sinc = this.local.obterSinc();
    const dados = this.local.obterDados();
    if (!sinc.pendente || sinc.usuarioId !== usuarioId) return this.mudar({ situacao: 'salvo', erro: null });
    if (dados.config.exemplo) throw new ErroConhecido('Dados de exemplo não vão para a nuvem.');
    this.mudar({ situacao: 'enviando', erro: null });
    const gravacao =
      sinc.revisaoBase === 0
        ? await this.remoto.criar(usuarioId, dados, revisaoInicial())
        : await this.remoto.atualizar(usuarioId, dados, sinc.revisaoBase);
    if (!gravacao) {
      if (tentativas <= 0) throw new Error('sincronização não estabilizou');
      return this.passo(usuarioId, tentativas - 1);
    }
    const mudouDuranteEnvio = this.local.obterDados() !== dados;
    await this.local.definirSinc({
      usuarioId,
      revisaoBase: gravacao.revisao,
      pendente: mudouDuranteEnvio,
      sincronizadoEm: gravacao.atualizadoEm,
    });
    if (mudouDuranteEnvio) this.agendarEnvio();
    else this.mudar({ situacao: 'salvo', erro: null });
  }

  private podeEnviar(): boolean {
    const { usuario, escolha } = this.estado;
    return !!usuario && !escolha && this.local.obterSinc().usuarioId === usuario.id;
  }

  private agendarEnvio() {
    this.cancelarEnvio();
    this.timer = setTimeout(() => void this.enviarPendente(), ATRASO_ENVIO_MS);
  }

  /** Chamado a cada alteração local. A gravação local já aconteceu ou está a caminho. */
  aoAlterarDados(): void {
    if (!this.podeEnviar()) return;
    if (this.estado.situacao !== 'sem-internet') this.mudar({ situacao: 'enviando', erro: null });
    this.agendarEnvio();
  }

  /** Envia já o que estiver pendente, sem esperar o intervalo normal. */
  enviarPendente(): Promise<void> {
    this.cancelarEnvio();
    return this.enfileirar(async () => {
      if (!this.podeEnviar() || !this.local.obterSinc().pendente) return;
      try {
        await this.enviar(this.estado.usuario!.id, 3);
      } catch (e) {
        this.falhou(e);
      }
    });
  }

  ficouSemInternet(): void {
    if (this.estado.usuario && !this.estado.escolha) this.mudar({ situacao: 'sem-internet', erro: null });
  }

  adiarEscolha(): void {
    this.mudar({ escolhaAberta: false });
  }

  reabrirEscolha(): void {
    if (this.estado.escolha) this.mudar({ escolhaAberta: true });
  }

  /** Aplica o que a pessoa escolheu. O backup do que será descartado é oferecido antes, na tela. */
  resolverEscolha(opcao: OpcaoEscolha): Promise<void> {
    return this.enfileirar(async () => {
      const { usuario, escolha } = this.estado;
      if (!usuario || !escolha) return;
      const usuarioId = usuario.id;
      const { remota } = escolha;
      this.mudar({ escolha: null, escolhaAberta: false, situacao: 'verificando' });
      try {
        if (opcao === 'enviar' || opcao === 'local') {
          await this.local.definirSinc({
            usuarioId,
            revisaoBase: remota?.revisao ?? 0,
            pendente: true,
            sincronizadoEm: this.local.obterSinc().sincronizadoEm,
          });
          await this.enviar(usuarioId, 3);
        } else if (opcao === 'nuvem' && remota) {
          await this.local.aplicarDaNuvem(remota.dados, {
            usuarioId,
            revisaoBase: remota.revisao,
            pendente: false,
            sincronizadoEm: new Date().toISOString(),
          });
          this.mudar({ situacao: 'salvo' });
        } else {
          await this.local.limpar({ usuarioId, revisaoBase: 0, pendente: false, sincronizadoEm: null });
          this.mudar({ situacao: 'salvo' });
        }
      } catch (e) {
        this.falhou(e);
      }
    });
  }

  /** Apaga o documento da nuvem e depois a cópia local. Se a nuvem falhar, nada é apagado. */
  apagarTudo(): Promise<void> {
    this.cancelarEnvio();
    return this.enfileirar(async () => {
      const usuarioId = this.estado.usuario?.id;
      if (!usuarioId) return;
      await this.remoto.apagar(usuarioId);
      await this.local.limpar({ usuarioId, revisaoBase: 0, pendente: false, sincronizadoEm: null });
      this.mudar({ situacao: 'salvo', erro: null, escolha: null, escolhaAberta: false });
    });
  }

  /** Tenta enviar o que falta e diz o que fazer com a cópia local ao sair. */
  prepararSaida(): Promise<AcaoSaida> {
    this.cancelarEnvio();
    return this.enfileirar(async () => {
      const usuarioId = this.estado.usuario?.id;
      if (!usuarioId) return 'manter-local' as const;
      await this.local.salvarAgora();
      if (this.podeEnviar() && this.local.obterSinc().pendente) {
        try {
          await this.enviar(usuarioId, 3);
        } catch (e) {
          this.falhou(e);
        }
      }
      return decidirSaida(usuarioId, this.local.obterSinc());
    });
  }

  /** Apaga antes de encerrar a sessão: assim as outras abas já encontram a cópia limpa. */
  concluirSaida(apagarLocal: boolean): Promise<void> {
    this.cancelarEnvio();
    return this.enfileirar(async () => {
      this.mudar({ usuario: null, situacao: 'parada', erro: null, escolha: null, escolhaAberta: false });
      if (apagarLocal) await this.local.limpar({ usuarioId: null, revisaoBase: 0, pendente: false, sincronizadoEm: null });
      await this.encerrarSessao();
    });
  }
}
