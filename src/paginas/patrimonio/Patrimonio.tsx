import { useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { GRUPOS_COMPOSICAO, composicaoDetalhada, itensNoMes, resumoPatrimonio, type LinhaPatrimonio } from '../../engine/patrimonio';
import { ROTULO_TIPO, TIPOS_ATIVO, ativosNoMes } from '../../engine/investimentos';
import { nomeMes, somarMeses } from '../../engine/datas';
import { porcentagem } from '../../engine/dinheiro';
import { formatarPct, formatarValor, OCULTO } from '../../engine/formato';
import { Pagina } from '../../layout/Pagina';
import type { GrupoPatrimonio, ItemPatrimonio } from '../../storage/tipos';
import { Botao, EstadoVazio, Segmentado, Valor, ValorGrande, cx, useOculto } from '../../ui/base';
import { IconeCategoria } from '../../ui/categoria';
import { corVar } from '../../ui/cores';
import { Icone } from '../../ui/Icone';
import { LegendaRosca, Rosca } from '../../ui/graficos/Rosca';
import { FormItemPatrimonio } from './FormItem';

type Aba = 'liquidez' | 'investimentos' | 'bem' | 'divida';

const VISUAL: Record<Aba, { rotulo: string; icone: string; cor: string }> = {
  liquidez: { rotulo: 'Liquidez', icone: 'bank', cor: 'c1' },
  investimentos: { rotulo: 'Investimentos', icone: 'trend-up', cor: 'c3' },
  bem: { rotulo: 'Bens', icone: 'house-line', cor: 'c2' },
  divida: { rotulo: 'Dívidas', icone: 'credit-card', cor: 'c8' },
};

const ICONE_BEM = { imovel: 'house-line', veiculo: 'car', outros: 'tag' } as const;

function iconeItem(i: ItemPatrimonio): string {
  if (i.grupo === 'bem') return ICONE_BEM[i.tipoBem ?? 'outros'];
  return i.grupo === 'divida' ? 'credit-card' : 'bank';
}

/** Variação do total contra o mês anterior, em R$ e %. */
function Variacao({ atual, anterior, mesAnterior }: { atual: number; anterior: number | null; mesAnterior: string }) {
  const oculto = useOculto();
  if (anterior === null || anterior === 0) {
    return <span className="text-[13px] text-suave">Sem registro em {nomeMes(mesAnterior)} para comparar</span>;
  }
  const dif = atual - anterior;
  const pct = porcentagem(dif, Math.abs(anterior), 1);
  if (dif === 0) return <span className="text-[13px] text-suave">Igual a {nomeMes(mesAnterior)}</span>;
  const sobe = dif > 0;
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-1 text-[13px] font-semibold', sobe ? 'text-receita' : 'text-despesa')}>
      <Icone nome={sobe ? 'arrow-up-right' : 'arrow-down-right'} tamanho={15} />
      {oculto ? OCULTO : formatarValor(Math.abs(dif), { semCentavos: true })}
      {pct !== null && <span>({formatarPct(pct, 1, true)})</span>}
      <span className="font-normal text-suave">{sobe ? 'acima' : 'abaixo'} de {nomeMes(mesAnterior)}</span>
    </span>
  );
}

