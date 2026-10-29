import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../estado/loja';
import { useUI } from '../estado/ui';
import { estoques, janelaDoPeriodo, resumoFluxo, textoComparacao, type Periodo, type Variacao } from '../engine/visaoGeral';
import { metaReserva, percentualReserva } from '../engine/reserva';
import { mesAtual, nomeMes, somarMeses, type Mes } from '../engine/datas';
import { formatarPct, formatarValor, OCULTO } from '../engine/formato';
import { Pagina } from '../layout/Pagina';
import { BarraProgresso, Botao, Campo, Segmentado, Selecao, Valor, cx, useOculto } from '../ui/base';
import { Icone } from '../ui/Icone';
import { Modal } from '../ui/Modal';
import { GraficoFluxo } from '../ui/graficos/Fluxo';

type Opcao = 'mes' | '3' | '6' | '12' | 'personalizado';

/** Linha de variação: seta + R$ + % e o sentido em texto (cor nunca sozinha). */
function LinhaVariacao({ v, subirEhBom = true, textoSem }: { v: Variacao; subirEhBom?: boolean; textoSem: string }) {
  const oculto = useOculto();
  if (v.semAnterior) return <span className="text-[13px] text-suave">{textoSem}</span>;
  if (v.valor === 0) return <span className="text-[13px] text-suave">Igual ao período anterior</span>;
  const sobe = v.valor > 0;
  const bom = sobe === subirEhBom;
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-1 text-[13px] font-semibold', bom ? 'text-receita' : 'text-despesa')}>
      <Icone nome={sobe ? 'arrow-up-right' : 'arrow-down-right'} tamanho={15} />
      {oculto ? OCULTO : formatarValor(Math.abs(v.valor))}
      {v.pct !== null && <span>({formatarPct(v.pct, 1, true)})</span>}
      <span className="font-normal text-suave">{sobe ? 'acima' : 'abaixo'} do período anterior</span>
    </span>
  );
}

function CartaoIndicador({
  rotulo,
  valor,
  variacao,
  subirEhBom,
  textoSem,
  cor,
  icone,
}: {
  rotulo: string;
  valor: number;
  variacao: Variacao;
  subirEhBom?: boolean;
  textoSem: string;
  cor?: string;
  icone: string;
}) {
  return (
    <section className="cartao flex min-w-0 flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        <Icone nome={icone} tamanho={17} className="text-marca" />
        <span className="rotulo-secao">{rotulo}</span>
      </div>
      <Valor c={valor} className="f-valor truncate text-[22px] leading-[28px] sm:text-[26px] sm:leading-[32px]" style={{ color: cor }} />
      <LinhaVariacao v={variacao} subirEhBom={subirEhBom} textoSem={textoSem} />
    </section>
  );
}

function ModalPeriodo({
  aberto,
  aoFechar,
  inicial,
  aoAplicar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  inicial: { inicio: Mes; fim: Mes };
  aoAplicar: (p: { inicio: Mes; fim: Mes }) => void;
}) {
  const atual = mesAtual();
  const ids = { ini: useId(), fim: useId() };
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  useEffect(() => {
    if (aberto) {
      setInicio(inicial.inicio);
      setFim(inicial.fim);
    }
  }, [aberto, inicial]);
  const meses = Array.from({ length: 48 }, (_, i) => somarMeses(atual, -i));
  const invalido = inicio > fim;
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Escolher período"
      subtitulo="Cada número soma os meses do intervalo que você escolher."
      largura="sm"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            disabled={invalido}
            onClick={() => {
              aoAplicar({ inicio, fim });
              aoFechar();
            }}
          >
            Aplicar
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
        <Campo rotulo="De" htmlFor={ids.ini} erro={invalido ? 'O início precisa vir antes do fim.' : null}>
          <Selecao id={ids.ini} value={inicio} onChange={(e) => setInicio(e.target.value)}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Até" htmlFor={ids.fim}>
          <Selecao id={ids.fim} value={fim} onChange={(e) => setFim(e.target.value)}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
    </Modal>
  );
}

