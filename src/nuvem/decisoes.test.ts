import { describe, expect, it } from 'vitest';
import { dadosVazios } from '../storage/padrao';
import { SINC_INICIAL, type Dados, type EstadoSinc } from '../storage/tipos';
import { decidir, decidirSaida, documentoValido, formatoMaisNovo, iguais, temDadosLocais } from './decisoes';
import { nuvemDisponivel } from './disponivel';
import { mensagemErroAuth } from './erros';
import { textoSituacao } from './textos';

const EU = 'usuario-a';
const sinc = (parcial: Partial<EstadoSinc> = {}): EstadoSinc => ({ ...SINC_INICIAL, usuarioId: EU, revisaoBase: 5, ...parcial });
const decide = (s: EstadoSinc, temDados: boolean, revisaoNuvem: number | null) => decidir({ usuarioId: EU, sinc: s, temDados, revisaoNuvem });

describe('nuvem disponível', () => {
  const env = { url: 'https://x.supabase.co', chave: 'sb_publishable_x' };
  it('com as duas variáveis e fora do claude.ai', () => expect(nuvemDisponivel(env, {})).toBe(true));
  it('sem a URL ou sem a chave, nada de conta', () => {
    expect(nuvemDisponivel({ chave: env.chave }, {})).toBe(false);
    expect(nuvemDisponivel({ url: env.url }, {})).toBe(false);
    expect(nuvemDisponivel({ url: ' ', chave: env.chave }, {})).toBe(false);
  });
  it('com window.claude, nada de conta', () => expect(nuvemDisponivel(env, { claude: {} })).toBe(false));
});

describe('primeiro login neste navegador', () => {
  const anonimo = SINC_INICIAL;
  it('caso 1: nuvem vazia e navegador com dados pergunta', () => expect(decide(anonimo, true, null)).toBe('perguntar-enviar'));
  it('caso 2: nuvem vazia e navegador vazio não pergunta', () => expect(decide(anonimo, false, null)).toBe('assumir'));
  it('caso 3: dados na nuvem e navegador vazio baixa', () => expect(decide(anonimo, false, 7)).toBe('baixar'));
  it('caso 4: dados na nuvem e navegador com dados pergunta qual manter', () => expect(decide(anonimo, true, 7)).toBe('perguntar-qual-manter'));
  it('caso 4: cópia de outra conta conta como "não é desta conta"', () => {
    expect(decide(sinc({ usuarioId: 'outra' }), true, 7)).toBe('perguntar-qual-manter');
    expect(decide(sinc({ usuarioId: 'outra', pendente: true }), true, null)).toBe('perguntar-enviar');
  });
});

describe('cópia ligada a esta conta', () => {
  it('caso 3: sem nada pendente e nuvem mais nova, baixa', () => expect(decide(sinc(), true, 6)).toBe('baixar'));
  it('caso 5: nuvem igual e nada pendente, não faz nada', () => expect(decide(sinc(), true, 5)).toBe('nada'));
  it('caso 5: pendente e nuvem igual, envia', () => expect(decide(sinc({ pendente: true }), true, 5)).toBe('enviar'));
  it('caso 6: pendente e nuvem mudou é conflito', () => expect(decide(sinc({ pendente: true }), true, 6)).toBe('conflito'));
  it('revisão diferente também vale se a nuvem foi recriada com número menor', () => expect(decide(sinc(), true, 2)).toBe('baixar'));
  it('caso 2: documento ainda não existe, pendente cria', () => expect(decide(sinc({ revisaoBase: 0, pendente: true }), true, null)).toBe('enviar'));
  it('caso 2: documento ainda não existe, sem pendência espera', () => expect(decide(sinc({ revisaoBase: 0 }), false, null)).toBe('nada'));
  it('documento apagado em outro aparelho nunca some daqui sem perguntar', () => {
    expect(decide(sinc(), true, null)).toBe('conflito');
    expect(decide(sinc({ pendente: true }), false, null)).toBe('conflito');
    expect(decide(sinc(), false, null)).toBe('esquecer-revisao');
  });
});

