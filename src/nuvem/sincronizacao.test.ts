import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dadosVazios } from '../storage/padrao';
import { SINC_INICIAL, type Dados, type EstadoSinc } from '../storage/tipos';
import { ATRASO_ENVIO_MS, ErroSemRede, Sincronizador, type CopiaLocal, type DocumentoNuvem, type Remoto } from './sincronizacao';

const EU = { id: 'a', email: 'a@pila.test' };

const comNome = (nome: string, marcar = true): Dados => {
  const d = dadosVazios();
  d.config.nome = nome;
  if (marcar) d.categorias[0].nome = 'Editada';
  return d;
};

class Local implements CopiaLocal {
  dados: Dados = dadosVazios();
  sinc: EstadoSinc = SINC_INICIAL;
  obterDados = () => this.dados;
  obterSinc = () => this.sinc;
  salvarAgora = async () => undefined;
  definirSinc = async (s: EstadoSinc) => {
    this.sinc = s;
  };
  aplicarDaNuvem = async (d: Dados, s: EstadoSinc) => {
    this.dados = d;
    this.sinc = s;
  };
  limpar = async (s: EstadoSinc) => {
    this.dados = dadosVazios();
    this.sinc = s;
  };
  /** O que a loja faz quando a pessoa altera algo. */
  editar(nome: string) {
    this.dados = comNome(nome);
    if (this.sinc.usuarioId) this.sinc = { ...this.sinc, pendente: true };
  }
}

class Nuvem implements Remoto {
  doc: DocumentoNuvem | null = null;
  fora = false;
  envios = 0;
  aoGravar: (() => void) | null = null;
  perdeResposta = false;
  private conferir() {
    if (this.fora) throw new ErroSemRede();
  }
  lerRevisao = async () => {
    this.conferir();
    return this.doc?.revisao ?? null;
  };
  baixar = async () => {
    this.conferir();
    return this.doc;
  };
  private gravar(dados: Dados, revisao: number) {
    this.envios++;
    this.doc = { dados: JSON.parse(JSON.stringify(dados)), revisao, atualizadoEm: '2026-10-31T14:32:00Z' };
    this.aoGravar?.();
    if (this.perdeResposta) throw new ErroSemRede();
    return { revisao, atualizadoEm: this.doc.atualizadoEm };
  }
  criar = async (_: string, dados: Dados, revisao: number) => {
    this.conferir();
    return this.doc ? null : this.gravar(dados, revisao);
  };
  atualizar = async (_: string, dados: Dados, revisaoBase: number) => {
    this.conferir();
    return this.doc?.revisao === revisaoBase ? this.gravar(dados, revisaoBase + 1) : null;
  };
  apagar = async () => {
    this.conferir();
    this.doc = null;
  };
  nomeGuardado = () => (this.doc?.dados as Dados | undefined)?.config.nome;
}

function montar() {
  const local = new Local();
  const nuvem = new Nuvem();
  const sair = vi.fn(async () => undefined);
  const s = new Sincronizador(local, nuvem, sair);
  return { local, nuvem, s, sair };
}

const entrar = async (s: Sincronizador) => {
  s.definirUsuario(EU);
  await s.verificar();
};

const ligado = (local: Local, parcial: Partial<EstadoSinc> = {}) => {
  local.sinc = { usuarioId: EU.id, revisaoBase: 5, pendente: false, sincronizadoEm: null, ...parcial };
};

