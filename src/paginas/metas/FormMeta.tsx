import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { criarMeta, editarMeta, excluirMeta } from '../../estado/acoesMetas';
import { guardadoMeta, sugestaoMensal } from '../../engine/metas';
import { ativosNoMes } from '../../engine/investimentos';
import { dataValida, hojeISO, mesAtual } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import type { Meta } from '../../storage/tipos';
import { Botao, Campo, Entrada, EntradaDinheiro, Marcador, Segmentado, cx } from '../../ui/base';
import { SeletorCor } from '../../ui/categoria';
import { corVar } from '../../ui/cores';
import { Icone } from '../../ui/Icone';
import { Confirmacao, Modal } from '../../ui/Modal';

export const EMOJIS = ['✈️', '🏖️', '🏠', '🚗', '🏍️', '🚲', '💍', '🎓', '📚', '💻', '📱', '🎮', '🎸', '📷', '🛋️', '🧳', '👶', '🐶', '🩺', '🦷', '💪', '🎁', '🎉', '💰', '🏦', '📈', '🌎', '⛰️', '🏝️', '🔧', '🍽️', '❤️'];

export function FormMeta({ aberto, aoFechar, meta }: { aberto: boolean; aoFechar: () => void; meta: Meta | null }) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { nome: useId(), total: useId(), prazo: useId(), texto: useId() };
  const ativos = useMemo(() => ativosNoMes(dados, mesAtual()), [dados]);
  const [emoji, setEmoji] = useState('✈️');
  const [cor, setCor] = useState('c1');
  const [nome, setNome] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [prazo, setPrazo] = useState('');
  const [modo, setModo] = useState<'texto' | 'ativos'>('texto');
  const [texto, setTexto] = useState('');
  const [ativoIds, setAtivoIds] = useState<string[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluir, setExcluir] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    if (meta) {
      setEmoji(meta.emoji);
      setCor(meta.cor);
      setNome(meta.nome);
      setTotal(meta.total);
      setPrazo(meta.prazo ?? '');
      setModo(meta.guardarEm.tipo);
      setTexto(meta.guardarEm.tipo === 'texto' ? meta.guardarEm.texto : '');
      setAtivoIds(meta.guardarEm.tipo === 'ativos' ? meta.guardarEm.ativoIds : []);
    } else {
      const usadas = new Set(dados.metas.map((m) => m.cor));
      setEmoji('✈️');
      setCor(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].find((c) => !usadas.has(c)) ?? 'c1');
      setNome('');
      setTotal(null);
      setPrazo('');
      setModo('texto');
      setTexto('');
      setAtivoIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, meta]);

  // prévia com o que já está guardado (movimentos da meta + investimentos escolhidos)
  const guardadoPrevia = useMemo(() => {
    const base: Meta = {
      id: meta?.id ?? 'nova',
      nome,
      emoji,
      cor,
      total: total ?? 0,
      prazo: prazo || null,
      guardarEm: modo === 'ativos' ? { tipo: 'ativos', ativoIds } : { tipo: 'texto', texto },
      movimentos: meta?.movimentos ?? [],
      criadoEm: '',
    };
    return guardadoMeta(dados, base, mesAtual());
  }, [dados, meta, nome, emoji, cor, total, prazo, modo, ativoIds, texto]);

  const sugestao = total && dataValida(prazo) ? sugestaoMensal(total, guardadoPrevia, prazo, hojeISO()) : null;

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Dê um nome para a meta.';
    if (!total || total <= 0) e.total = 'Informe quanto você quer juntar.';
    if (prazo && !dataValida(prazo)) e.prazo = 'Data inválida.';
    if (modo === 'ativos' && !ativoIds.length) e.ativos = 'Escolha pelo menos um investimento, ou escreva onde o dinheiro fica.';
    setErros(e);
    if (Object.keys(e).length || !total) return;
    const p = {
      nome,
      emoji,
      cor,
      total,
      prazo: prazo || null,
      guardarEm: modo === 'ativos' ? ({ tipo: 'ativos', ativoIds } as const) : ({ tipo: 'texto', texto: texto.trim() } as const),
    };
    if (meta) {
      editarMeta(meta.id, p);
      avisar('Meta atualizada.');
    } else {
      criarMeta(p);
      avisar('Meta criada.');
    }
    aoFechar();
  };

  return (
    <>
      <Modal
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={meta ? 'Editar meta' : 'Nova meta'}
        fecharClicandoFora={false}
        largura="lg"
        rodape={
          <>
            {meta && (
              <Botao variante="perigo-suave" icone="trash" className="mr-auto" onClick={() => setExcluir(true)}>
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar}>
              {meta ? 'Salvar' : 'Criar meta'}
            </Botao>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <div className="flex items-end gap-3">
            <span
              aria-hidden
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[28px]"
              style={{ background: `color-mix(in srgb, ${corVar(cor)} 22%, transparent)` }}
            >
              {emoji}
            </span>
            <div className="min-w-0 flex-1">
              <Campo rotulo="Nome" htmlFor={ids.nome} erro={erros.nome}>
                <Entrada id={ids.nome} value={nome} maxLength={50} placeholder="Ex.: Viagem de férias" onChange={(e) => setNome(e.target.value)} invalido={!!erros.nome} />
              </Campo>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Ícone</legend>
            <div role="radiogroup" aria-label="Ícone da meta" className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={emoji === e}
                  aria-label={e}
                  onClick={() => setEmoji(e)}
                  className={cx('inline-flex aspect-square items-center justify-center rounded-xl text-[20px] transition-colors', emoji === e ? 'bg-marca-suave ring-2 ring-[color:var(--brand)]' : 'hover:bg-surface2')}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Cor</span>
            <SeletorCor valor={cor} aoMudar={setCor} />
          </div>

          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
            <Campo rotulo="Valor total" htmlFor={ids.total} erro={erros.total}>
              <EntradaDinheiro id={ids.total} valor={total} aoMudar={setTotal} invalido={!!erros.total} />
            </Campo>
            <Campo
              rotulo="Prazo (se tiver)"
              htmlFor={ids.prazo}
              erro={erros.prazo}
              extra={
                prazo ? (
                  <button type="button" className="text-[12.5px] font-semibold text-marca" onClick={() => setPrazo('')}>
                    Sem prazo
                  </button>
                ) : undefined
              }
            >
              <Entrada id={ids.prazo} type="date" value={prazo} min={hojeISO()} onChange={(e) => setPrazo(e.target.value)} />
            </Campo>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
            <span className="text-[13px] font-semibold">Guardar em</span>
            <Segmentado
              rotulo="Guardar em"
              valor={modo}
              aoMudar={setModo}
              larguraTotal
              opcoes={[
                { valor: 'texto', rotulo: 'Descrever', icone: 'pencil-simple' },
                { valor: 'ativos', rotulo: 'Ligar a investimentos', icone: 'link-simple' },
              ]}
            />
            {modo === 'texto' ? (
              <Campo rotulo="Local" htmlFor={ids.texto} ajuda="Você registra os aportes e as retiradas na própria meta.">
                <Entrada id={ids.texto} value={texto} maxLength={60} placeholder="Ex.: CDB do banco, conta separada" onChange={(e) => setTexto(e.target.value)} />
              </Campo>
            ) : ativos.length ? (
              <div className="flex flex-col gap-2">
                <p className="text-[12.5px] text-suave">O que a meta já tem segue o valor atual dos investimentos escolhidos.</p>
                <ul className="flex flex-col">
                  {ativos.map((a) => (
                    <li key={a.ativo.id} className="border-t border-borda py-2 first:border-t-0">
                      <Marcador
                        marcado={ativoIds.includes(a.ativo.id)}
                        aoMudar={(v) => setAtivoIds((s) => (v ? [...s, a.ativo.id] : s.filter((x) => x !== a.ativo.id)))}
                      >
                        <span className="flex items-center justify-between gap-3 text-[14px]">
                          <span className="min-w-0 truncate">{a.ativo.nome}</span>
                          <span className="f-num font-semibold">{formatarValor(a.atual)}</span>
                        </span>
                      </Marcador>
                    </li>
                  ))}
                </ul>
                {erros.ativos && <p className="text-[12.5px] font-medium text-despesa">{erros.ativos}</p>}
              </div>
            ) : (
              <p className="text-[13px] text-suave">Nenhum investimento cadastrado neste mês.</p>
            )}
          </div>

          {sugestao !== null && (
            <p className="flex items-center gap-2 rounded-xl bg-marca-suave px-3.5 py-3 text-[14px] font-semibold text-marca">
              <Icone nome="lightbulb" tamanho={17} />
              Separe ~{formatarValor(sugestao, { semCentavos: true })} por mês até o prazo
            </p>
          )}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>
      <Confirmacao
        aberto={excluir}
        aoFechar={() => setExcluir(false)}
        titulo={`Excluir “${meta?.nome ?? ''}”?`}
        perigo
        rotuloConfirmar="Excluir meta"
        texto="A meta e o histórico de aportes e retiradas dela serão apagados. Investimentos ligados continuam existindo."
        aoConfirmar={() => {
          if (meta) excluirMeta(meta.id);
          avisar('Meta excluída.');
          aoFechar();
        }}
      />
    </>
  );
}