describe('caso 8: sair', () => {
  it('sem pendência apaga a cópia local', () => expect(decidirSaida(EU, sinc())).toBe('apagar-local'));
  it('com pendência avisa', () => expect(decidirSaida(EU, sinc({ pendente: true }))).toBe('avisar-perda'));
  it('dados que nunca foram da conta ficam no navegador', () => expect(decidirSaida(EU, SINC_INICIAL)).toBe('manter-local'));
});

describe('o que conta como dados locais', () => {
  const comLancamento = (): Dados => {
    const d = dadosVazios();
    d.metas.push({} as Dados['metas'][number]);
    return d;
  };
  it('vazio não conta', () => expect(temDadosLocais(dadosVazios())).toBe(false));
  it('dados próprios contam', () => expect(temDadosLocais(comLancamento())).toBe(true));
  it('categoria editada conta, para não sumir sem perguntar', () => {
    const d = dadosVazios();
    d.categorias[0].nome = 'Minha';
    expect(temDadosLocais(d)).toBe(true);
  });
  it('caso 10: dados de exemplo não contam', () => {
    const d = comLancamento();
    d.config.exemplo = true;
    expect(temDadosLocais(d)).toBe(false);
  });
});

describe('comparação e validação do documento', () => {
  it('ignora a ordem das chaves, que o jsonb não preserva', () => {
    expect(iguais({ a: 1, b: { c: 2, d: [1, { e: 3, f: 4 }] } }, { b: { d: [1, { f: 4, e: 3 }], c: 2 }, a: 1 })).toBe(true);
  });
  it('ignora campos undefined e percebe diferença de valor ou de ordem em listas', () => {
    expect(iguais({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(iguais({ a: 1 }, { a: 2 })).toBe(false);
    expect(iguais([1, 2], [2, 1])).toBe(false);
  });
  it('recusa documento sem o formato de Dados', () => {
    expect(documentoValido(dadosVazios())).toBe(true);
    expect(documentoValido({})).toBe(false);
    expect(documentoValido(null)).toBe(false);
  });
  it('reconhece formato mais novo que o app', () => {
    expect(formatoMaisNovo(dadosVazios())).toBe(false);
    expect(formatoMaisNovo({ versao: 99 as unknown as Dados['versao'] })).toBe(true);
  });
});

describe('mensagens', () => {
  it('traduz os erros do login', () => {
    expect(mensagemErroAuth({ code: 'invalid_credentials' })).toBe('E-mail ou senha errados.');
    expect(mensagemErroAuth({ code: 'user_already_exists' })).toMatch(/já está cadastrado/);
    expect(mensagemErroAuth({ code: 'signup_disabled' })).toMatch(/cadastro.*fechado/);
    expect(mensagemErroAuth({ code: 'weak_password' })).toMatch(/Senha curta/);
    expect(mensagemErroAuth({ message: 'Failed to fetch' })).toMatch(/Sem internet/);
    expect(mensagemErroAuth({ message: 'qualquer' }, false)).toMatch(/Sem internet/);
    expect(mensagemErroAuth({ message: 'qualquer' })).toBe('Não foi possível concluir agora. Tente de novo.');
  });
  it('mostra a hora do último envio', () => {
    const agora = new Date(2026, 9, 31, 15, 0);
    expect(textoSituacao('salvo', new Date(2026, 9, 31, 14, 32).toISOString(), agora)).toBe('Tudo salvo na nuvem às 14:32');
    expect(textoSituacao('enviando', null, agora)).toBe('Enviando…');
    expect(textoSituacao('erro', null, agora)).toBe('Erro ao sincronizar');
    expect(textoSituacao('sem-internet', null, agora)).toMatch(/^Sem internet: as alterações ficam neste aparelho/);
  });
});
