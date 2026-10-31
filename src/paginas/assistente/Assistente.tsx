import { useEffect, useRef, useState } from 'react';
import { atualizar, loja, useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { ESQUEMA_PROPOSTA, INSTRUCOES, obterSample, resumoParaAssistente, type Proposta, type SampleFn, type SampleTool } from '../../estado/assistente';
import { adicionarDespesaFixa, adicionarDespesaVariavel, adicionarReceita } from '../../estado/acoesOrcamento';
import { dataValida, formatarData, hojeISO } from '../../engine/datas';
import { formatarValor, normalizar } from '../../engine/formato';
import { Pagina } from '../../layout/Pagina';
import { novoId } from '../../storage/padrao';
import { AreaTexto, Botao, BotaoIcone, EstadoVazio, cx, useOculto } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Logo } from '../../ui/Logo';
import { TextoRico } from '../../ui/TextoRico';

const SUGESTOES = [
  'Quanto gastei este mês e com o quê?',
  'Onde dá para economizar?',
  'Como está minha reserva de emergência?',
  'Registre R$ 52,90 de mercado hoje',
];

const ERROS: Record<string, string> = {
  rate_limited: 'Muitas perguntas seguidas. Espere um pouco e tente de novo.',
  session_expired: 'Sua sessão no claude.ai expirou. Entre de novo e tente outra vez.',
  refused: 'O Claude não respondeu a essa pergunta. Tente perguntar de outro jeito.',
  prompt_too_large: 'A conversa ficou longa demais. Limpe a conversa e pergunte de novo.',
  empty_completion: 'Veio uma resposta vazia. Tente perguntar de outro jeito.',
};
const SEM_PERMISSAO = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

type Estado = 'conectando' | 'pronto' | 'indisponivel' | 'sem-permissao';

function criarLancamentoDaProposta(p: Proposta): string {
  const d = loja.obterDados();
  const alvo = normalizar(p.categoria);
  const doTipo = d.categorias.filter((c) => c.natureza === p.natureza && !c.arquivada);
  const cat =
    doTipo.find((c) => normalizar(c.nome) === alvo) ??
    doTipo.find((c) => alvo && (normalizar(c.nome).includes(alvo) || alvo.includes(normalizar(c.nome)))) ??
    doTipo.find((c) => normalizar(c.nome) === 'outros') ??
    doTipo[0];
  if (!cat) throw new Error('Sem categorias');
  if (p.natureza === 'receita') {
    adicionarReceita({ descricao: p.descricao, valor: p.valor, data: p.data, categoriaId: cat.id, modo: p.recorrente ? 'recorrente' : 'avulsa' });
  } else if (p.recorrente) {
    adicionarDespesaFixa({ descricao: p.descricao, valor: p.valor, vencimento: p.data, categoriaId: cat.id });
  } else {
    adicionarDespesaVariavel({ descricao: p.descricao, valor: p.valor, data: p.data, categoriaId: cat.id, parcelas: p.parcelas });
  }
  return cat.nome;
}

