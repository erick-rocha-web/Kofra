import { useMemo, useState, type ReactNode } from 'react';
import { atualizar, loja, useDados } from '../estado/loja';
import { useUI } from '../estado/ui';
import { NAV } from '../layout/navegacao';
import { Pagina } from '../layout/Pagina';
import { gerarExemplo } from '../storage/exemplo';
import { temDadosProprios } from '../storage/padrao';
import type { CardInicio, Dados } from '../storage/tipos';
import { resumoMes } from '../engine/orcamento';
import { resumoPatrimonio } from '../engine/patrimonio';
import { resumoInvestimentos } from '../engine/investimentos';
import { metaReserva, percentualReserva, valorReserva, valorReservaNoFimDoMes } from '../engine/reserva';
import { faltaMeta, guardadoMeta, progressoMeta } from '../engine/metas';
import { percentualDoOrcamento } from '../engine/inicio';
import { hojeISO, mesAtual, nomeMes, type Mes } from '../engine/datas';
import { formatarPct, formatarValor, OCULTO } from '../engine/formato';
import type { Centavos } from '../engine/dinheiro';
import { BarraProgresso, Botao, BotaoIcone, Medalhao, Valor, ValorGrande, cx, useOculto } from '../ui/base';
import { Icone } from '../ui/Icone';
import { Confirmacao, Modal } from '../ui/Modal';

function Ondas() {
  return (
    <svg
      width="560"
      height="216"
      viewBox="0 0 560 216"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 right-0 max-w-full"
      preserveAspectRatio="xMaxYMax meet"
    >
      <path d="M0 150C70 122 140 122 210 150S350 178 420 150S560 122 560 122" stroke="var(--brand)" strokeOpacity="0.3" strokeWidth="2" fill="none" />
      <path d="M0 172C70 144 140 144 210 172S350 200 420 172S560 144 560 144" stroke="var(--brand)" strokeOpacity="0.2" strokeWidth="2" fill="none" />
      <path d="M0 194C70 166 140 166 210 194S350 222 420 194S560 166 560 166" stroke="var(--brand)" strokeOpacity="0.12" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function Atalhos() {
  const { navegar } = useUI();
  return (
    <section aria-labelledby="atalhos-titulo" className="flex flex-col gap-3.5">
      <h2 id="atalhos-titulo" className="f-titulo text-[17px] leading-[22px]">
        Atalhos
      </h2>
      <div className="cartao grid grid-cols-1 gap-1 p-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {NAV.slice(1).map((n) => (
          <a
            key={n.rota}
            href={`#${n.rota}`}
            onClick={(e) => {
              e.preventDefault();
              navegar(n.rota);
            }}
            className="flex h-14 items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition-colors hover:bg-surface2"
          >
            <Medalhao icone={n.icone} />
            <span className="min-w-0 flex-1 truncate">{n.rotulo}</span>
            <Icone nome="caret-right" tamanho={13} className="text-suave" />
          </a>
        ))}
      </div>
    </section>
  );
}

interface OpcaoCard {
  chave: string;
  card: CardInicio;
  rotulo: string;
  icone: string;
  valor: Centavos;
  cor?: string;
  /** Linha de apoio abaixo do valor. */
  apoio: ReactNode;
  barra?: { pct: number; cor: string; texto: ReactNode };
}

function chaveDoCard(c: CardInicio): string {
  return c.tipo === 'meta' ? `meta:${c.metaId}` : c.tipo;
}