describe('login', () => {
  it('caso 1, sim: pergunta e envia os dados do navegador', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Ana');
    await entrar(s);
    expect(s.obterEstado().escolha?.tipo).toBe('enviar');
    expect(nuvem.envios).toBe(0);
    await s.resolverEscolha('enviar');
    expect(nuvem.nomeGuardado()).toBe('Ana');
    expect(local.sinc).toMatchObject({ usuarioId: EU.id, pendente: false });
    expect(s.obterEstado().situacao).toBe('salvo');
  });

  it('caso 1, não: a conta começa vazia e nada vai para a nuvem', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Ana');
    await entrar(s);
    await s.resolverEscolha('vazia');
    expect(nuvem.doc).toBeNull();
    expect(local.dados.config.nome).toBe('');
    expect(local.sinc).toMatchObject({ usuarioId: EU.id, revisaoBase: 0, pendente: false });
  });

  it('caso 2: nuvem e navegador vazios não perguntam e o primeiro salvamento cria o documento', async () => {
    const { local, nuvem, s } = montar();
    await entrar(s);
    expect(s.obterEstado().escolha).toBeNull();
    expect(nuvem.doc).toBeNull();
    local.editar('Primeiro');
    await s.enviarPendente();
    expect(nuvem.nomeGuardado()).toBe('Primeiro');
    expect(local.sinc.revisaoBase).toBe(nuvem.doc?.revisao);
  });

  it('caso 3: navegador vazio baixa a nuvem', async () => {
    const { local, nuvem, s } = montar();
    nuvem.doc = { dados: comNome('Da nuvem'), revisao: 7, atualizadoEm: 'x' };
    await entrar(s);
    expect(local.dados.config.nome).toBe('Da nuvem');
    expect(local.sinc).toMatchObject({ usuarioId: EU.id, revisaoBase: 7, pendente: false });
  });

  it('caso 4: dados diferentes perguntam; ficar com a nuvem troca a cópia local', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Navegador');
    nuvem.doc = { dados: comNome('Nuvem'), revisao: 7, atualizadoEm: 'x' };
    await entrar(s);
    expect(s.obterEstado().escolha?.tipo).toBe('manter');
    expect(local.dados.config.nome).toBe('Navegador');
    await s.resolverEscolha('nuvem');
    expect(local.dados.config.nome).toBe('Nuvem');
  });

  it('caso 4: manter o navegador grava sobre a revisão certa', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Navegador');
    nuvem.doc = { dados: comNome('Nuvem'), revisao: 7, atualizadoEm: 'x' };
    await entrar(s);
    await s.resolverEscolha('local');
    expect(nuvem.nomeGuardado()).toBe('Navegador');
    expect(nuvem.doc?.revisao).toBe(8);
  });

  it('caso 4: dados iguais nos dois lados não perguntam nada de novo depois da escolha adiada', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Navegador');
    nuvem.doc = { dados: comNome('Nuvem'), revisao: 7, atualizadoEm: 'x' };
    await entrar(s);
    s.adiarEscolha();
    expect(s.obterEstado().escolhaAberta).toBe(false);
    local.dados = comNome('Mudou enquanto adiava');
    s.aoAlterarDados();
    await s.enviarPendente();
    expect(nuvem.envios).toBe(0);
  });
});

describe('caso 5: ao abrir, voltar para a aba ou a internet voltar', () => {
  it('nuvem mais nova e nada pendente: baixa', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Outro aparelho'), revisao: 6, atualizadoEm: 'x' };
    await entrar(s);
    expect(local.dados.config.nome).toBe('Outro aparelho');
    expect(local.sinc.revisaoBase).toBe(6);
  });

  it('pendente e nuvem igual: envia', async () => {
    const { local, nuvem, s } = montar();
    ligado(local, { pendente: true });
    local.dados = comNome('Offline');
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    expect(nuvem.nomeGuardado()).toBe('Offline');
    expect(local.sinc).toMatchObject({ revisaoBase: 6, pendente: false });
  });

  it('sem internet avisa, mantém pendente e envia quando volta', async () => {
    const { local, nuvem, s } = montar();
    ligado(local, { pendente: true });
    local.dados = comNome('Offline');
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    nuvem.fora = true;
    await entrar(s);
    expect(s.obterEstado().situacao).toBe('sem-internet');
    expect(local.sinc.pendente).toBe(true);
    nuvem.fora = false;
    await s.verificar();
    expect(nuvem.nomeGuardado()).toBe('Offline');
    expect(s.obterEstado().situacao).toBe('salvo');
  });

  it('edição durante o download não é sobrescrita', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Outro aparelho'), revisao: 6, atualizadoEm: 'x' };
    const baixar = nuvem.baixar;
    nuvem.baixar = async () => {
      local.editar('Editei agora');
      return baixar();
    };
    await entrar(s);
    expect(local.dados.config.nome).toBe('Editei agora');
    expect(s.obterEstado().escolha?.tipo).toBe('conflito');
  });
});