function CartaoProposta({ p, aoDecidir }: { p: Proposta; aoDecidir: (estado: 'confirmada' | 'descartada') => void }) {
  const { avisar } = useUI();
  const tipo = p.natureza === 'receita' ? (p.recorrente ? 'Receita mensal' : 'Receita') : p.recorrente ? 'Despesa fixa' : p.parcelas > 1 ? `Compra em ${p.parcelas}x` : 'Despesa variável';
  return (
    <div className="ml-11 max-w-[460px] rounded-2xl border border-marca bg-marca-suave p-4">
      <p className="rotulo-secao mb-1 flex items-center gap-1.5 text-marca">
        <Icone nome="sparkle" tamanho={13} /> Sugestão de lançamento
      </p>
      <p className="text-[15px] font-semibold">{p.descricao}</p>
      <p className="f-valor text-[20px]">{formatarValor(p.valor)}</p>
      <p className="text-[13px] text-suave">
        {tipo} · {formatarData(p.data)} · {p.categoria || 'categoria a definir'}
      </p>
      {p.estado === 'pendente' ? (
        <div className="mt-3 flex gap-2">
          <Botao
            tamanho="sm"
            variante="primario"
            icone="check"
            onClick={() => {
              try {
                const nome = criarLancamentoDaProposta(p);
                aoDecidir('confirmada');
                avisar(`Lançado no Orçamento em “${nome}”.`);
              } catch {
                avisar('Não foi possível lançar. Tente pelo Orçamento.', 'erro');
              }
            }}
          >
            Confirmar
          </Botao>
          <Botao tamanho="sm" variante="secundario" onClick={() => aoDecidir('descartada')}>
            Descartar
          </Botao>
        </div>
      ) : (
        <p className={cx('mt-2 text-[13px] font-semibold', p.estado === 'confirmada' ? 'text-receita' : 'text-suave')}>
          {p.estado === 'confirmada' ? 'Lançado no Orçamento.' : 'Descartado.'}
        </p>
      )}
    </div>
  );
}