export function VisaoGeral() {
  const dados = useDados();
  const { navegar } = useUI();
  const oculto = useOculto();
  const atual = mesAtual();
  const [opcao, setOpcao] = useState<Opcao>('mes');
  const [personalizado, setPersonalizado] = useState({ inicio: somarMeses(atual, -2), fim: atual });
  const [modalPeriodo, setModalPeriodo] = useState(false);

  const periodo: Periodo =
    opcao === 'mes'
      ? { tipo: 'mes' }
      : opcao === 'personalizado'
        ? { tipo: 'personalizado', ...personalizado }
        : { tipo: 'meses', n: Number(opcao) as 3 | 6 | 12 };
  const janela = janelaDoPeriodo(periodo, atual);
  const fluxo = useMemo(() => resumoFluxo(dados, janela), [dados, janela.inicio, janela.fim]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = useMemo(() => estoques(dados, janela), [dados, janela.inicio, janela.fim]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = metaReserva(dados.reserva.config);
  const pctReserva = percentualReserva(est.reserva.valor, meta);

  const rotuloJanela = janela.n === 1 ? nomeMes(janela.fim) : `${nomeMes(janela.inicio, 'curto')} a ${nomeMes(janela.fim, 'curto')}`;

  return (
    <Pagina titulo="Visão geral">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Segmentado<Opcao>
            rotulo="Período"
            valor={opcao}
            aoMudar={(o) => {
              if (o === 'personalizado') setModalPeriodo(true);
              else setOpcao(o);
            }}
            opcoes={[
              { valor: 'mes', rotulo: 'Mês atual' },
              { valor: '3', rotulo: '3 meses' },
              { valor: '6', rotulo: '6 meses' },
              { valor: '12', rotulo: '12 meses' },
              { valor: 'personalizado', rotulo: opcao === 'personalizado' ? rotuloJanela : 'Escolher período' },
            ]}
          />
          <p className="text-[13px] text-suave">
            <strong className="font-semibold text-texto">{rotuloJanela}</strong> · {textoComparacao(janela)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          <CartaoIndicador rotulo="Receita" icone="coins" valor={fluxo.receita} variacao={fluxo.variacaoReceita} textoSem="Nada no período anterior para comparar" cor="var(--pos)" />
          <CartaoIndicador
            rotulo="Gastos"
            icone="receipt"
            valor={fluxo.gastos}
            variacao={fluxo.variacaoGastos}
            subirEhBom={false}
            textoSem="Nada no período anterior para comparar"
            cor="var(--neg)"
          />
          <CartaoIndicador rotulo="Patrimônio" icone="scales" valor={est.patrimonio.valor} variacao={est.patrimonio.variacao} textoSem="Sem registro no fim do período anterior" />
          <CartaoIndicador rotulo="Investimentos" icone="trend-up" valor={est.investimentos.valor} variacao={est.investimentos.variacao} textoSem="Sem registro no fim do período anterior" />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="saldo-periodo" className="cartao min-w-0 p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="saldo-periodo" className="rotulo-secao">
                  Resultado do período
                </h2>
                <Valor
                  c={fluxo.saldo}
                  className="f-valor mt-1 block text-[26px] leading-[32px]"
                  style={{ color: fluxo.saldo < 0 ? 'var(--neg)' : undefined }}
                />
                <p className="text-[12.5px] text-suave">Receita − gastos (o investir não é descontado aqui)</p>
              </div>
            </div>
            <GraficoFluxo meses={fluxo.porMes} />
            <details className="mt-3 rounded-xl border border-borda">
              <summary className="cursor-pointer select-none px-3 py-2.5 text-[13px] font-semibold text-suave hover:text-texto">Ver em tabela</summary>
              <div className="overflow-x-auto">
                <table className="f-num w-full min-w-[420px] text-[13px]">
                  <thead>
                    <tr className="border-t border-borda text-left text-[12px] uppercase tracking-[0.06em] text-suave">
                      <th className="px-3 py-2 font-semibold">Mês</th>
                      <th className="px-3 py-2 text-right font-semibold">Receita</th>
                      <th className="px-3 py-2 text-right font-semibold">Gastos</th>
                      <th className="px-3 py-2 text-right font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxo.porMes.map((m) => (
                      <tr key={m.mes} className="border-t border-borda">
                        <td className="px-3 py-2 capitalize">{nomeMes(m.mes, 'curto')}</td>
                        <td className="px-3 py-2 text-right">{oculto ? OCULTO : formatarValor(m.receita)}</td>
                        <td className="px-3 py-2 text-right">{oculto ? OCULTO : formatarValor(m.gastos)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{oculto ? OCULTO : formatarValor(m.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section aria-labelledby="reserva-vg" className="cartao flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Icone nome="umbrella" tamanho={17} className="text-marca" />
              <h2 id="reserva-vg" className="rotulo-secao">
                Reserva de emergência
              </h2>
            </div>
            <Valor c={est.reserva.valor} className="f-valor text-[24px] leading-[30px]" />
            <LinhaVariacao v={est.reserva.variacao} textoSem="Sem registro no fim do período anterior" />
            {meta ? (
              <>
                <BarraProgresso valor={pctReserva ?? 0} cor="var(--brand)" rotulo="Cobertura da reserva" />
                <p className="text-[12.5px] text-suave">
                  {pctReserva !== null && est.reserva.valor < meta ? `${formatarPct(pctReserva)} da meta de ` : 'Meta atingida: '}
                  <Valor c={meta} />
                </p>
              </>
            ) : (
              <Botao tamanho="sm" variante="secundario" onClick={() => navegar('reserva')}>
                Definir a meta da reserva
              </Botao>
            )}
          </section>
        </div>
      </div>

      <ModalPeriodo
        aberto={modalPeriodo}
        aoFechar={() => setModalPeriodo(false)}
        inicial={personalizado}
        aoAplicar={(p) => {
          setPersonalizado(p);
          setOpcao('personalizado');
        }}
      />
    </Pagina>
  );
}
