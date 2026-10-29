import { useEffect, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { atualizarValoresDoMes } from '../../estado/acoesInvestimentos';
import { ROTULO_TIPO, TIPOS_ATIVO, ativosNoMes, resumoInvestimentos, type LinhaAtivo } from '../../engine/investimentos';
import { nomeMes } from '../../engine/datas';
import { formatarPct, formatarValor, OCULTO } from '../../engine/formato';
import type { Centavos } from '../../engine/dinheiro';
import { Pagina } from '../../layout/Pagina';
import type { Ativo } from '../../storage/tipos';
import { Botao, EntradaDinheiro, EstadoVazio, Valor, ValorGrande, cx, useOculto } from '../../ui/base';
import { IconeCategoria } from '../../ui/categoria';
import { corVar } from '../../ui/cores';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';
import { LegendaRosca, Rosca } from '../../ui/graficos/Rosca';
import { FormAtivo } from './FormAtivo';

function Rendimento({ valor, pct, grande }: { valor: Centavos; pct: number | null; grande?: boolean }) {
  const oculto = useOculto();
  const cor = valor > 0 ? 'text-receita' : valor < 0 ? 'text-despesa' : 'text-suave';
  return (
    <span className={cx('f-num inline-flex items-center gap-1 font-semibold', cor, grande ? 'text-[15px]' : 'text-[12.5px]')}>
      {valor !== 0 && <Icone nome={valor > 0 ? 'arrow-up-right' : 'arrow-down-right'} tamanho={grande ? 16 : 13} />}
      {oculto ? OCULTO : formatarValor(valor, { sinal: true })}
      {pct !== null && <span>({formatarPct(pct, 1, true)})</span>}
    </span>
  );
}

function ModalAtualizarMes({ aberto, aoFechar, linhas, mes }: { aberto: boolean; aoFechar: () => void; linhas: LinhaAtivo[]; mes: string }) {
  const { avisar } = useUI();
  const [valores, setValores] = useState<Record<string, { investido: number | null; atual: number | null }>>({});
  useEffect(() => {
    if (aberto) setValores(Object.fromEntries(linhas.map((l) => [l.ativo.id, { investido: l.investido, atual: l.atual }])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Atualizar valores de ${nomeMes(mes)}`}
      subtitulo="Copie do extrato o valor de hoje de cada investimento. O que não mudar pode ficar como está."
      largura="lg"
      fecharClicandoFora={false}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              const mudou = linhas
                .map((l) => ({ l, v: valores[l.ativo.id] }))
                .filter(({ l, v }) => v && v.atual !== null && v.investido !== null && (v.atual !== l.atual || v.investido !== l.investido))
                .map(({ l, v }) => ({ id: l.ativo.id, investido: v.investido as number, atual: v.atual as number }));
              atualizarValoresDoMes(mes, mudou);
              avisar(mudou.length ? `${mudou.length} ${mudou.length === 1 ? 'investimento atualizado' : 'investimentos atualizados'}.` : 'Nada mudou.', mudou.length ? 'sucesso' : 'info');
              aoFechar();
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <ul className="flex flex-col gap-3">
        {linhas.map((l) => {
          const v = valores[l.ativo.id] ?? { investido: l.investido, atual: l.atual };
          return (
            <li key={l.ativo.id} className="rounded-2xl border border-borda p-3">
              <p className="mb-2 text-[14px] font-semibold">
                {l.ativo.nome} <span className="font-normal text-suave">· {ROTULO_TIPO[l.ativo.tipo]}</span>
              </p>
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                <EntradaDinheiro
                  ariaLabel={`Quanto você aplicou em ${l.ativo.nome}`}
                  valor={v.investido}
                  aoMudar={(x) => setValores((s) => ({ ...s, [l.ativo.id]: { ...v, investido: x } }))}
                />
                <EntradaDinheiro
                  ariaLabel={`Valor atual de ${l.ativo.nome}`}
                  valor={v.atual}
                  aoMudar={(x) => setValores((s) => ({ ...s, [l.ativo.id]: { ...v, atual: x } }))}
                />
              </div>
              <p className="mt-1.5 flex justify-between text-[11.5px] uppercase tracking-[0.06em] text-suave">
                <span>Investido</span>
                <span>Atual</span>
              </p>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function Investimentos() {
  const dados = useDados();
  const { mes } = useUI();
  const [form, setForm] = useState<{ ativo: Ativo | null } | null>(null);
  const [atualizarMes, setAtualizarMes] = useState(false);

  const resumo = useMemo(() => resumoInvestimentos(dados, mes), [dados, mes]);
  const linhas = useMemo(() => ativosNoMes(dados, mes), [dados, mes]);
  const vazio = linhas.length === 0;

  const fatias = resumo.porTipo.map((t) => {
    const info = TIPOS_ATIVO.find((x) => x.tipo === t.tipo)!;
    return { id: t.tipo, rotulo: info.rotulo, valor: t.atual, cor: corVar(info.cor) };
  });

  return (
    <Pagina titulo="Investimentos" usaMes>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
          <section aria-label="Valor atual" className="cartao col-span-2 flex flex-col gap-2 p-5 sm:p-6 lg:col-span-1">
            <span className="text-[15px] font-medium text-suave">Valor atual</span>
            <ValorGrande c={resumo.atual} tamanho={40} />
            <span className="text-[12.5px] text-suave">Soma do valor de hoje de cada investimento em {nomeMes(mes)}</span>
          </section>
          <div className="cartao flex min-w-0 flex-col gap-2 p-4 sm:p-5">
            <span className="rotulo-secao">Total investido</span>
            <Valor c={resumo.investido} className="f-valor truncate text-[19px] sm:text-[22px]" />
            <span className="text-[12.5px] text-suave">Quanto saiu do seu bolso</span>
          </div>
          <div className="cartao flex min-w-0 flex-col gap-2 p-4 sm:p-5">
            <span className="rotulo-secao">Rendimento</span>
            <Valor
              c={resumo.rendimento}
              sinal
              className={cx('f-valor truncate text-[19px] sm:text-[22px]', resumo.rendimento > 0 ? 'text-receita' : resumo.rendimento < 0 ? 'text-despesa' : '')}
            />
            <span className="text-[12.5px] text-suave">
              {resumo.rendimentoPct !== null ? `${formatarPct(resumo.rendimentoPct, 1, true)} sobre o investido` : 'Atual − investido'}
            </span>
          </div>
        </div>

        {vazio ? (
          <div className="cartao">
            <EstadoVazio
              icone="trend-up"
              titulo={`Nenhum investimento em ${nomeMes(mes)}`}
              texto="Cadastre cada aplicação com quanto você colocou e quanto vale hoje. Depois, uma vez por mês, atualize os valores."
              acoes={
                <Botao variante="primario" icone="plus" onClick={() => setForm({ ativo: null })}>
                  Novo investimento
                </Botao>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-label="Lista de investimentos" className="cartao min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borda p-3 sm:p-4">
                <h2 className="f-titulo pl-1 text-[16px]">Por tipo</h2>
                <div className="flex gap-2">
                  <Botao tamanho="sm" icone="arrow-clockwise" className="h-[38px]" onClick={() => setAtualizarMes(true)}>
                    Atualizar valores
                  </Botao>
                  <Botao variante="primario" tamanho="sm" icone="plus" className="h-[38px]" onClick={() => setForm({ ativo: null })}>
                    Novo
                  </Botao>
                </div>
              </div>
              {resumo.porTipo.map((t) => {
                const info = TIPOS_ATIVO.find((x) => x.tipo === t.tipo)!;
                const doTipo = linhas.filter((l) => l.ativo.tipo === t.tipo).sort((a, b) => b.atual - a.atual);
                return (
                  <div key={t.tipo} className="border-t border-borda first:border-t-0">
                    <div className="flex items-center gap-3 bg-surface2 px-4 py-2.5">
                      <IconeCategoria icone={info.icone} cor={info.cor} tamanho={30} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold">{info.rotulo}</p>
                        <p className="text-[12px] text-suave">
                          {t.quantidade} {t.quantidade === 1 ? 'ativo' : 'ativos'} · {formatarPct(t.pct)} da carteira
                        </p>
                      </div>
                      <div className="text-right">
                        <Valor c={t.atual} className="f-valor block text-[14px]" />
                        <Rendimento valor={t.rendimento} pct={t.rendimentoPct} />
                      </div>
                    </div>
                    <ul>
                      {doTipo.map((l) => (
                        <li key={l.ativo.id} className="border-t border-borda">
                          <button
                            type="button"
                            onClick={() => setForm({ ativo: l.ativo })}
                            className="flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left transition-colors hover:bg-surface2 sm:pl-[58px]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold">{l.ativo.nome}</p>
                              <p className="truncate text-[12.5px] text-suave">
                                {l.ativo.instituicao || 'Sem instituição'} · investido <Valor c={l.investido} />
                              </p>
                            </div>
                            <div className="text-right">
                              <Valor c={l.atual} className="f-valor block text-[14px]" />
                              <Rendimento valor={l.rendimento} pct={l.rendimentoPct} />
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>

            <section aria-labelledby="dist-titulo" className="cartao flex flex-col gap-4 p-5 lg:sticky lg:top-[100px]">
              <h2 id="dist-titulo" className="f-titulo text-[16px] leading-[22px]">
                Distribuição por tipo
              </h2>
              <Rosca
                fatias={fatias}
                rotuloCentro="valor atual"
                rotuloAcessivel={`Distribuição por tipo: ${resumo.porTipo.map((t) => `${ROTULO_TIPO[t.tipo]} ${formatarPct(t.pct)}`).join(', ')}`}
              />
              <LegendaRosca total={resumo.atual} itens={fatias} />
            </section>
          </div>
        )}
      </div>

      <FormAtivo aberto={!!form} aoFechar={() => setForm(null)} mes={mes} ativo={form?.ativo ?? null} />
      <ModalAtualizarMes aberto={atualizarMes} aoFechar={() => setAtualizarMes(false)} linhas={linhas} mes={mes} />
    </Pagina>
  );
}
