import { useId, useMemo, useState } from 'react';
import { aporteParaMilhao, tempoParaMilhao, type UnidadePeriodo, type UnidadeTaxa } from '../../engine/calculadoras';
import { Pagina } from '../../layout/Pagina';
import { Botao, Campo, Entrada, EntradaDinheiro, EntradaPercentual, EstadoVazio, Segmentado, Selecao, ValorGrande } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Medidor } from '../../ui/graficos/Medidor';

interface Formulario {
  modo: 'tempo' | 'aporte';
  inicial: number | null;
  mensal: number | null;
  taxa: number | null;
  unidadeTaxa: UnidadeTaxa;
  prazo: string;
  unidadePrazo: UnidadePeriodo;
}

const VAZIO: Formulario = { modo: 'tempo', inicial: null, mensal: null, taxa: null, unidadeTaxa: 'mensal', prazo: '', unidadePrazo: 'anos' };
let ultima: Formulario = { ...VAZIO };

function Aviso({ icone, titulo, texto }: { icone: string; titulo: string; texto: string }) {
  return (
    <div className="cartao flex items-start gap-3 p-5">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
        <Icone nome={icone} tamanho={20} />
      </span>
      <div>
        <p className="f-titulo text-[16px]">{titulo}</p>
        <p className="mt-1 text-[14px] leading-[21px] text-suave">{texto}</p>
      </div>
    </div>
  );
}