describe('caso 6: conflito', () => {
  const emConflito = async () => {
    const m = montar();
    ligado(m.local);
    m.nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(m.s);
    m.nuvem.doc = { dados: comNome('Outro aparelho'), revisao: 6, atualizadoEm: 'x' };
    m.local.editar('Este aparelho');
    await m.s.enviarPendente();
    return m;
  };

  it('update recusado vira escolha, sem sobrescrever nenhum lado', async () => {
    const { local, nuvem, s } = await emConflito();
    expect(s.obterEstado().escolha?.tipo).toBe('conflito');
    expect(nuvem.nomeGuardado()).toBe('Outro aparelho');
    expect(local.dados.config.nome).toBe('Este aparelho');
    expect(local.sinc.pendente).toBe(true);
  });

  it('escolher a nuvem baixa a versão dela', async () => {
    const { local, s } = await emConflito();
    await s.resolverEscolha('nuvem');
    expect(local.dados.config.nome).toBe('Outro aparelho');
    expect(local.sinc).toMatchObject({ revisaoBase: 6, pendente: false });
  });

  it('escolher este aparelho grava em cima da revisão nova', async () => {
    const { nuvem, s } = await emConflito();
    await s.resolverEscolha('local');
    expect(nuvem.nomeGuardado()).toBe('Este aparelho');
    expect(nuvem.doc?.revisao).toBe(7);
  });

  it('um terceiro aparelho durante a escolha gera conflito de novo, sem sobrescrever', async () => {
    const { nuvem, s } = await emConflito();
    nuvem.doc = { dados: comNome('Terceiro'), revisao: 9, atualizadoEm: 'x' };
    await s.resolverEscolha('local');
    expect(nuvem.nomeGuardado()).toBe('Terceiro');
    expect(s.obterEstado().escolha?.tipo).toBe('conflito');
  });

  it('nada é enviado enquanto a escolha está aberta', async () => {
    const { local, nuvem, s } = await emConflito();
    const envios = nuvem.envios;
    local.editar('Mais uma');
    s.aoAlterarDados();
    await s.enviarPendente();
    expect(nuvem.envios).toBe(envios);
  });

  it('envio que chegou ao banco mas perdeu a resposta não vira conflito falso', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Chegou');
    nuvem.perdeResposta = true;
    await s.enviarPendente();
    expect(local.sinc).toMatchObject({ revisaoBase: 5, pendente: true });
    nuvem.perdeResposta = false;
    await s.verificar();
    expect(s.obterEstado().escolha).toBeNull();
    expect(local.sinc).toMatchObject({ revisaoBase: 6, pendente: false });
  });

  it('documento apagado em outro aparelho pergunta antes de apagar aqui', async () => {
    const { local, s } = montar();
    ligado(local);
    local.dados = comNome('Ainda aqui');
    await entrar(s);
    expect(s.obterEstado().escolha).toMatchObject({ tipo: 'conflito', remota: null });
    expect(local.dados.config.nome).toBe('Ainda aqui');
  });

  it('recriar um documento apagado não repete uma revisão antiga', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    local.dados = comNome('Ainda aqui');
    await entrar(s);
    await s.resolverEscolha('local');
    expect(nuvem.doc?.revisao).toBeGreaterThan(5);
  });
});

describe('segurança do documento', () => {
  it('formato mais novo não é aplicado nem sobrescrito', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    local.dados = comNome('Local');
    nuvem.doc = { dados: { ...comNome('Novo'), versao: 99 }, revisao: 6, atualizadoEm: 'x' };
    await entrar(s);
    expect(local.dados.config.nome).toBe('Local');
    expect(s.obterEstado().situacao).toBe('erro');
    expect(nuvem.envios).toBe(0);
  });

  it('documento sem o formato de Dados não é aplicado', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    local.dados = comNome('Local');
    nuvem.doc = { dados: { qualquer: 1 }, revisao: 6, atualizadoEm: 'x' };
    await entrar(s);
    expect(local.dados.config.nome).toBe('Local');
    expect(s.obterEstado().situacao).toBe('erro');
  });
});

