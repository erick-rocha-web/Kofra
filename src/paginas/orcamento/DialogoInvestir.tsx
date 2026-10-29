import { useEffect, useId, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { definirInvestir, removerAjusteInvestir } from '../../estado/acoesOrcamento';
import { ajusteInvestirNoMes, proximoAjusteInvestir } from '../../engine/orcamento';
import { percentualDoValor, porcentagem, type Centavos } from '../../engine/dinheiro';
import { nomeMes, type Mes } from '../../engine/datas';
import { formatarPct, formatarValor } from '../../engine/formato';
import { Botao, Campo, EntradaDinheiro, Segmentado, cx } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';

const ATALHOS = [10, 20, 30, 50];

export function DialogoInvestir({
  aberto,
  aoFechar,
  mes,
  receita,
}: {
  aberto: boolean;
  aoFechar: () => void;
  mes: Mes;
  receita: Centavos;
}) {
  const { investir } = useDados();
  const { avisar } = useUI();
  const idValor = useId();
  const idFaixa = useId();
  const atual = ajusteInvestirNoMes(investir, mes);
  const proprio = investir.find((a) => a.mes === mes) ?? null;
  const proximo = proximoAjusteInvestir(investir, mes);

  const [modo, setModo] = useState<'percentual' | 'valor'>('percentual');
  const [pct, setPct] = useState(0);
  const [valor, setValor] = useState<Centavos | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setModo(atual?.modo ?? 'percentual');
    setPct(atual?.modo === 'percentual' ? atual.percentual : 20);
    setValor(atual?.modo === 'valor' ? atual.valor : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const resultado = modo === 'percentual' ? percentualDoValor(receita, pct) : valor ?? 0;
  const pctDoValor = porcentagem(resultado, receita, 1);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Quanto investir"
      subtitulo={`A parte da receita que você separa antes de gastar. Vale de ${nomeMes(mes)} em diante.`}
      rodape={
        <>
          {proprio && (
            <Botao
              variante="fantasma"
              className="mr-auto"
              onClick={() => {
                removerAjusteInvestir(mes);
                avisar(`Ajuste de ${nomeMes(mes)} removido.`);
                aoFechar();
              }}
            >
              Remover ajuste
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              definirInvestir(mes, modo, modo === 'percentual' ? pct : 0, modo === 'valor' ? valor ?? 0 : 0);
              avisar(`Investir atualizado de ${nomeMes(mes)} em diante.`);
              aoFechar();
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmentado
          rotulo="Forma de definir"
          valor={modo}
          aoMudar={setModo}
          larguraTotal
          opcoes={[
            { valor: 'percentual', rotulo: '% da receita', icone: 'percent' },
            { valor: 'valor', rotulo: 'Valor fixo', icone: 'coins' },
          ]}
        />

        {modo === 'percentual' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <label htmlFor={idFaixa} className="text-[13px] font-semibold">
                Percentual
              </label>
              <span className="f-valor text-[30px] leading-none">{formatarPct(pct)}</span>
            </div>
            <input
              id={idFaixa}
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-full accent-[color:var(--brand)]"
              aria-valuetext={formatarPct(pct)}
            />
            <div className="flex flex-wrap gap-2">
              {ATALHOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setPct(a)}
                  className={cx(
                    'h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors',
                    pct === a ? 'bg-marca text-sobre-marca' : 'bg-surface2 hover:bg-borda',
                  )}
                >
                  {a}%
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Campo rotulo="Valor a investir" htmlFor={idValor} ajuda="Fica fixo mesmo se a receita do mês mudar.">
            <EntradaDinheiro id={idValor} valor={valor} aoMudar={setValor} autoFocus />
          </Campo>
        )}

        <div className="rounded-2xl bg-surface2 p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-suave">Neste mês</p>
          <p className="f-valor mt-1 text-[22px] text-investimento">{formatarValor(resultado)}</p>
          <p className="text-[13px] text-suave">
            {receita > 0
              ? `${pctDoValor !== null ? formatarPct(pctDoValor, 1) : '—'} da receita de ${formatarValor(receita)}`
              : 'Sem receita lançada neste mês ainda.'}
          </p>
        </div>

        {proximo && (
          <p className="flex items-start gap-2 text-[12.5px] leading-[18px] text-suave">
            <Icone nome="info" tamanho={15} className="mt-px shrink-0 text-marca" />
            Em {nomeMes(proximo.mes)} existe outro ajuste ({proximo.modo === 'percentual' ? formatarPct(proximo.percentual) : formatarValor(proximo.valor)}),
            que continua valendo a partir de lá.
          </p>
        )}
      </div>
    </Modal>
  );
}