export function PrimeiroMilhao() {
  const ids = { ini: useId(), men: useId(), taxa: useId(), un: useId(), prazo: useId(), unp: useId() };
  const [f, setF] = useState<Formulario>(ultima);
  const mudar = (p: Partial<Formulario>) =>
    setF((x) => {
      const novo = { ...x, ...p };
      ultima = novo;
      return novo;
    });

  const prazo = Math.max(0, Math.floor(Number(f.prazo) || 0));
  const tempo = useMemo(
    () => (f.modo === 'tempo' ? tempoParaMilhao({ inicial: f.inicial ?? 0, mensal: f.mensal ?? 0, taxa: f.taxa ?? 0, unidadeTaxa: f.unidadeTaxa }) : null),
    [f],
  );
  const aporte = useMemo(
    () =>
      f.modo === 'aporte' && prazo > 0
        ? aporteParaMilhao({ inicial: f.inicial ?? 0, prazo, unidadePrazo: f.unidadePrazo, taxa: f.taxa ?? 0, unidadeTaxa: f.unidadeTaxa })
        : null,
    [f, prazo],
  );
  const vazio = f.modo === 'tempo' ? !(f.inicial || f.mensal) : !prazo;
  const excesso = f.modo === 'aporte' && (f.unidadePrazo === 'anos' ? prazo * 12 : prazo) > 1200;

  return (
    <Pagina titulo="Primeiro milhão" voltarPara="calculadoras" rotuloVoltar="Voltar às calculadoras">
      <div className="mb-5">
        <Segmentado
          rotulo="O que descobrir"
          valor={f.modo}
          aoMudar={(m) => mudar({ modo: m })}
          opcoes={[
            { valor: 'tempo', rotulo: 'Em quanto tempo', icone: 'hourglass-medium' },
            { valor: 'aporte', rotulo: 'Quanto por mês', icone: 'coins' },
          ]}
        />
        <p className="mt-2 text-[13px] text-suave">A meta é fixa: R$ 1.000.000,00.</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Dados do cálculo" className="cartao flex flex-col gap-4 p-5">
          <Campo rotulo="Valor inicial" htmlFor={ids.ini}>
            <EntradaDinheiro id={ids.ini} valor={f.inicial} aoMudar={(v) => mudar({ inicial: v })} />
          </Campo>
          {f.modo === 'tempo' ? (
            <Campo rotulo="Valor mensal" htmlFor={ids.men}>
              <EntradaDinheiro id={ids.men} valor={f.mensal} aoMudar={(v) => mudar({ mensal: v })} />
            </Campo>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-2">
              <Campo rotulo="Prazo" htmlFor={ids.prazo} erro={excesso ? 'Use até 100 anos.' : null}>
                <Entrada id={ids.prazo} inputMode="numeric" placeholder="0" value={f.prazo} onChange={(e) => mudar({ prazo: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </Campo>
              <Selecao aria-label="Unidade do prazo" id={ids.unp} value={f.unidadePrazo} onChange={(e) => mudar({ unidadePrazo: e.target.value as UnidadePeriodo })}>
                <option value="anos">anos</option>
                <option value="meses">meses</option>
              </Selecao>
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_120px] items-end gap-2">
            <Campo rotulo="Taxa de juros" htmlFor={ids.taxa}>
              <EntradaPercentual id={ids.taxa} valor={f.taxa} aoMudar={(v) => mudar({ taxa: v })} />
            </Campo>
            <Selecao aria-label="Unidade da taxa" id={ids.un} value={f.unidadeTaxa} onChange={(e) => mudar({ unidadeTaxa: e.target.value as UnidadeTaxa })}>
              <option value="mensal">ao mês</option>
              <option value="anual">ao ano</option>
            </Selecao>
          </div>
          <Botao variante="fantasma" icone="broom" className="self-start" onClick={() => mudar({ ...VAZIO, modo: f.modo })}>
            Limpar
          </Botao>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {vazio || excesso ? (
            <div className="cartao">
              <EstadoVazio
                icone="target"
                titulo="Monte sua simulação"
                texto={
                  f.modo === 'tempo'
                    ? 'Informe quanto você já tem, quanto guarda por mês e a taxa. Calculamos em quanto tempo chega a R$ 1 milhão.'
                    : 'Informe quanto você já tem, o prazo e a taxa. Calculamos quanto guardar por mês.'
                }
              />
            </div>
          ) : f.modo === 'tempo' && tempo ? (
            tempo.ok ? (
              <section aria-label="Resultado" className="cartao flex flex-col gap-5 p-5 sm:p-6">
                <div>
                  <p className="text-[15px] font-medium text-suave">Você chega ao primeiro milhão em</p>
                  <p className="f-valor mt-1 text-[clamp(30px,6.5vw,44px)] leading-[1.15]" style={{ fontVariantNumeric: 'normal' }}>
                    {tempo.texto}
                  </p>
                </div>
                <Medidor
                  titulo="Do que o milhão é feito"
                  partes={[
                    { rotulo: 'Sai do seu bolso', valor: tempo.investido, pct: tempo.pctInvestido, cor: 'var(--cat-0)' },
                    { rotulo: 'Juros ganhos', valor: tempo.juros, pct: tempo.pctJuros, cor: 'var(--brand)' },
                  ]}
                />
              </section>
            ) : tempo.motivo === 'ja-atingiu' ? (
              <Aviso icone="confetti" titulo="Você já chegou lá" texto="Você começa com R$ 1 milhão ou mais." />
            ) : (
              <Aviso
                icone="hourglass-medium"
                titulo="Não chega em 100 anos"
                texto="Com esses valores, o primeiro milhão não é alcançado em até 100 anos. Aumente o valor mensal ou a taxa."
              />
            )
          ) : aporte && aporte.ok ? (
            <section aria-label="Resultado" className="cartao flex flex-col gap-5 p-5 sm:p-6">
              {aporte.suficiente ? (
                <div>
                  <p className="text-[15px] font-medium text-suave">Guardar por mês</p>
                  <p className="f-titulo mt-1 text-[24px] leading-[30px]">Nenhum: só o que você tem hoje basta</p>
                  <p className="mt-1 text-[14px] text-suave">Rendendo a essa taxa, ele chega a R$ 1 milhão dentro do prazo, sem novos aportes.</p>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] font-medium text-suave">Guardar por mês</p>
                  <ValorGrande c={aporte.aporte} tamanho="clamp(32px, 7vw, 48px)" />
                  <p className="mt-1 text-[13px] text-suave">por mês, durante {aporte.meses} meses</p>
                </div>
              )}
              <Medidor
                titulo="Do que o milhão é feito"
                partes={[
                  { rotulo: 'Sai do seu bolso', valor: aporte.investido, pct: aporte.pctInvestido, cor: 'var(--cat-0)' },
                  { rotulo: 'Juros ganhos', valor: aporte.juros, pct: aporte.pctJuros, cor: 'var(--brand)' },
                ]}
              />
            </section>
          ) : null}
        </div>
      </div>
    </Pagina>
  );
}