describe('caso 7: salvamento', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('agrupa as alterações e envia 2 segundos depois da última', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Um');
    s.aoAlterarDados();
    await vi.advanceTimersByTimeAsync(ATRASO_ENVIO_MS - 100);
    local.editar('Dois');
    s.aoAlterarDados();
    await vi.advanceTimersByTimeAsync(ATRASO_ENVIO_MS - 100);
    expect(nuvem.envios).toBe(0);
    expect(s.obterEstado().situacao).toBe('enviando');
    await vi.advanceTimersByTimeAsync(100);
    expect(nuvem.envios).toBe(1);
    expect(nuvem.nomeGuardado()).toBe('Dois');
  });

  it('esconder a aba envia na hora', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Saindo');
    s.aoAlterarDados();
    await s.enviarPendente();
    expect(nuvem.nomeGuardado()).toBe('Saindo');
    await vi.advanceTimersByTimeAsync(ATRASO_ENVIO_MS * 2);
    expect(nuvem.envios).toBe(1);
  });

  it('alteração feita durante o envio continua pendente e sai depois', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Primeira');
    nuvem.aoGravar = () => {
      nuvem.aoGravar = null;
      local.editar('Durante o envio');
    };
    await s.enviarPendente();
    expect(local.sinc.pendente).toBe(true);
    await vi.advanceTimersByTimeAsync(ATRASO_ENVIO_MS);
    expect(nuvem.nomeGuardado()).toBe('Durante o envio');
    expect(local.sinc.pendente).toBe(false);
  });
});

describe('caso 8: sair', () => {
  it('envia o que falta e apaga a cópia local', async () => {
    const { local, nuvem, s, sair } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Última');
    expect(await s.prepararSaida()).toBe('apagar-local');
    await s.concluirSaida(true);
    expect(nuvem.nomeGuardado()).toBe('Última');
    expect(local.dados.config.nome).toBe('');
    expect(local.sinc).toEqual(SINC_INICIAL);
    expect(sair).toHaveBeenCalledOnce();
  });

  it('sem conseguir enviar, avisa e não apaga sozinho', async () => {
    const { local, nuvem, s, sair } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Vai se perder');
    nuvem.fora = true;
    expect(await s.prepararSaida()).toBe('avisar-perda');
    expect(local.dados.config.nome).toBe('Vai se perder');
    expect(sair).not.toHaveBeenCalled();
  });

  it('com a escolha adiada, os dados do navegador ficam: eles não estão na nuvem', async () => {
    const { local, s } = montar();
    local.dados = comNome('Só aqui');
    await entrar(s);
    s.adiarEscolha();
    expect(await s.prepararSaida()).toBe('manter-local');
    await s.concluirSaida(false);
    expect(local.dados.config.nome).toBe('Só aqui');
  });
});

describe('caso 9: apagar todos os dados', () => {
  it('apaga a nuvem e a cópia local, e a cópia continua ligada à conta', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    local.dados = comNome('Tudo');
    nuvem.doc = { dados: comNome('Tudo'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    await s.apagarTudo();
    expect(nuvem.doc).toBeNull();
    expect(local.dados.config.nome).toBe('');
    expect(local.sinc).toMatchObject({ usuarioId: EU.id, revisaoBase: 0, pendente: false });
  });

  it('se a nuvem falhar, nada é apagado', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    local.dados = comNome('Tudo');
    nuvem.doc = { dados: comNome('Tudo'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    nuvem.fora = true;
    await expect(s.apagarTudo()).rejects.toBeInstanceOf(ErroSemRede);
    expect(local.dados.config.nome).toBe('Tudo');
  });
});

describe('caso 10: dados de exemplo', () => {
  it('no login, exemplos não são oferecidos para envio e somem da cópia', async () => {
    const { local, nuvem, s } = montar();
    local.dados = comNome('Exemplo');
    local.dados.config.exemplo = true;
    await entrar(s);
    expect(s.obterEstado().escolha).toBeNull();
    expect(local.dados.config.exemplo).toBe(false);
    expect(nuvem.envios).toBe(0);
  });

  it('dados de exemplo nunca são enviados', async () => {
    const { local, nuvem, s } = montar();
    ligado(local, { revisaoBase: 0, pendente: true });
    local.dados = comNome('Exemplo');
    local.dados.config.exemplo = true;
    await entrar(s);
    expect(nuvem.envios).toBe(0);
    expect(s.obterEstado().situacao).toBe('erro');
  });
});

describe('caso 11: importar backup com login', () => {
  it('a substituição vira uma alteração pendente e vai para a nuvem', async () => {
    const { local, nuvem, s } = montar();
    ligado(local);
    nuvem.doc = { dados: comNome('Antes'), revisao: 5, atualizadoEm: 'x' };
    await entrar(s);
    local.editar('Do backup');
    s.aoAlterarDados();
    await s.enviarPendente();
    expect(nuvem.nomeGuardado()).toBe('Do backup');
  });
});
