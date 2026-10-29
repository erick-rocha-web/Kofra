import { useId, useMemo, useState } from 'react';
import { jurosCompostos, pontosDoGrafico, type UnidadePeriodo, type UnidadeTaxa } from '../../engine/calculadoras';
import { formatarValor, OCULTO, plural } from '../../engine/formato';
import { Pagina } from '../../layout/Pagina';
import { Botao, Campo, Entrada, EntradaDinheiro, EntradaPercentual, EstadoVazio, Segmentado, Selecao, Valor, ValorGrande, useOculto } from '../../ui/base';
import { GraficoEvolucao } from '../../ui/graficos/Evolucao';
import { Medidor } from '../../ui/graficos/Medidor';

interface Formulario {
  inicial: number | null;
  mensal: number | null;
  taxa: number | null;
  unidadeTaxa: UnidadeTaxa;
  periodo: string;
  unidadePeriodo: UnidadePeriodo;
}

const VAZIO: Formulario = { inicial: null, mensal: null, taxa: null, unidadeTaxa: 'mensal', periodo: '', unidadePeriodo: 'anos' };
/** Guarda a última simulação enquanto o app está aberto. */
let ultima: Formulario = { ...VAZIO };

export function JurosCompostos() {
  const oculto = useOculto();
  const ids = { ini: useId(), men: useId(), taxa: useId(), un: useId(), per: useId(), unp: useId() };
  const [f, setF] = useState<Formulario>(ultima);
  const [aba, setAba] = useState<'grafico' | 'tabela'>('grafico');
  const mudar = (p: Partial<Formulario>) =>
    setF((x) => {
      const novo = { ...x, ...p };
      ultima = novo;
      return novo;
    });

  const periodo = Math.max(0, Math.floor(Number(f.periodo) || 0));
  const meses = f.unidadePeriodo === 'anos' ? periodo * 12 : periodo;
  const excesso = meses > 1200;
  const res = useMemo(
    () =>
      excesso
        ? null
        : jurosCompostos({
            inicial: f.inicial ?? 0,
            mensal: f.mensal ?? 0,
            taxa: f.taxa ?? 0,
            unidadeTaxa: f.unidadeTaxa,
            periodo,
            unidadePeriodo: f.unidadePeriodo,
          }),
    [f, periodo, excesso],
  );
  const preenchido = (f.inicial ?? 0) > 0 || (f.mensal ?? 0) > 0;

  return (
    <Pagina titulo="Juros compostos" voltarPara="calculadoras" rotuloVoltar="Voltar às calculadoras">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Dados do cálculo" className="cartao flex flex-col gap-4 p-5">
          <Campo rotulo="Valor inicial" htmlFor={ids.ini}>
            <EntradaDinheiro id={ids.ini} valor={f.inicial} aoMudar={(v) => mudar({ inicial: v })} />
          </Campo>
          <Campo rotulo="Valor mensal" htmlFor={ids.men}>
            <EntradaDinheiro id={ids.men} valor={f.mensal} aoMudar={(v) => mudar({ mensal: v })} />
          </Campo>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-2">
            <Campo rotulo="Taxa de juros" htmlFor={ids.taxa}>
              <EntradaPercentual id={ids.taxa} valor={f.taxa} aoMudar={(v) => mudar({ taxa: v })} />
            </Campo>
            <Selecao aria-label="Unidade da taxa" id={ids.un} value={f.unidadeTaxa} onChange={(e) => mudar({ unidadeTaxa: e.target.value as UnidadeTaxa })}>
              <option value="mensal">ao mês</option>
              <option value="anual">ao ano</option>
            </Selecao>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-2">
            <Campo rotulo="Período" htmlFor={ids.per} erro={excesso ? 'Use até 100 anos (1.200 meses).' : null}>
              <Entrada
                id={ids.per}
                inputMode="numeric"
                value={f.periodo}
                placeholder="0"
                onChange={(e) => mudar({ periodo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </Campo>
            <Selecao aria-label="Unidade do período" id={ids.unp} value={f.unidadePeriodo} onChange={(e) => mudar({ unidadePeriodo: e.target.value as UnidadePeriodo })}>
              <option value="meses">meses</option>
              <option value="anos">anos</option>
            </Selecao>
          </div>
          {f.unidadeTaxa === 'anual' && (
            <p className="text-[12.5px] leading-[18px] text-suave">A taxa anual é convertida na taxa mensal equivalente: (1 + anual)^(1/12) − 1.</p>
          )}
          <Botao variante="fantasma" icone="broom" onClick={() => mudar({ ...VAZIO })} className="self-start">
            Limpar
          </Botao>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {!res || !res.ok || !preenchido ? (
            <div className="cartao">
              <EstadoVazio
                icone="chart-line-up"
                titulo={preenchido ? 'Preencha a taxa e o período para simular' : 'Monte sua simulação'}
                texto="Informe um valor inicial ou mensal, a taxa e o período. O resultado aparece aqui na hora."
              />
            </div>
          ) : (
            <>
              <section aria-label="Resultado" className="cartao flex flex-col gap-5 p-5 sm:p-6">
                <div>
                  <p className="text-[15px] font-medium text-suave">Valor final em {plural(res.meses, 'mês', 'meses')}</p>
                  <ValorGrande c={res.final} tamanho="clamp(32px, 7vw, 48px)" />
                </div>
                <Medidor
                  titulo="Composição do valor final"
                  partes={[
                    { rotulo: 'Total investido', valor: res.investido, pct: res.pctInvestido, cor: 'var(--cat-0)' },
                    { rotulo: 'Juros ganhos', valor: res.juros, pct: res.pctJuros, cor: 'var(--brand)' },
                  ]}
                />
              </section>
              <section aria-label="Evolução" className="cartao flex min-w-0 flex-col gap-4 p-5">
                <Segmentado
                  rotulo="Ver como"
                  valor={aba}
                  aoMudar={setAba}
                  opcoes={[
                    { valor: 'grafico', rotulo: 'Gráfico', icone: 'chart-line-up' },
                    { valor: 'tabela', rotulo: 'Mês a mês', icone: 'table' },
                  ]}
                />
                {aba === 'grafico' ? (
                  <GraficoEvolucao pontos={pontosDoGrafico(res.linhas, f.inicial ?? 0)} />
                ) : (
                  <div className="rolagem-fina max-h-[440px] overflow-auto rounded-xl border border-borda">
                    <table className="f-num w-full min-w-[420px] text-[13px]">
                      <thead className="sticky top-0 bg-surface2">
                        <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-suave">
                          <th className="px-3 py-2 font-semibold">Mês</th>
                          <th className="px-3 py-2 text-right font-semibold">Juros do mês</th>
                          <th className="px-3 py-2 text-right font-semibold">Total investido</th>
                          <th className="px-3 py-2 text-right font-semibold">Total acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {res.linhas.map((l) => (
                          <tr key={l.mes} className="border-t border-borda">
                            <td className="px-3 py-1.5">{l.mes}</td>
                            <td className="px-3 py-1.5 text-right">{oculto ? OCULTO : formatarValor(l.juros)}</td>
                            <td className="px-3 py-1.5 text-right">{oculto ? OCULTO : formatarValor(l.investido)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold">{oculto ? OCULTO : formatarValor(l.acumulado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[12.5px] text-suave">
                  Total de juros no período: <Valor c={res.juros} className="font-semibold text-texto" />
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </Pagina>
  );
}
