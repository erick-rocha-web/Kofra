import { useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { avulsosDoMes, limparMes } from '../../estado/acoesOrcamento';
import { ABA_DO_TIPO, itensDaAba, itensDoMes, porCategoria, resumoDosItens, ajusteInvestirNoMes, type AbaOrcamento, type ItemMes } from '../../engine/orcamento';
import { formatarData, hojeISO, nomeMes } from '../../engine/datas';
import { formatarPct, normalizar } from '../../engine/formato';
import { porcentagem } from '../../engine/dinheiro';
import { Pagina } from '../../layout/Pagina';
import type { Categoria } from '../../storage/tipos';
import { Botao, BotaoIcone, EstadoVazio, Segmentado, Selo, Valor, cx } from '../../ui/base';
import { IconeCategoria } from '../../ui/categoria';
import { corVar } from '../../ui/cores';
import { Icone } from '../../ui/Icone';
import { Confirmacao } from '../../ui/Modal';
import { LegendaRosca, Rosca, agruparFatias } from '../../ui/graficos/Rosca';
import { DialogoInvestir } from './DialogoInvestir';
import { ModalCopiar, ModalFiltro, ModalPrevista, type Filtro } from './Ferramentas';
import { FormLancamento, type TipoForm } from './FormLancamento';

type Aba = AbaOrcamento;

const TITULO_GRAFICO: Record<Aba, string> = {
  receita: 'Receitas por tipo',
  fixa: 'Despesas fixas por categoria',
  variavel: 'Despesas variáveis por categoria',
};

function CartaoResumo({
  rotulo,
  valor,
  cor,
  detalhe,
  acao,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  detalhe?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="cartao flex min-w-0 flex-col gap-1.5 p-4 sm:p-5">
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <span className="rotulo-secao">{rotulo}</span>
        {acao}
      </div>
      <Valor c={valor} className="f-valor min-w-0 truncate text-[19px] leading-[26px] sm:text-[24px] sm:leading-[30px]" style={{ color: cor }} />
      <div className="min-h-[18px] text-[12.5px] leading-[18px] text-suave">{detalhe}</div>
    </div>
  );
}

function LinhaItem({ item, categoria, aoAbrir }: { item: ItemMes; categoria?: Categoria; aoAbrir: () => void }) {
  const pendente = item.prevista && !item.prevista.recebida;
  const atrasada = pendente && item.data < hojeISO();
  return (
    <li className="border-t border-borda first:border-t-0">
      <button type="button" onClick={aoAbrir} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface2 sm:px-4">
        <IconeCategoria icone={categoria?.icone ?? 'tag'} cor={categoria?.cor ?? 'c0'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-[20px]">{item.descricao}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-[18px] text-suave">
            <span className="f-num">{formatarData(item.data, 'diaMes')}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{categoria?.nome ?? 'Sem categoria'}</span>
            {(item.tipo === 'receita-recorrente' || item.tipo === 'fixa') && (
              <span className="inline-flex items-center gap-1 text-marca">
                <Icone nome="arrow-clockwise" tamanho={12} /> todo mês
              </span>
            )}
            {item.parcela && (
              <span className="f-num rounded-md bg-surface2 px-1.5 text-[11.5px] font-semibold text-texto">
                {item.parcela.numero}/{item.parcela.total}
              </span>
            )}
            {pendente && <Selo tom={atrasada ? 'alerta' : 'neutro'}>{atrasada ? 'atrasada' : 'prevista'}</Selo>}
          </div>
        </div>
        <Valor
          c={item.natureza === 'despesa' ? -item.valor : item.valor}
          className={cx('f-valor shrink-0 text-[14.5px]', pendente ? 'text-suave' : item.natureza === 'receita' ? 'text-receita' : 'text-despesa')}
        />
      </button>
    </li>
  );
}

export function Orcamento() {
  const dados = useDados();
  const { mes, avisar, navegar } = useUI();
  const [aba, setAba] = useState<Aba>('receita');
  const [crescente, setCrescente] = useState(true);
  const [form, setForm] = useState<{ tipo: TipoForm; item: ItemMes | null } | null>(null);
  const [prevista, setPrevista] = useState<ItemMes | null>(null);
  const [investir, setInvestir] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [copiar, setCopiar] = useState(false);
  const [limpar, setLimpar] = useState(false);
  const [verGrafico, setVerGrafico] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>({ texto: '', categorias: [] });

  const itens = useMemo(() => itensDoMes(dados, mes), [dados, mes]);
  const resumo = useMemo(() => resumoDosItens(itens, ajusteInvestirNoMes(dados.investir, mes)), [itens, dados.investir, mes]);
  const catPorId = useMemo(() => new Map(dados.categorias.map((c) => [c.id, c])), [dados.categorias]);

  const daAba = useMemo(() => {
    const t = normalizar(filtro.texto);
    return itens
      .filter((i) => ABA_DO_TIPO[i.tipo] === aba)
      .filter((i) => !t || normalizar(i.descricao).includes(t))
      .filter((i) => !filtro.categorias.length || filtro.categorias.includes(i.categoriaId))
      .sort((a, b) => (crescente ? 1 : -1) * (a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao)));
  }, [itens, aba, filtro, crescente]);

  const totalAba = daAba.reduce((s, i) => s + (i.prevista && !i.prevista.recebida ? 0 : i.valor), 0);
  const filtroAtivo = !!filtro.texto || filtro.categorias.length > 0;
  const naturezaAba = aba === 'receita' ? 'receita' : 'despesa';

  // Cada aba tem o seu gráfico: só as receitas, só as fixas ou só as variáveis do mês.
  const fatiasCat = porCategoria(itensDaAba(itens, aba));
  const totalGrafico = fatiasCat.reduce((s, f) => s + f.valor, 0);
  const fatias = agruparFatias(
    fatiasCat.map((f) => {
      const c = catPorId.get(f.categoriaId);
      return { id: f.categoriaId, rotulo: c?.nome ?? 'Sem categoria', valor: f.valor, cor: corVar(c?.cor ?? 'c0') };
    }),
    6,
    'Outras categorias',
  );

  const abrir = (i: ItemMes) => {
    if (i.prevista && !i.prevista.recebida) setPrevista(i);
    else setForm({ tipo: ABA_DO_TIPO[i.tipo], item: i });
  };
  const nAvulsos = avulsosDoMes(dados.lancamentos, mes).length;
  const pctInvestir = porcentagem(resumo.investir, resumo.receita, 1);

  const vazios: Record<Aba, { icone: string; titulo: string; texto: string; botao: string }> = {
    receita: {
      icone: 'coins',
      titulo: `Nenhuma receita em ${nomeMes(mes)}`,
      texto: 'Salário, trabalhos extras, reembolsos. Ligue “Repete todo mês” no que é fixo.',
      botao: 'Adicionar receita',
    },
    fixa: {
      icone: 'receipt',
      titulo: 'Nenhuma despesa fixa',
      texto: 'Aluguel, internet, assinaturas: cadastre uma vez e elas aparecem nos meses seguintes.',
      botao: 'Adicionar despesa fixa',
    },
    variavel: {
      icone: 'shopping-cart',
      titulo: 'Nenhuma despesa variável',
      texto: 'Mercado, lazer, farmácia e compras parceladas entram aqui.',
      botao: 'Adicionar despesa',
    },
  };

  const painelGrafico = (
    <section aria-labelledby="titulo-grafico" className="cartao flex flex-col gap-4 p-5">
      <h2 id="titulo-grafico" className="f-titulo text-[16px] leading-[22px]">
        {TITULO_GRAFICO[aba]}
      </h2>
      {totalGrafico > 0 ? (
        <>
          <Rosca
            fatias={fatias}
            rotuloCentro={aba === 'receita' ? 'de receita' : aba === 'fixa' ? 'em fixas' : 'em variáveis'}
            rotuloAcessivel={`${TITULO_GRAFICO[aba]} em ${nomeMes(mes)}: ${fatiasCat
              .map((f) => `${catPorId.get(f.categoriaId)?.nome ?? 'Sem categoria'} ${formatarPct(f.pct)}`)
              .join(', ')}`}
          />
          <LegendaRosca
            total={totalGrafico}
            itens={fatiasCat.map((f) => {
              const c = catPorId.get(f.categoriaId);
              return { id: f.categoriaId, rotulo: c?.nome ?? 'Sem categoria', valor: f.valor, cor: corVar(c?.cor ?? 'c0') };
            })}
            aoClicar={(id) => setFiltro({ texto: '', categorias: [id] })}
          />
        </>
      ) : (
        <EstadoVazio compacto icone="chart-donut" titulo="Sem dados para o gráfico" texto="Os valores aparecem aqui assim que houver lançamentos no mês." />
      )}
    </section>
  );

  return (
    <Pagina
      titulo="Orçamento"
      usaMes
      acoes={
        <Botao tamanho="sm" variante="fantasma" icone="tag" onClick={() => navegar('categorias')} className="hidden sm:inline-flex">
          Categorias
        </Botao>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <CartaoResumo
            rotulo="Receita"
            valor={resumo.receita}
            cor="var(--pos)"
            detalhe={
              resumo.aReceber > 0 ? (
                <button type="button" className="font-semibold text-texto hover:text-marca" onClick={() => setAba('receita')}>
                  Previsto <Valor c={resumo.aReceber} />
                </button>
              ) : (
                'Entradas confirmadas'
              )
            }
          />
          <CartaoResumo
            rotulo="Investir"
            valor={resumo.investir}
            cor="var(--inv)"
            acao={<BotaoIcone icone="pencil-simple" rotulo="Ajustar quanto investir" tamanho={30} tamanhoIcone={15} onClick={() => setInvestir(true)} />}
            detalhe={
              resumo.ajusteInvestir
                ? resumo.ajusteInvestir.modo === 'percentual'
                  ? `${formatarPct(resumo.ajusteInvestir.percentual)} da receita`
                  : `Valor fixo${pctInvestir !== null ? ` · ${formatarPct(pctInvestir, 1)}` : ''}`
                : (
                  <button type="button" className="font-semibold text-marca" onClick={() => setInvestir(true)}>
                    Definir quanto investir
                  </button>
                )
            }
          />
          <CartaoResumo
            rotulo="Despesas"
            valor={resumo.despesas}
            cor="var(--neg)"
            detalhe={
              <span className="f-num">
                Fixas <Valor c={resumo.despesasFixas} /> · Variáveis <Valor c={resumo.despesasVariaveis} />
              </span>
            }
          />
          <CartaoResumo
            rotulo="Saldo"
            valor={resumo.saldo}
            cor={resumo.saldo < 0 ? 'var(--neg)' : 'var(--text)'}
            detalhe="Receita − despesas − investir"
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-label="Lançamentos" className={cx('cartao min-w-0 overflow-hidden', verGrafico && 'hidden lg:block')}>
            <div className="flex flex-col gap-3 border-b border-borda p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <Segmentado<Aba>
                rotulo="Tipo de lançamento"
                valor={aba}
                aoMudar={(a) => {
                  setAba(a);
                  setFiltro({ texto: '', categorias: [] });
                }}
                opcoes={[
                  { valor: 'receita', rotulo: 'Receita' },
                  { valor: 'fixa', rotulo: 'Fixa' },
                  { valor: 'variavel', rotulo: 'Variável' },
                ]}
              />
              <div className="flex items-center gap-1.5">
                <BotaoIcone icone="chart-donut" rotulo="Ver gráfico" variante="fantasma" tamanho={38} className="lg:hidden" onClick={() => setVerGrafico(true)} />
                <BotaoIcone
                  icone="funnel-simple"
                  rotulo="Filtrar"
                  variante={filtroAtivo ? 'primario' : 'fantasma'}
                  tamanho={38}
                  onClick={() => setFiltroAberto(true)}
                />
                <BotaoIcone icone="copy" rotulo="Copiar de outro mês" variante="fantasma" tamanho={38} onClick={() => setCopiar(true)} />
                <BotaoIcone icone="broom" rotulo="Limpar lançamentos do mês" variante="fantasma" tamanho={38} disabled={!nAvulsos} onClick={() => setLimpar(true)} />
                <Botao variante="primario" icone="plus" tamanho="sm" className="ml-1 h-[38px]" onClick={() => setForm({ tipo: aba, item: null })}>
                  Adicionar
                </Botao>
              </div>
            </div>

            {filtroAtivo && (
              <div className="flex flex-wrap items-center gap-2 border-b border-borda bg-marca-suave px-4 py-2 text-[13px]">
                <Icone nome="funnel-simple" tamanho={14} className="text-marca" />
                <span className="min-w-0 flex-1">
                  Filtrando
                  {filtro.texto && <> por “{filtro.texto}”</>}
                  {filtro.categorias.length > 0 && (
                    <> · {filtro.categorias.map((id) => catPorId.get(id)?.nome).filter(Boolean).join(', ')}</>
                  )}
                </span>
                <button type="button" className="font-semibold text-marca" onClick={() => setFiltro({ texto: '', categorias: [] })}>
                  Limpar
                </button>
              </div>
            )}

            {daAba.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-suave">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-texto" onClick={() => setCrescente((c) => !c)}>
                    Data <Icone nome={crescente ? 'arrow-up' : 'arrow-down'} tamanho={12} />
                    <span className="sr-only">{crescente ? '(mais antigas primeiro)' : '(mais recentes primeiro)'}</span>
                  </button>
                  <span>Valor</span>
                </div>
                <ul>
                  {daAba.map((i) => (
                    <LinhaItem key={i.chave} item={i} categoria={catPorId.get(i.categoriaId)} aoAbrir={() => abrir(i)} />
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-borda bg-surface2 px-4 py-3 text-[13.5px]">
                  <span className="font-semibold text-suave">
                    {daAba.length} {daAba.length === 1 ? 'lançamento' : 'lançamentos'}
                    {filtroAtivo ? ' no filtro' : ''}
                  </span>
                  <Valor c={totalAba} className="f-valor text-[15px]" />
                </div>
              </>
            ) : filtroAtivo ? (
              <EstadoVazio compacto icone="magnifying-glass" titulo="Nada encontrado" texto="Nenhum lançamento desta aba combina com o filtro." />
            ) : (
              <EstadoVazio
                icone={vazios[aba].icone}
                titulo={vazios[aba].titulo}
                texto={vazios[aba].texto}
                acoes={
                  <Botao variante="primario" icone="plus" onClick={() => setForm({ tipo: aba, item: null })}>
                    {vazios[aba].botao}
                  </Botao>
                }
              />
            )}
          </section>

          <div className={cx('lg:sticky lg:top-[100px]', !verGrafico && 'hidden lg:block')}>
            {verGrafico && (
              <div className="mb-3 lg:hidden">
                <Botao variante="secundario" icone="list" onClick={() => setVerGrafico(false)}>
                  Ver lista
                </Botao>
              </div>
            )}
            {painelGrafico}
          </div>
        </div>
      </div>

      <FormLancamento aberto={!!form} aoFechar={() => setForm(null)} tipo={form?.tipo ?? 'receita'} mes={mes} item={form?.item} />
      <ModalPrevista
        item={prevista}
        aoFechar={() => setPrevista(null)}
        aoEditar={() => {
          const i = prevista;
          setPrevista(null);
          if (i) setForm({ tipo: 'receita', item: i });
        }}
      />
      <DialogoInvestir aberto={investir} aoFechar={() => setInvestir(false)} mes={mes} receita={resumo.receita} />
      <ModalFiltro aberto={filtroAberto} aoFechar={() => setFiltroAberto(false)} natureza={naturezaAba} filtro={filtro} aoAplicar={setFiltro} />
      <ModalCopiar aberto={copiar} aoFechar={() => setCopiar(false)} mes={mes} />
      <Confirmacao
        aberto={limpar}
        aoFechar={() => setLimpar(false)}
        titulo={`Limpar ${nomeMes(mes)}?`}
        perigo
        rotuloConfirmar="Limpar mês"
        texto={
          <>
            <p>
              Remove {nAvulsos} {nAvulsos === 1 ? 'lançamento avulso' : 'lançamentos avulsos'} deste mês (receitas avulsas e previstas e despesas
              variáveis à vista).
            </p>
            <p className="mt-2">Receitas recorrentes, despesas fixas e parcelas de compras continuam. Para tirar uma delas, abra o lançamento.</p>
          </>
        }
        aoConfirmar={() => {
          const n = limparMes(mes);
          avisar(`${n} ${n === 1 ? 'lançamento removido' : 'lançamentos removidos'}.`);
        }}
      />
    </Pagina>
  );
}