export function Patrimonio() {
  const dados = useDados();
  const { mes, navegar } = useUI();
  const [aba, setAba] = useState<Aba>('liquidez');
  const [form, setForm] = useState<{ grupo: GrupoPatrimonio; item: ItemPatrimonio | null } | null>(null);

  const resumo = useMemo(() => resumoPatrimonio(dados, mes), [dados, mes]);
  const mesAnterior = somarMeses(mes, -1);
  const resumoAnterior = useMemo(() => resumoPatrimonio(dados, mesAnterior), [dados, mesAnterior]);
  const temAnterior =
    resumoAnterior.liquidez + resumoAnterior.investimentos + resumoAnterior.bens + resumoAnterior.dividas > 0 ? resumoAnterior.total : null;
  const composicao = useMemo(() => composicaoDetalhada(dados, mes), [dados, mes]);
  const base = resumo.liquidez + resumo.investimentos + resumo.bens;
  const vazio = base === 0 && resumo.dividas === 0;

  const valoresGrupo = { liquidez: resumo.liquidez, investimentos: resumo.investimentos, bens: resumo.bens };
  const fatias = GRUPOS_COMPOSICAO.map((g) => ({ id: g.grupo, rotulo: g.rotulo, valor: valoresGrupo[g.grupo], cor: corVar(g.cor) })).filter(
    (f) => f.valor > 0,
  );

  const linhas: LinhaPatrimonio[] = aba === 'investimentos' ? [] : itensNoMes(dados, mes, aba);
  const ativos = aba === 'investimentos' ? ativosNoMes(dados, mes).sort((a, b) => b.atual - a.atual) : [];
  const totalAba = aba === 'investimentos' ? resumo.investimentos : aba === 'liquidez' ? resumo.liquidez : aba === 'bem' ? resumo.bens : resumo.dividas;

  const cartoes: { aba: Aba; valor: number; cor: string }[] = [
    { aba: 'liquidez', valor: resumo.liquidez, cor: 'var(--text)' },
    { aba: 'investimentos', valor: resumo.investimentos, cor: 'var(--text)' },
    { aba: 'bem', valor: resumo.bens, cor: 'var(--text)' },
    { aba: 'divida', valor: resumo.dividas, cor: 'var(--neg)' },
  ];

  return (
    <Pagina titulo="Patrimônio" usaMes>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-2 lg:gap-4">
          <section aria-label="Patrimônio total" className="cartao relative col-span-2 flex flex-col justify-between gap-3 overflow-hidden p-5 sm:p-6 lg:col-span-1 lg:row-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-medium text-suave">Patrimônio total</span>
              <span className="text-[12.5px] text-suave">{nomeMes(mes)}</span>
            </div>
            <ValorGrande c={resumo.total} tamanho={44} semCentavos cor={resumo.total < 0 ? 'var(--neg)' : undefined} />
            <div className="flex flex-col gap-1.5">
              <Variacao atual={resumo.total} anterior={temAnterior} mesAnterior={mesAnterior} />
              <span className="text-[12.5px] text-suave">Liquidez + investimentos + bens − dívidas</span>
            </div>
          </section>
          {cartoes.map((c) => (
            <button
              key={c.aba}
              type="button"
              onClick={() => setAba(c.aba)}
              aria-pressed={aba === c.aba}
              className={cx(
                'cartao flex min-w-0 flex-col gap-2 p-4 text-left transition-colors hover:bg-surface2 sm:p-5',
                aba === c.aba && 'ring-2 ring-[color:var(--brand)]',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: corVar(VISUAL[c.aba].cor) }} aria-hidden />
                <span className="rotulo-secao">{VISUAL[c.aba].rotulo}</span>
              </span>
              <Valor c={c.valor} semCentavos className="f-valor truncate text-[19px] leading-[26px] sm:text-[22px]" style={{ color: c.cor }} />
            </button>
          ))}
        </div>

        {vazio ? (
          <div className="cartao">
            <EstadoVazio
              icone="scales"
              titulo={`Nada registrado em ${nomeMes(mes)}`}
              texto="Some o que você tem (contas, bens e investimentos) e subtraia o que deve. Cada valor vale para os meses seguintes até você atualizar."
              acoes={
                <>
                  <Botao variante="primario" icone="bank" onClick={() => setForm({ grupo: 'liquidez', item: null })}>
                    Adicionar liquidez
                  </Botao>
                  <Botao icone="house-line" onClick={() => setForm({ grupo: 'bem', item: null })}>
                    Adicionar bem
                  </Botao>
                  <Botao icone="credit-card" onClick={() => setForm({ grupo: 'divida', item: null })}>
                    Adicionar dívida
                  </Botao>
                </>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <section aria-labelledby="comp-titulo" className="cartao flex flex-col gap-4 p-5">
              <h2 id="comp-titulo" className="f-titulo text-[16px] leading-[22px]">
                Composição
              </h2>
              {base > 0 ? (
                <>
                  <Rosca
                    fatias={fatias}
                    rotuloCentro="em bens e direitos"
                    rotuloAcessivel={`Composição do patrimônio: ${fatias.map((f) => `${f.rotulo} ${formatarPct(porcentagem(f.valor, base) ?? 0)}`).join(', ')}`}
                  />
                  <LegendaRosca total={base} itens={fatias} />
                  <div className="border-t border-borda pt-3">
                    <p className="rotulo-secao mb-1">O que mais pesa</p>
                    <ul className="flex flex-col">
                      {(composicao.length <= 8 ? composicao : composicao.slice(0, 7)).map((p) => (
                        <li key={p.id} className="flex items-center gap-2 py-1.5 text-[13px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: corVar(GRUPOS_COMPOSICAO.find((g) => g.grupo === p.grupo)?.cor) }} />
                          <span className="min-w-0 flex-1 truncate">{p.rotulo}</span>
                          <span className="f-num font-semibold text-suave">{formatarPct(p.pct)}</span>
                        </li>
                      ))}
                      {composicao.length > 8 && (
                        <li className="flex items-center gap-2 py-1.5 text-[13px] text-suave">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-borda" />
                          <span className="min-w-0 flex-1 truncate">Outros {composicao.length - 7} itens</span>
                          <span className="f-num font-semibold">
                            {formatarPct(porcentagem(composicao.slice(7).reduce((s, p) => s + p.valor, 0), base) ?? 0)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <EstadoVazio compacto icone="chart-donut" titulo="Só dívidas por enquanto" texto="A composição mostra liquidez, investimentos e bens." />
              )}
            </section>

            <section aria-label="Itens do patrimônio" className="cartao min-w-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-borda p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <Segmentado<Aba>
                  rotulo="Grupo"
                  valor={aba}
                  aoMudar={setAba}
                  opcoes={(['liquidez', 'investimentos', 'bem', 'divida'] as Aba[]).map((a) => ({ valor: a, rotulo: VISUAL[a].rotulo }))}
                />
                {aba === 'investimentos' ? (
                  <Botao tamanho="sm" iconeDireita="arrow-right" className="h-[38px]" onClick={() => navegar('investimentos')}>
                    Abrir Investimentos
                  </Botao>
                ) : (
                  <Botao variante="primario" icone="plus" tamanho="sm" className="h-[38px]" onClick={() => setForm({ grupo: aba, item: null })}>
                    Adicionar
                  </Botao>
                )}
              </div>

              {aba === 'investimentos' ? (
                ativos.length ? (
                  <ul>
                    {ativos.map((l) => {
                      const tipo = TIPOS_ATIVO.find((t) => t.tipo === l.ativo.tipo)!;
                      return (
                        <li key={l.ativo.id} className="flex items-center gap-3 border-t border-borda px-4 py-3 first:border-t-0">
                          <IconeCategoria icone={tipo.icone} cor={tipo.cor} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{l.ativo.nome}</p>
                            <p className="truncate text-[12.5px] text-suave">
                              {ROTULO_TIPO[l.ativo.tipo]}
                              {l.ativo.instituicao ? ` · ${l.ativo.instituicao}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <Valor c={l.atual} semCentavos className="f-valor text-[14.5px]" />
                            <p className="f-num text-[12px] text-suave">{formatarPct(porcentagem(l.atual, resumo.investimentos) ?? 0)} do grupo</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EstadoVazio
                    compacto
                    icone="trend-up"
                    titulo="Nenhum investimento neste mês"
                    texto="Os investimentos entram no patrimônio pelo valor atual cadastrado na tela Investimentos."
                    acoes={<Botao onClick={() => navegar('investimentos')}>Ir para Investimentos</Botao>}
                  />
                )
              ) : linhas.length ? (
                <ul>
                  {linhas.map((l) => (
                    <li key={l.item.id} className="border-t border-borda first:border-t-0">
                      <button
                        type="button"
                        onClick={() => setForm({ grupo: l.item.grupo, item: l.item })}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2"
                      >
                        <IconeCategoria icone={iconeItem(l.item)} cor={VISUAL[l.item.grupo].cor} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">{l.item.nome}</p>
                          <p className="truncate text-[12.5px] text-suave">
                            {l.registradoNoMes ? `Valor de ${nomeMes(mes, 'curto')}` : 'Valor de um mês anterior · toque para atualizar'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Valor
                            c={l.item.grupo === 'divida' ? -l.valor : l.valor}
                            semCentavos
                            className={cx('f-valor text-[14.5px]', l.item.grupo === 'divida' && 'text-despesa')}
                          />
                          <p className="f-num text-[12px] text-suave">{formatarPct(porcentagem(l.valor, totalAba) ?? 0)} do grupo</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EstadoVazio
                  compacto
                  icone={VISUAL[aba].icone}
                  titulo={`Sem ${VISUAL[aba].rotulo.toLowerCase()} em ${nomeMes(mes)}`}
                  acoes={
                    <Botao variante="primario" icone="plus" onClick={() => setForm({ grupo: aba, item: null })}>
                      Adicionar
                    </Botao>
                  }
                />
              )}

              {(linhas.length > 0 || ativos.length > 0) && (
                <div className="flex items-center justify-between border-t border-borda bg-surface2 px-4 py-3 text-[13.5px]">
                  <span className="font-semibold text-suave">Total de {VISUAL[aba].rotulo.toLowerCase()}</span>
                  <Valor c={aba === 'divida' ? -totalAba : totalAba} semCentavos className="f-valor text-[15px]" />
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <FormItemPatrimonio
        aberto={!!form}
        aoFechar={() => setForm(null)}
        mes={mes}
        grupoInicial={form?.grupo ?? 'liquidez'}
        item={form?.item ?? null}
      />
    </Pagina>
  );
}