export function Assistente() {
  const dados = useDados();
  const oculto = useOculto();
  const { navegar } = useUI();
  const [estado, setEstado] = useState<Estado>('conectando');
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState(false);
  const [parcial, setParcial] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [propostas, setPropostas] = useState<(Proposta & { aposMensagem: string })[]>([]);
  const sampleRef = useRef<SampleFn | null>(null);
  const ferramentasRef = useRef(false);
  const controle = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    void obterSample().then(async (s) => {
      if (!vivo) return;
      sampleRef.current = s;
      if (s) {
        try {
          ferramentasRef.current = !!(await s.limits()).tools;
        } catch {
          ferramentasRef.current = false;
        }
      }
      setEstado(s ? 'pronto' : 'indisponivel');
    });
    return () => {
      vivo = false;
      controle.current?.abort();
    };
  }, []);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [dados.conversa.length, parcial, propostas.length]);

  async function enviar(pergunta: string) {
    const sample = sampleRef.current;
    const q = pergunta.trim();
    if (!sample || !q || respondendo) return;
    setErro(null);
    setTexto('');
    const idPergunta = novoId();
    atualizar((d) => {
      d.conversa.push({ id: idPergunta, papel: 'user', texto: q, em: new Date().toISOString() });
      if (d.conversa.length > 40) d.conversa.splice(0, d.conversa.length - 40);
    });
    const historico = loja
      .obterDados()
      .conversa.slice(-13, -1)
      .map((m) => ({ role: m.papel, content: m.texto }));
    const entrada = [
      { role: 'user' as const, content: `${INSTRUCOES}\n\nDADOS DO PILA\n${resumoParaAssistente(loja.obterDados(), hojeISO())}` },
      ...historico,
      { role: 'user' as const, content: q },
    ];
    const ctl = new AbortController();
    controle.current = ctl;
    setRespondendo(true);
    setParcial('');

    const ferramenta: SampleTool = {
      name: 'proporLancamento',
      description:
        'Cria uma sugestão de lançamento no Orçamento do Pila para a pessoa confirmar ou descartar. Não registra nada sozinha. Retorna o status da sugestão.',
      inputSchema: ESQUEMA_PROPOSTA,
      execute: (input) => {
        const valor = Math.round(Number(input.valor) * 100);
        if (!Number.isFinite(valor) || valor <= 0) throw new Error('valor precisa ser maior que zero');
        const data = typeof input.data === 'string' && dataValida(input.data) ? input.data : hojeISO();
        const p: Proposta & { aposMensagem: string } = {
          id: novoId(),
          natureza: input.natureza === 'receita' ? 'receita' : 'despesa',
          descricao: String(input.descricao ?? '').trim().slice(0, 80) || 'Lançamento',
          valor,
          data,
          categoria: String(input.categoria ?? '').slice(0, 40),
          parcelas: Math.max(1, Math.min(120, Math.floor(Number(input.parcelas) || 1))),
          recorrente: input.recorrente === true,
          estado: 'pendente',
          aposMensagem: idPergunta,
        };
        setPropostas((x) => [...x, p]);
        return { status: 'sugestão criada; aguardando a confirmação da pessoa na tela' };
      },
    };

    try {
      const r = await sample(entrada, {
        signal: ctl.signal,
        cache: false,
        modelTier: 'default',
        onText: ({ text }) => setParcial(text),
        ...(ferramentasRef.current ? { tools: [ferramenta] } : {}),
      });
      const resposta = r.truncated ? `${r.text}\n\n(A resposta foi cortada. Peça a continuação.)` : r.text;
      atualizar((d) => {
        d.conversa.push({ id: novoId(), papel: 'assistant', texto: resposta, em: new Date().toISOString() });
      });
    } catch (e) {
      const err = e as { code?: string; text?: string };
      if (err.text) {
        const parcialTexto = err.text;
        atualizar((d) => {
          d.conversa.push({ id: novoId(), papel: 'assistant', texto: `${parcialTexto}\n\n(Resposta interrompida.)`, em: new Date().toISOString() });
        });
      }
      if (err.code && SEM_PERMISSAO.includes(err.code)) setEstado('sem-permissao');
      else if (err.code === 'tools_unavailable') {
        // Esta tela não roda ferramentas: a próxima pergunta vai sem a sugestão de lançamentos.
        ferramentasRef.current = false;
        setErro('Aqui o Assistente não consegue sugerir lançamentos. Envie a pergunta de novo para receber só a resposta.');
      } else if (err.code !== 'cancelled') setErro(ERROS[err.code ?? ''] ?? 'A resposta foi interrompida. Tente de novo.');
    } finally {
      setRespondendo(false);
      setParcial(null);
      controle.current = null;
    }
  }

  const conversa = dados.conversa;

  if (estado === 'indisponivel' || estado === 'sem-permissao') {
    return (
      <Pagina titulo="Assistente" estreita>
        <div className="cartao">
          <EstadoVazio
            icone="chat-teardrop-dots"
            titulo={estado === 'indisponivel' ? 'O Assistente chega em breve aqui' : 'O Assistente está sem permissão'}
            texto={
              estado === 'indisponivel'
                ? 'Ele funciona quando o Pila está aberto no claude.ai, usando a sua conta: responde perguntas sobre os seus números e sugere lançamentos para você confirmar. Neste endereço ele ainda não está disponível.'
                : 'Você (ou a sua organização) não autorizou este app a usar o Claude. Dá para mudar isso no menu de permissões do artefato no claude.ai e abrir esta tela de novo.'
            }
            acoes={<Botao onClick={() => navegar('suporte')}>Ver perguntas frequentes</Botao>}
          />
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina
      titulo="Assistente"
      estreita
      acoes={
        conversa.length > 0 ? (
          <Botao
            tamanho="sm"
            variante="fantasma"
            icone="broom"
            disabled={respondendo}
            onClick={() => {
              atualizar((d) => {
                d.conversa = [];
              });
              setPropostas([]);
              setErro(null);
            }}
          >
            Limpar conversa
          </Botao>
        ) : undefined
      }
    >
      <div className="flex min-h-[60dvh] flex-col">
        <div className="flex flex-1 flex-col gap-4 pb-4">
          {conversa.length === 0 && !respondendo ? (
            <div className="cartao flex flex-col items-center gap-4 px-5 py-10 text-center">
              <Logo tamanho={40} comNome={false} />
              <div>
                <p className="f-titulo text-[19px]">Pergunte sobre o seu dinheiro</p>
                <p className="mx-auto mt-1 max-w-[46ch] text-[14px] text-suave">
                  O assistente lê os números do Pila e responde em segundos. Também pode sugerir lançamentos, que só entram quando você confirma.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={estado !== 'pronto'}
                    onClick={() => void enviar(s)}
                    className="rounded-full border border-borda bg-surface px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-marca hover:bg-marca-suave disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {estado === 'conectando' && <p className="text-[12.5px] text-suave">Conectando ao Claude…</p>}
            </div>
          ) : (
            conversa.map((m, idx) => {
              // sugestões aparecem depois da resposta à pergunta que as gerou
              const donoDasPropostas =
                m.papel === 'assistant' ? (conversa[idx - 1]?.papel === 'user' ? conversa[idx - 1].id : null) : conversa[idx + 1]?.papel === 'assistant' ? null : m.id;
              return (
              <div key={m.id} className="flex flex-col gap-3">
                {m.papel === 'user' ? (
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-marca px-4 py-2.5 text-[14.5px] leading-[21px] text-sobre-marca">
                    {m.texto}
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">
                      <Logo tamanho={30} comNome={false} />
                    </span>
                    <div
                      className={cx(
                        'min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-borda bg-surface px-4 py-3 text-[14.5px] leading-[22px]',
                        oculto && 'select-none blur-[5px]',
                      )}
                    >
                      <TextoRico texto={m.texto} className="texto-aula texto-chat" />
                    </div>
                  </div>
                )}
                {propostas
                  .filter((p) => donoDasPropostas !== null && p.aposMensagem === donoDasPropostas)
                  .map((p) => (
                    <CartaoProposta
                      key={p.id}
                      p={p}
                      aoDecidir={(estadoNovo) => setPropostas((x) => x.map((y) => (y.id === p.id ? { ...y, estado: estadoNovo } : y)))}
                    />
                  ))}
              </div>
              );
            })
          )}
          {respondendo && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                <Logo tamanho={30} comNome={false} />
              </span>
              <div className={cx('min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-borda bg-surface px-4 py-3 text-[14.5px] leading-[22px]', oculto && 'blur-[5px]')}>
                {parcial ? <TextoRico texto={parcial} className="texto-aula texto-chat" /> : <span className="text-suave">Pensando…</span>}
              </div>
            </div>
          )}
          {erro && (
            <p className="flex items-center gap-2 rounded-xl bg-despesa-suave px-3.5 py-2.5 text-[13.5px]" role="alert">
              <Icone nome="warning-circle" tamanho={16} className="text-despesa" /> {erro}
            </p>
          )}
          {oculto && conversa.length > 0 && <p className="text-center text-[12.5px] text-suave">Valores ocultos: as respostas ficam borradas.</p>}
          <div ref={fim} />
        </div>

        <form
          className="sticky z-20 rounded-[22px] border border-borda bg-surface p-2 lg:bottom-6"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', boxShadow: 'var(--shadow)' }}
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <div className="flex items-end gap-2">
            <AreaTexto
              aria-label="Sua pergunta"
              rows={1}
              value={texto}
              maxLength={600}
              disabled={estado !== 'pronto'}
              placeholder={estado === 'pronto' ? 'Escreva uma pergunta ou peça um lançamento…' : 'Conectando…'}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto);
                }
              }}
              className="max-h-40 min-h-[46px] resize-none border-0 bg-transparent focus:shadow-none"
            />
            {respondendo ? (
              <BotaoIcone icone="stop" rotulo="Parar resposta" variante="superficie" tamanho={46} onClick={() => controle.current?.abort()} />
            ) : (
              <BotaoIcone icone="paper-plane-right" rotulo="Enviar" variante="primario" tamanho={46} type="submit" disabled={!texto.trim() || estado !== 'pronto'} />
            )}
          </div>
          <p className="px-2 pb-1 pt-1.5 text-[11.5px] leading-[16px] text-suave">
            A pergunta e um resumo dos seus números vão para o Claude, com a sua conta. As respostas podem errar: confira antes de decidir.
          </p>
        </form>
      </div>
    </Pagina>
  );
}