function montarOpcoes(d: Dados, mes: Mes): { indicadores: OpcaoCard[]; metas: OpcaoCard[] } {
  const orc = resumoMes(d, mes);
  const pat = resumoPatrimonio(d, mes);
  const inv = resumoInvestimentos(d, mes);
  const hoje = hojeISO();
  const reservaValor = mes === mesAtual() ? valorReserva(d, hoje) : valorReservaNoFimDoMes(d, mes);
  const meta = metaReserva(d.reserva.config);
  const pctRes = percentualReserva(reservaValor, meta);
  const pctOrc = percentualDoOrcamento(orc.despesas, orc.receita, orc.investir);
  const livre = orc.receita - orc.investir;

  const indicadores: OpcaoCard[] = [
    {
      chave: 'patrimonio',
      card: { tipo: 'patrimonio' },
      rotulo: 'Patrimônio total',
      icone: 'scales',
      valor: pat.total,
      apoio: `Posição em ${nomeMes(mes)}`,
    },
    {
      chave: 'investimentos',
      card: { tipo: 'investimentos' },
      rotulo: 'Investimentos',
      icone: 'trend-up',
      valor: inv.atual,
      apoio: inv.atual
        ? `Rendimento de ${formatarValor(inv.rendimento, { sinal: true })}${inv.rendimentoPct !== null ? ` (${formatarPct(inv.rendimentoPct, 1, true)})` : ''}`
        : 'Nenhum investimento cadastrado neste mês',
    },
    {
      chave: 'despesas',
      card: { tipo: 'despesas' },
      rotulo: 'Despesas do mês',
      icone: 'receipt',
      valor: orc.despesas,
      cor: 'var(--neg)',
      apoio: `${nomeMes(mes)}`,
      barra:
        pctOrc === null
          ? { pct: orc.despesas ? 100 : 0, cor: 'var(--neg)', texto: orc.despesas ? 'Sem orçamento livre neste mês (receita − investir)' : 'Nenhuma despesa ainda' }
          : {
              pct: Math.min(100, pctOrc),
              cor: pctOrc > 100 ? 'var(--neg)' : pctOrc >= 85 ? 'var(--warn)' : 'var(--brand)',
              texto: (
                <>
                  {formatarPct(pctOrc)} do orçamento do mês (<Valor c={livre} /> depois de investir)
                </>
              ),
            },
    },
    {
      chave: 'saldo',
      card: { tipo: 'saldo' },
      rotulo: 'Saldo do mês',
      icone: 'wallet',
      valor: orc.saldo,
      cor: orc.saldo < 0 ? 'var(--neg)' : undefined,
      apoio: 'Receita − despesas − investir',
    },
    {
      chave: 'reserva',
      card: { tipo: 'reserva' },
      rotulo: 'Reserva de emergência',
      icone: 'umbrella',
      valor: reservaValor,
      apoio: meta ? null : 'Defina a meta na tela da reserva',
      barra: meta
        ? {
            pct: Math.min(100, pctRes ?? 0),
            cor: reservaValor >= meta ? 'var(--pos)' : 'var(--brand)',
            texto: (
              <>
                {formatarPct(pctRes ?? 0)} da meta de <Valor c={meta} />
              </>
            ),
          }
        : undefined,
    },
    {
      chave: 'bens',
      card: { tipo: 'bens' },
      rotulo: 'Bens',
      icone: 'house-line',
      valor: pat.bens,
      apoio: `Bens registrados em ${nomeMes(mes)}`,
    },
  ];

  const metas: OpcaoCard[] = d.metas.map((m) => {
    const g = guardadoMeta(d, m, mes);
    const falta = faltaMeta(m.total, g);
    return {
      chave: `meta:${m.id}`,
      card: { tipo: 'meta', metaId: m.id },
      rotulo: `${m.emoji} ${m.nome}`,
      icone: 'flag-banner',
      valor: g,
      apoio: null,
      barra: {
        pct: progressoMeta(m.total, g),
        cor: falta === 0 ? 'var(--pos)' : 'var(--brand)',
        texto:
          falta === 0 ? (
            'Meta alcançada'
          ) : (
            <>
              {formatarPct(progressoMeta(m.total, g))} de <Valor c={m.total} /> · faltam <Valor c={falta} />
            </>
          ),
      },
    };
  });

  return { indicadores, metas };
}

