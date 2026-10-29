import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { adicionarLocal, configurarReserva } from '../../estado/acoesReserva';
import { despesasDoMes } from '../../engine/orcamento';
import { MESES_NIVEL } from '../../engine/reserva';
import { ativosNoMes } from '../../engine/investimentos';
import { formatarData, hojeISO, mesAtual, nomeMes, somarMeses } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import type { NivelReserva } from '../../storage/tipos';
import { Botao, Campo, Entrada, EntradaDinheiro, Marcador, Segmentado, Selecao, cx } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';

const NIVEIS: { nivel: NivelReserva; titulo: string; texto: string }[] = [
  { nivel: 'basico', titulo: 'Básico · 6 meses', texto: 'Para quem tem renda estável, como salário fixo.' },
  { nivel: 'blindado', titulo: 'Blindado · 12 meses', texto: 'Para renda que varia: autônomos, comissão, empresa própria.' },
];

/** Configuração em 3 passos: nível → custo essencial → onde está (opcional). */
export function AssistenteReserva({ aberto, aoFechar, soMeta }: { aberto: boolean; aoFechar: () => void; soMeta?: boolean }) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { custo: useId(), nome: useId(), valor: useId(), ativo: useId() };
  const [passo, setPasso] = useState(1);
  const [nivel, setNivel] = useState<NivelReserva>('basico');
  const [custo, setCusto] = useState<number | null>(null);
  const [selecionando, setSelecionando] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [modoLocal, setModoLocal] = useState<'manual' | 'ativo'>('manual');
  const [nomeLocal, setNomeLocal] = useState('');
  const [valorLocal, setValorLocal] = useState<number | null>(null);
  const [ativoId, setAtivoId] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const mesPassado = somarMeses(mesAtual(), -1);
  const gastosMesPassado = useMemo(() => despesasDoMes(dados, mesPassado).sort((a, b) => b.valor - a.valor), [dados, mesPassado]);
  const ativos = useMemo(() => ativosNoMes(dados, mesAtual()), [dados]);

  useEffect(() => {
    if (!aberto) return;
    setPasso(1);
    setNivel(dados.reserva.config?.nivel ?? 'basico');
    setCusto(dados.reserva.config?.custoMensal ?? null);
    setSelecionando(false);
    setMarcados([]);
    setModoLocal('manual');
    setNomeLocal('');
    setValorLocal(null);
    setAtivoId(ativos[0]?.ativo.id ?? '');
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const somaMarcados = gastosMesPassado.filter((g) => marcados.includes(g.chave)).reduce((s, g) => s + g.valor, 0);
  const meta = custo ? custo * MESES_NIVEL[nivel] : null;
  const ultimoPasso = soMeta || dados.reserva.locais.length > 0 ? 2 : 3;

  const concluir = (comLocal: boolean) => {
    if (!custo) return;
    configurarReserva(nivel, custo);
    if (comLocal) {
      if (modoLocal === 'ativo') {
        const a = ativos.find((x) => x.ativo.id === ativoId);
        if (a) adicionarLocal({ nome: a.ativo.nome, ativoId: a.ativo.id, data: hojeISO() });
      } else if (nomeLocal.trim()) {
        adicionarLocal({ nome: nomeLocal, valorInicial: valorLocal ?? 0, data: hojeISO() });
      }
    }
    avisar(`Meta da reserva: ${formatarValor(custo * MESES_NIVEL[nivel])}.`);
    aoFechar();
  };

  const avancar = () => {
    setErro(null);
    if (passo === 2) {
      if (!custo || custo <= 0) return setErro('Informe quanto custa o seu mês essencial.');
      if (ultimoPasso === 2) return concluir(false);
    }
    if (passo === 3) {
      if (modoLocal === 'manual' && !nomeLocal.trim()) return setErro('Dê um nome ao local, ou pule este passo.');
      if (modoLocal === 'ativo' && !ativoId) return setErro('Escolha um investimento, ou pule este passo.');
      return concluir(true);
    }
    setPasso((p) => p + 1);
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      fecharClicandoFora={false}
      aoVoltar={selecionando ? () => setSelecionando(false) : passo > 1 ? () => setPasso((p) => p - 1) : undefined}
      titulo={selecionando ? `Gastos de ${nomeMes(mesPassado)}` : ['Nível da reserva', 'Custo essencial do mês', 'Onde a reserva está'][passo - 1]}
      subtitulo={selecionando ? 'Marque o que é essencial: o que você continuaria pagando num mês difícil.' : `Passo ${passo} de ${ultimoPasso}`}
      rodape={
        selecionando ? (
          <>
            <span className="mr-auto text-[13px] text-suave">
              Soma: <strong className="f-num text-texto">{formatarValor(somaMarcados)}</strong>
            </span>
            <Botao
              variante="primario"
              disabled={!somaMarcados}
              onClick={() => {
                setCusto(somaMarcados);
                setSelecionando(false);
              }}
            >
              Usar este valor
            </Botao>
          </>
        ) : (
          <>
            {passo === 3 && (
              <Botao variante="fantasma" className="mr-auto" onClick={() => concluir(false)}>
                Pular
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={avancar}>
              {passo === ultimoPasso ? 'Concluir' : 'Continuar'}
            </Botao>
          </>
        )
      }
    >
      {selecionando ? (
        gastosMesPassado.length ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="self-start text-[13px] font-semibold text-marca"
              onClick={() => setMarcados(marcados.length === gastosMesPassado.length ? [] : gastosMesPassado.map((g) => g.chave))}
            >
              {marcados.length === gastosMesPassado.length ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
            <ul className="flex flex-col">
              {gastosMesPassado.map((g) => (
                <li key={g.chave} className="border-t border-borda py-2.5 first:border-t-0">
                  <Marcador
                    marcado={marcados.includes(g.chave)}
                    aoMudar={(v) => setMarcados((m) => (v ? [...m, g.chave] : m.filter((x) => x !== g.chave)))}
                  >
                    <span className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate">
                        {g.descricao} <span className="text-[12.5px] text-suave">· {formatarData(g.data, 'diaMes')}</span>
                      </span>
                      <span className="f-num font-semibold">{formatarValor(g.valor)}</span>
                    </span>
                  </Marcador>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[14px] text-suave">Não há despesas lançadas em {nomeMes(mesPassado)}. Digite o valor manualmente.</p>
        )
      ) : passo === 1 ? (
        <div role="radiogroup" aria-label="Nível da reserva" className="flex flex-col gap-2">
          {NIVEIS.map((n) => (
            <button
              key={n.nivel}
              type="button"
              role="radio"
              aria-checked={nivel === n.nivel}
              onClick={() => setNivel(n.nivel)}
              className={cx(
                'flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
                nivel === n.nivel ? 'border-marca bg-marca-suave' : 'border-borda hover:bg-surface2',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  nivel === n.nivel ? 'border-marca bg-marca text-sobre-marca' : 'border-borda',
                )}
              >
                {nivel === n.nivel && <Icone nome="check" tamanho={11} />}
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{n.titulo}</span>
                <span className="block text-[13px] text-suave">{n.texto}</span>
              </span>
            </button>
          ))}
        </div>
      ) : passo === 2 ? (
        <div className="flex flex-col gap-4">
          <Campo
            rotulo="Quanto custa um mês essencial"
            htmlFor={ids.custo}
            erro={erro}
            ajuda="Moradia, mercado, contas, transporte e saúde. Fica de fora o que dá para cortar."
          >
            <EntradaDinheiro id={ids.custo} valor={custo} aoMudar={setCusto} autoFocus />
          </Campo>
          <Botao icone="list-checks" onClick={() => setSelecionando(true)}>
            Somar gastos de {nomeMes(mesPassado)}
          </Botao>
          {meta !== null && (
            <div className="rounded-2xl bg-surface2 p-4">
              <p className="rotulo-secao">Sua meta</p>
              <p className="f-valor mt-1 text-[24px]">{formatarValor(meta)}</p>
              <p className="text-[13px] text-suave">
                {formatarValor(custo ?? 0)} × {MESES_NIVEL[nivel]} meses
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[13.5px] text-suave">Se você já tem algum dinheiro guardado para imprevistos, diga onde. Dá para adicionar outros locais depois.</p>
          <Segmentado
            rotulo="Tipo de local"
            valor={modoLocal}
            aoMudar={setModoLocal}
            larguraTotal
            opcoes={[
              { valor: 'manual', rotulo: 'Informar valor', icone: 'piggy-bank' },
              { valor: 'ativo', rotulo: 'Usar investimento', icone: 'link-simple' },
            ]}
          />
          {modoLocal === 'manual' ? (
            <>
              <Campo rotulo="Nome do local" htmlFor={ids.nome} erro={erro}>
                <Entrada id={ids.nome} value={nomeLocal} maxLength={60} placeholder="Ex.: Conta remunerada, Poupança" onChange={(e) => setNomeLocal(e.target.value)} />
              </Campo>
              <Campo rotulo="Quanto tem lá hoje" htmlFor={ids.valor}>
                <EntradaDinheiro id={ids.valor} valor={valorLocal} aoMudar={setValorLocal} />
              </Campo>
            </>
          ) : ativos.length ? (
            <Campo rotulo="Investimento" htmlFor={ids.ativo} erro={erro} ajuda="O valor da reserva vai acompanhar o valor atual deste investimento.">
              <Selecao id={ids.ativo} value={ativoId} onChange={(e) => setAtivoId(e.target.value)}>
                {ativos.map((a) => (
                  <option key={a.ativo.id} value={a.ativo.id}>
                    {a.ativo.nome} · {formatarValor(a.atual)}
                  </option>
                ))}
              </Selecao>
            </Campo>
          ) : (
            <p className="rounded-2xl border border-dashed border-borda p-3 text-[13px] text-suave">
              Você ainda não tem investimentos cadastrados neste mês. Informe o valor ou cadastre o investimento antes.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
