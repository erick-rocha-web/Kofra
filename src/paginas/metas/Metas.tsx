import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { excluirMovimentoMeta, movimentarMeta } from '../../estado/acoesMetas';
import { faltaMeta, guardadoMeta, metaConcluida, progressoMeta, sugestaoMensal } from '../../engine/metas';
import { dataValida, formatarData, hojeISO, mesAtual } from '../../engine/datas';
import { formatarPct } from '../../engine/formato';
import { Pagina } from '../../layout/Pagina';
import type { Meta } from '../../storage/tipos';
import { BarraProgresso, Botao, BotaoIcone, Campo, Entrada, EntradaDinheiro, EstadoVazio, Segmentado, Selo, Valor, cx } from '../../ui/base';
import { corVar } from '../../ui/cores';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';
import { FormMeta } from './FormMeta';

function ModalMovimentar({ meta, aoFechar }: { meta: Meta | null; aoFechar: () => void }) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { valor: useId(), data: useId() };
  const [tipo, setTipo] = useState<'guardar' | 'retirar'>('guardar');
  const [valor, setValor] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (meta) {
      setTipo('guardar');
      setValor(null);
      setData(hojeISO());
      setErro(null);
    }
  }, [meta]);
  const atual = meta ? dados.metas.find((m) => m.id === meta.id) ?? meta : null;
  if (!atual) return null;
  const guardado = guardadoMeta(dados, atual, mesAtual());
  const historico = [...atual.movimentos].sort((a, b) => b.data.localeCompare(a.data));

  const confirmar = () => {
    if (!valor || valor <= 0) return setErro('Informe um valor maior que zero.');
    if (!dataValida(data) || data > hojeISO()) return setErro('Use hoje ou uma data passada.');
    if (tipo === 'retirar' && valor > guardado) return setErro('A retirada é maior do que a meta tem.');
    movimentarMeta(atual.id, data, tipo === 'guardar' ? valor : -valor);
    avisar(tipo === 'guardar' ? 'Aporte registrado.' : 'Retirada registrada.');
    setValor(null);
    setErro(null);
  };

  return (
    <Modal
      aberto={!!meta}
      aoFechar={aoFechar}
      titulo={`${atual.emoji} ${atual.nome}`}
      subtitulo="Registre o que você guardou ou tirou desta meta."
      rodape={
        <Botao variante="primario" onClick={aoFechar}>
          Concluir
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-surface2 p-4">
          <p className="rotulo-secao">Já juntou</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <Valor c={guardado} className="f-valor text-[26px]" />
            <span className="text-[13px] text-suave">
              de <Valor c={atual.total} />
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
          <Segmentado
            rotulo="Movimento"
            valor={tipo}
            aoMudar={setTipo}
            larguraTotal
            opcoes={[
              { valor: 'guardar', rotulo: 'Guardar', icone: 'plus' },
              { valor: 'retirar', rotulo: 'Retirar', icone: 'minus' },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <Campo rotulo={tipo === 'guardar' ? 'Quanto guardou' : 'Quanto tirou'} htmlFor={ids.valor} erro={erro}>
              <EntradaDinheiro id={ids.valor} valor={valor} aoMudar={setValor} />
            </Campo>
            <Campo rotulo="Data" htmlFor={ids.data}>
              <Entrada id={ids.data} type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
            </Campo>
          </div>
          <Botao variante="secundario" icone={tipo === 'guardar' ? 'plus' : 'minus'} onClick={confirmar}>
            {tipo === 'guardar' ? 'Registrar valor guardado' : 'Registrar retirada'}
          </Botao>
        </div>
        {historico.length > 0 && (
          <div>
            <p className="rotulo-secao mb-2">Movimentações</p>
            <ul className="flex flex-col">
              {historico.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-t border-borda py-2 first:border-t-0">
                  <Icone nome={m.valor >= 0 ? 'arrow-down' : 'arrow-up'} tamanho={15} className={m.valor >= 0 ? 'text-receita' : 'text-despesa'} titulo={m.valor >= 0 ? 'Aporte' : 'Retirada'} />
                  <span className="f-num w-24 text-[13px] text-suave">{formatarData(m.data)}</span>
                  <Valor c={m.valor} sinal className={cx('f-valor flex-1 text-[14px]', m.valor >= 0 ? 'text-receita' : 'text-despesa')} />
                  <BotaoIcone
                    icone="trash"
                    rotulo="Apagar movimentação"
                    variante="perigo"
                    tamanho={30}
                    onClick={() => {
                      excluirMovimentoMeta(atual.id, m.id);
                      avisar('Movimentação apagada.');
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CartaoMeta({ meta, aoEditar, aoMovimentar }: { meta: Meta; aoEditar: () => void; aoMovimentar: () => void }) {
  const dados = useDados();
  const guardado = guardadoMeta(dados, meta, mesAtual());
  const falta = faltaMeta(meta.total, guardado);
  const pronta = metaConcluida(meta.total, guardado);
  const pct = progressoMeta(meta.total, guardado);
  const sugestao = sugestaoMensal(meta.total, guardado, meta.prazo, hojeISO());
  const atrasada = !!meta.prazo && meta.prazo < hojeISO() && !pronta;
  const ligados =
    meta.guardarEm.tipo === 'ativos'
      ? meta.guardarEm.ativoIds.map((id) => dados.ativos.find((a) => a.id === id)?.nome).filter(Boolean).join(', ')
      : meta.guardarEm.texto;

  return (
    <article className="cartao flex flex-col gap-4 p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[24px]"
          style={{ background: `color-mix(in srgb, ${corVar(meta.cor)} 22%, transparent)` }}
        >
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="f-titulo truncate text-[16.5px] leading-[22px]">{meta.nome}</h3>
          <p className="flex items-center gap-1.5 text-[12.5px] text-suave">
            <Icone nome="calendar-blank" tamanho={13} />
            {meta.prazo ? formatarData(meta.prazo, 'extenso') : 'Sem prazo'}
            {atrasada && <span className="font-semibold text-alerta">· prazo passou</span>}
          </p>
        </div>
        <BotaoIcone icone="pencil-simple" rotulo={`Editar ${meta.nome}`} variante="fantasma" tamanho={34} onClick={aoEditar} />
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-2">
            <Valor c={guardado} className="f-valor text-[22px]" />
            <span className="text-[13px] text-suave">
              de <Valor c={meta.total} />
            </span>
          </span>
          {pronta ? (
            <Selo tom="receita" icone="check">
              Meta alcançada
            </Selo>
          ) : (
            <span className="text-[13px] font-semibold text-suave">
              Falta juntar <Valor c={falta} />
            </span>
          )}
        </div>
        <BarraProgresso valor={pct} cor={pronta ? 'var(--pos)' : corVar(meta.cor)} altura={10} rotulo={`${meta.nome}: ${formatarPct(pct)}`} />
        <span className="f-num text-[12.5px] text-suave">{formatarPct(pct)} do total</span>
      </div>

      {sugestao !== null && (
        <p className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2.5 text-[13px]">
          <Icone nome="lightbulb" tamanho={16} className="text-marca" />
          <span>
            Separe ~<Valor c={sugestao} semCentavos className="font-semibold" /> por mês até o prazo
          </span>
        </p>
      )}

      <footer className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-suave">
          <Icone nome={meta.guardarEm.tipo === 'ativos' ? 'link-simple' : 'piggy-bank'} tamanho={14} />
          <span className="truncate">{ligados || 'Local não informado'}</span>
        </span>
        {meta.guardarEm.tipo === 'texto' ? (
          <Botao tamanho="sm" variante={pronta ? 'secundario' : 'primario'} icone="arrows-down-up" onClick={aoMovimentar}>
            Guardar ou tirar
          </Botao>
        ) : (
          <span className="shrink-0 text-[12px] text-suave">segue os investimentos</span>
        )}
      </footer>
    </article>
  );
}

export function Metas() {
  const dados = useDados();
  const [form, setForm] = useState<{ meta: Meta | null } | null>(null);
  const [mov, setMov] = useState<Meta | null>(null);

  const ordenadas = useMemo(() => {
    const comStatus = dados.metas.map((m) => ({ m, pronta: metaConcluida(m.total, guardadoMeta(dados, m, mesAtual())) }));
    return comStatus.sort((a, b) => Number(a.pronta) - Number(b.pronta) || (a.m.prazo ?? '9999').localeCompare(b.m.prazo ?? '9999')).map((x) => x.m);
  }, [dados]);

  return (
    <Pagina
      titulo="Metas"
      acoes={
        dados.metas.length > 0 ? (
          <Botao tamanho="sm" variante="primario" icone="plus" onClick={() => setForm({ meta: null })}>
            Nova meta
          </Botao>
        ) : undefined
      }
    >
      {ordenadas.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ordenadas.map((m) => (
            <CartaoMeta key={m.id} meta={m} aoEditar={() => setForm({ meta: m })} aoMovimentar={() => setMov(m)} />
          ))}
        </div>
      ) : (
        <div className="cartao">
          <EstadoVazio
            icone="flag-banner"
            titulo="Qual é o próximo sonho?"
            texto="Uma viagem, um carro, a entrada de um apartamento. Crie uma meta, registre os aportes e acompanhe até chegar lá."
            acoes={
              <Botao variante="primario" icone="plus" onClick={() => setForm({ meta: null })}>
                Criar meta
              </Botao>
            }
          />
        </div>
      )}
      <FormMeta aberto={!!form} aoFechar={() => setForm(null)} meta={form?.meta ?? null} />
      <ModalMovimentar meta={mov} aoFechar={() => setMov(null)} />
    </Pagina>
  );
}
