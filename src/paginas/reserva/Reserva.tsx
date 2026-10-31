import { useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { estadoReserva, fracaoCobertura, metaReserva, MESES_NIVEL, percentualReserva, valorLocal, valorReserva } from '../../engine/reserva';
import { hojeISO } from '../../engine/datas';
import { formatarPct } from '../../engine/formato';
import { Pagina } from '../../layout/Pagina';
import type { LocalReserva } from '../../storage/tipos';
import { Botao, BotaoIcone, EstadoVazio, Selo, Valor, useOculto } from '../../ui/base';
import { GuardaChuva } from '../../ui/GuardaChuva';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';
import { AssistenteReserva } from './AssistenteReserva';
import { ModalLocal, ModalNovoLocal } from './Locais';

function Ajuda({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Como funciona a reserva" largura="md">
      <div className="flex flex-col gap-4 text-[14px] leading-[22px] text-suave">
        <p>
          A reserva de emergência é o dinheiro separado para imprevistos: um conserto, um problema de saúde, um mês sem renda. Ela existe para
          que um susto não vire dívida.
        </p>
        <div>
          <p className="font-semibold text-texto">Como a meta é calculada</p>
          <p>Custo essencial de um mês × número de meses do nível: Básico, 6 meses (renda estável) ou Blindado, 12 meses (renda que varia).</p>
        </div>
        <div>
          <p className="font-semibold text-texto">De onde vem o total da reserva</p>
          <p>
            É a soma dos locais da lista. Um local pode ter aportes e saques registrados por você ou acompanhar um investimento cadastrado no
            Pila.
          </p>
        </div>
        <div>
          <p className="font-semibold text-texto">O guarda-chuva</p>
          <p>A cor vai preenchendo a copa conforme você se aproxima da meta. Quando ela é atingida, a chuva para.</p>
        </div>
        <div>
          <p className="font-semibold text-texto">Onde guardar</p>
          <p>Em aplicações de baixo risco e resgate rápido. Reserva não é para buscar rendimento alto: é para estar lá quando você precisar.</p>
        </div>
      </div>
    </Modal>
  );
}

export function Reserva() {
  const dados = useDados();
  const oculto = useOculto();
  const [assistente, setAssistente] = useState<'tudo' | 'meta' | null>(null);
  const [novoLocal, setNovoLocal] = useState(false);
  const [local, setLocal] = useState<LocalReserva | null>(null);
  const [ajuda, setAjuda] = useState(false);

  const hoje = hojeISO();
  const config = dados.reserva.config;
  const meta = metaReserva(config);
  const atual = useMemo(() => valorReserva(dados, hoje), [dados, hoje]);
  const estado = estadoReserva(atual, meta);
  const pct = percentualReserva(atual, meta) ?? 0;
  const falta = meta ? Math.max(0, meta - atual) : 0;

  const textos = {
    zero: { selo: 'Sem cobertura', tom: 'neutro' as const, titulo: 'Comece a abrir seu guarda-chuva', texto: 'Registre onde a reserva está guardada.' },
    parcial: { selo: 'Cobertura parcial', tom: 'marca' as const, titulo: null, texto: null },
    completo: { selo: 'Cobertura total', tom: 'receita' as const, titulo: 'Pode chover: sua meta foi atingida', texto: null },
  }[estado];

  return (
    <Pagina
      titulo="Reserva de emergência"
      acoes={
        <Botao tamanho="sm" variante="secundario" icone="info" onClick={() => setAjuda(true)}>
          Como funciona
        </Botao>
      }
    >
      {!config ? (
        <div className="cartao">
          <EstadoVazio
            icone="umbrella"
            titulo="Monte sua reserva de emergência"
            texto="Em 3 passos: escolha o nível da reserva, informe o custo essencial do mês e diga em que lugar ela fica."
            acoes={
              <>
                <Botao variante="primario" icone="umbrella" onClick={() => setAssistente('tudo')}>
                  Montar minha reserva
                </Botao>
                <Botao variante="fantasma" onClick={() => setAjuda(true)}>
                  Como funciona
                </Botao>
              </>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_356px]">
          <section aria-label="Progresso da reserva" className="cartao flex flex-col items-center gap-3.5 px-5 pb-7 pt-6 text-center sm:px-8">
            <Selo tom={textos.tom}>{textos.selo}</Selo>
            <p className="f-titulo text-[21px] leading-[28px] sm:text-[24px] sm:leading-[30px]">
              {estado === 'parcial' ? (
                <>
                  Faltam <Valor c={falta} /> para cobrir tudo
                </>
              ) : (
                textos.titulo
              )}
            </p>
            {textos.texto && <p className="-mt-1 text-[14px] text-suave">{textos.texto}</p>}
            <GuardaChuva fracao={fracaoCobertura(atual, meta)} estado={estado} largura={300} />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <span className="f-valor text-[46px] leading-[52px] sm:text-[52px] sm:leading-[56px]" style={{ fontVariantNumeric: 'normal' }}>
                {oculto ? '••' : formatarPct(pct)}
              </span>
              <span className="hidden h-[52px] w-px bg-borda sm:block" aria-hidden />
              <div className="flex flex-col items-center gap-0.5 sm:items-start">
                <Valor c={atual} className="f-valor text-[22px] leading-[28px] sm:text-[24px] sm:leading-[30px]" />
                <div className="flex items-center gap-1 text-[14px] text-suave">
                  <span>
                    Meta <Valor c={meta ?? 0} />
                  </span>
                  <BotaoIcone icone="pencil-simple" rotulo="Editar meta" variante="fantasma" tamanho={30} tamanhoIcone={15} redondo onClick={() => setAssistente('meta')} />
                </div>
              </div>
            </div>
            <p className="text-[12.5px] text-suave">
              Nível {config.nivel === 'basico' ? 'Básico' : 'Blindado'}: custo essencial de <Valor c={config.custoMensal} /> × {MESES_NIVEL[config.nivel]} meses
            </p>
          </section>

          <section aria-labelledby="locais-titulo" className="cartao overflow-hidden">
            <div className="flex items-center justify-between py-4 pl-5 pr-4">
              <h2 id="locais-titulo" className="f-titulo text-[16px] leading-[22px]">
                Onde a reserva fica
              </h2>
              <BotaoIcone icone="plus" rotulo="Adicionar local" variante="primario" tamanho={38} onClick={() => setNovoLocal(true)} />
            </div>
            {dados.reserva.locais.length ? (
              <ul>
                {dados.reserva.locais.map((l) => (
                  <li key={l.id} className="border-t border-borda">
                    <button type="button" onClick={() => setLocal(l)} className="flex w-full items-center gap-2 py-3.5 pl-5 pr-4 text-left transition-colors hover:bg-surface2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{l.nome}</span>
                        {l.vinculo.tipo === 'ativo' && (
                          <span className="flex items-center gap-1 text-[12px] text-suave">
                            <Icone nome="link-simple" tamanho={12} /> investimento
                          </span>
                        )}
                      </span>
                      <Valor c={valorLocal(dados, l, hoje)} className="f-valor text-[15px]" />
                      <Icone nome="caret-right" tamanho={13} className="text-suave" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-t border-borda px-5 py-6 text-center text-[13.5px] text-suave">
                Nenhum local ainda. Adicione onde a reserva está guardada.
              </div>
            )}
            <div className="flex items-center justify-between border-t border-borda bg-surface2 px-5 py-3.5">
              <span className="text-[14px] font-semibold text-suave">Total</span>
              <Valor c={atual} className="f-valor text-[16px]" />
            </div>
          </section>
        </div>
      )}

      <AssistenteReserva aberto={assistente !== null} soMeta={assistente === 'meta'} aoFechar={() => setAssistente(null)} />
      <ModalNovoLocal aberto={novoLocal} aoFechar={() => setNovoLocal(false)} />
      <ModalLocal local={local} aoFechar={() => setLocal(null)} />
      <Ajuda aberto={ajuda} aoFechar={() => setAjuda(false)} />
    </Pagina>
  );
}