function ModalPersonalizar({
  aberto,
  aoFechar,
  opcoes,
  atual,
}: {
  aberto: boolean;
  aoFechar: () => void;
  opcoes: { indicadores: OpcaoCard[]; metas: OpcaoCard[] };
  atual: string;
}) {
  const oculto = useOculto();
  const { avisar } = useUI();
  const [escolha, setEscolha] = useState(atual);
  const linha = (o: OpcaoCard) => {
    const ativo = o.chave === escolha;
    return (
      <li key={o.chave}>
        <button
          type="button"
          role="radio"
          aria-checked={ativo}
          onClick={() => setEscolha(o.chave)}
          className={cx(
            'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
            ativo ? 'border-marca bg-marca-suave' : 'border-borda hover:bg-surface2',
          )}
        >
          <Medalhao icone={o.icone} tamanho={34} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{o.rotulo}</span>
            <span className="f-num block text-[12.5px] text-suave">{oculto ? `R$ ${OCULTO}` : formatarValor(o.valor)}</span>
          </span>
          <span
            aria-hidden
            className={cx('inline-flex h-5 w-5 items-center justify-center rounded-full border-2', ativo ? 'border-marca bg-marca text-sobre-marca' : 'border-borda')}
          >
            {ativo && <Icone nome="check" tamanho={11} />}
          </span>
        </button>
      </li>
    );
  };
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Escolher o destaque do Início"
      subtitulo="O número que aparece grande quando você abre o Pila."
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              const todas = [...opcoes.indicadores, ...opcoes.metas];
              const o = todas.find((x) => x.chave === escolha);
              if (o)
                atualizar((d) => {
                  d.config.cardInicio = o.card;
                });
              avisar('Destaque atualizado.');
              aoFechar();
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4" role="radiogroup" aria-label="Destaque do Início">
        <div>
          <p className="rotulo-secao mb-2">Indicadores</p>
          <ul className="flex flex-col gap-1.5">{opcoes.indicadores.map(linha)}</ul>
        </div>
        <div>
          <p className="rotulo-secao mb-2">Metas</p>
          {opcoes.metas.length ? (
            <ul className="flex flex-col gap-1.5">{opcoes.metas.map(linha)}</ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-borda px-3 py-3 text-[13px] text-suave">Crie uma meta para poder destacá-la aqui.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Inicio() {
  const dados = useDados();
  const { mes, navegar, avisar } = useUI();
  const [exemplo, setExemplo] = useState(false);
  const [personalizar, setPersonalizar] = useState(false);
  const vazio = !temDadosProprios(dados);
  const opcoes = useMemo(() => montarOpcoes(dados, mes), [dados, mes]);
  const todas = [...opcoes.indicadores, ...opcoes.metas];
  const chave = chaveDoCard(dados.config.cardInicio);
  const card = todas.find((o) => o.chave === chave) ?? opcoes.indicadores[0];

  return (
    <Pagina titulo="Início" usaMes>
      <div className="flex flex-col gap-7">
        <section
          aria-label={card.rotulo}
          className="cartao relative flex min-h-[216px] flex-col justify-between gap-5 overflow-hidden p-6 sm:px-8 sm:py-7"
        >
          <Ondas />
          <div className="relative flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-medium text-suave">
              {dados.config.nome ? `Olá, ${dados.config.nome.trim().split(' ')[0]} · ` : ''}
              {card.rotulo}
            </span>
            <BotaoIcone icone="pencil-simple" rotulo="Escolher o destaque" redondo tamanho={42} tamanhoIcone={17} onClick={() => setPersonalizar(true)} />
          </div>
          <div className="relative">
            <ValorGrande c={card.valor} tamanho="clamp(36px, 8.5vw, 56px)" cor={card.cor} />
          </div>
          <div className="relative flex max-w-[560px] flex-col gap-2">
            {card.barra && (
              <>
                <BarraProgresso valor={card.barra.pct} cor={card.barra.cor} rotulo={card.rotulo} />
                <span className="text-[13.5px] leading-[20px] text-suave">{card.barra.texto}</span>
              </>
            )}
            {card.apoio && <span className="text-[14px] leading-[20px] text-suave">{card.apoio}</span>}
          </div>
        </section>

        {vazio && (
          <section aria-labelledby="primeiros-passos" className="cartao flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <h2 id="primeiros-passos" className="f-titulo text-[17px]">
                Primeiros passos
              </h2>
              <p className="mt-1 text-[13.5px] text-suave">Três cadastros e o Pila já mostra o seu mês inteiro.</p>
            </div>
            <ol className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                { rota: 'orcamento' as const, icone: 'wallet', titulo: 'Orçamento', texto: 'O que entra e o que sai no mês.' },
                { rota: 'patrimonio' as const, icone: 'scales', titulo: 'Patrimônio', texto: 'Contas, bens e dívidas de hoje.' },
                { rota: 'reserva' as const, icone: 'umbrella', titulo: 'Reserva', texto: 'Quanto guardar para imprevistos.' },
              ].map((p, i) => (
                <li key={p.rota}>
                  <button
                    type="button"
                    onClick={() => navegar(p.rota)}
                    className="flex h-full w-full items-start gap-3 rounded-2xl border border-borda p-3.5 text-left transition-colors hover:bg-surface2"
                  >
                    <Medalhao icone={p.icone} />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold">
                        {i + 1}. {p.titulo}
                      </span>
                      <span className="block text-[12.5px] text-suave">{p.texto}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div>
              <Botao icone="sparkle" onClick={() => setExemplo(true)}>
                Ver com dados de exemplo
              </Botao>
            </div>
          </section>
        )}

        <Atalhos />
      </div>

      <ModalPersonalizar key={personalizar ? chave : 'fechado'} aberto={personalizar} aoFechar={() => setPersonalizar(false)} opcoes={opcoes} atual={card.chave} />
      <Confirmacao
        aberto={exemplo}
        aoFechar={() => setExemplo(false)}
        titulo="Carregar dados de exemplo?"
        rotuloConfirmar="Carregar exemplo"
        texto="O Pila vai mostrar números fictícios em todas as telas, com uma faixa avisando. Quando quiser começar de verdade, é só apagar os exemplos."
        aoConfirmar={() => {
          const ex = gerarExemplo();
          const c = loja.obterDados().config;
          ex.config = { ...ex.config, tema: c.tema, nome: c.nome, ocultarValores: c.ocultarValores };
          loja.substituir(ex);
          avisar('Exemplo carregado.');
        }}
      />
    </Pagina>
  );
}
