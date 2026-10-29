import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { adiarPrevista, copiarMes, marcarRecebida } from '../../estado/acoesOrcamento';
import type { ItemMes } from '../../engine/orcamento';
import { dataValida, formatarData, hojeISO, mesDe, nomeMes, somarDias, somarMeses, type Mes } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import type { NaturezaCategoria } from '../../storage/tipos';
import { Botao, Campo, Entrada, Marcador, Selecao, cx } from '../../ui/base';
import { IconeCategoria } from '../../ui/categoria';
import { Modal } from '../../ui/Modal';

export interface Filtro {
  texto: string;
  categorias: string[];
}

export function ModalFiltro({
  aberto,
  aoFechar,
  natureza,
  filtro,
  aoAplicar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  natureza: NaturezaCategoria;
  filtro: Filtro;
  aoAplicar: (f: Filtro) => void;
}) {
  const { categorias } = useDados();
  const id = useId();
  const [texto, setTexto] = useState(filtro.texto);
  const [sel, setSel] = useState<string[]>(filtro.categorias);
  useEffect(() => {
    if (aberto) {
      setTexto(filtro.texto);
      setSel(filtro.categorias);
    }
  }, [aberto, filtro]);
  const lista = categorias.filter((c) => c.natureza === natureza).sort((a, b) => a.ordem - b.ordem);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Filtrar lançamentos"
      rodape={
        <>
          <Botao
            variante="fantasma"
            className="mr-auto"
            onClick={() => {
              aoAplicar({ texto: '', categorias: [] });
              aoFechar();
            }}
          >
            Limpar filtro
          </Botao>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              aoAplicar({ texto: texto.trim(), categorias: sel });
              aoFechar();
            }}
          >
            Aplicar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Campo rotulo="Buscar pela descrição" htmlFor={id}>
          <Entrada id={id} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: mercado" />
        </Campo>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">Categorias</legend>
          <div className="flex flex-wrap gap-1.5">
            {lista.map((c) => {
              const ativo = sel.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setSel((s) => (ativo ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                  className={cx(
                    'inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-[13px] font-medium',
                    ativo ? 'border-marca bg-marca-suave font-semibold' : 'border-borda hover:bg-surface2',
                  )}
                >
                  <IconeCategoria icone={c.icone} cor={c.cor} tamanho={26} />
                  {c.nome}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

export function ModalCopiar({ aberto, aoFechar, mes }: { aberto: boolean; aoFechar: () => void; mes: Mes }) {
  const { lancamentos } = useDados();
  const { avisar } = useUI();
  const id = useId();
  const [origem, setOrigem] = useState(somarMeses(mes, -1));
  const [receitas, setReceitas] = useState(false);
  const [despesas, setDespesas] = useState(true);
  useEffect(() => {
    if (aberto) setOrigem(somarMeses(mes, -1));
  }, [aberto, mes]);

  const opcoes = useMemo(() => {
    const comDados = new Set(lancamentos.filter((l) => !l.parcela && !l.prevista).map((l) => mesDe(l.data)));
    const lista: Mes[] = [];
    for (let k = -1; k >= -24; k--) lista.push(somarMeses(mes, k));
    for (let k = 1; k <= 2; k++) lista.push(somarMeses(mes, k));
    return lista.map((m) => ({ m, tem: comDados.has(m) }));
  }, [lancamentos, mes]);

  const contagem = useMemo(() => {
    const doMes = lancamentos.filter((l) => mesDe(l.data) === origem && !l.parcela && !l.prevista);
    return {
      receitas: doMes.filter((l) => l.natureza === 'receita').length,
      despesas: doMes.filter((l) => l.natureza === 'despesa').length,
    };
  }, [lancamentos, origem]);

  const total = (receitas ? contagem.receitas : 0) + (despesas ? contagem.despesas : 0);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Copiar para ${nomeMes(mes)}`}
      subtitulo="Traga os lançamentos avulsos de outro mês, no mesmo dia. Receitas recorrentes, despesas fixas e parcelas já aparecem sozinhas."
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            disabled={!total}
            onClick={() => {
              const n = copiarMes(origem, mes, { receitas, despesas });
              avisar(`${n} ${n === 1 ? 'lançamento copiado' : 'lançamentos copiados'} para ${nomeMes(mes)}.`);
              aoFechar();
            }}
          >
            Copiar {total ? total : ''}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Copiar de" htmlFor={id}>
          <Selecao id={id} value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {opcoes.map(({ m, tem }) => (
              <option key={m} value={m}>
                {nomeMes(m)}
                {tem ? '' : ' (vazio)'}
              </option>
            ))}
          </Selecao>
        </Campo>
        <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
          <Marcador marcado={despesas} aoMudar={setDespesas}>
            <span className="text-[14px] font-semibold">Despesas variáveis</span>
            <span className="block text-[12.5px] text-suave">{contagem.despesas} em {nomeMes(origem)} (sem parcelas)</span>
          </Marcador>
          <Marcador marcado={receitas} aoMudar={setReceitas}>
            <span className="text-[14px] font-semibold">Receitas avulsas</span>
            <span className="block text-[12.5px] text-suave">{contagem.receitas} em {nomeMes(origem)}</span>
          </Marcador>
        </div>
      </div>
    </Modal>
  );
}

export function ModalPrevista({ item, aoFechar, aoEditar }: { item: ItemMes | null; aoFechar: () => void; aoEditar: () => void }) {
  const { avisar } = useUI();
  const [adiando, setAdiando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const id = useId();
  useEffect(() => {
    if (item) {
      setAdiando(false);
      setNovaData(somarDias(hojeISO(), 7));
    }
  }, [item]);
  if (!item) return null;
  const atrasada = item.data < hojeISO();
  const invalida = !dataValida(novaData) || novaData < hojeISO();

  return (
    <Modal
      aberto={!!item}
      aoFechar={aoFechar}
      titulo="Receita prevista"
      largura="sm"
      rodape={
        adiando ? (
          <>
            <Botao variante="secundario" onClick={() => setAdiando(false)}>
              Voltar
            </Botao>
            <Botao
              variante="primario"
              disabled={invalida}
              onClick={() => {
                if (item.lancamentoId) adiarPrevista(item.lancamentoId, novaData);
                avisar(`Nova data: ${formatarData(novaData)}.`);
                aoFechar();
              }}
            >
              Salvar nova data
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="fantasma" className="mr-auto" onClick={aoEditar}>
              Editar
            </Botao>
            <Botao variante="secundario" onClick={() => setAdiando(true)}>
              Adiar a data
            </Botao>
            <Botao
              variante="primario"
              icone="check"
              onClick={() => {
                if (item.lancamentoId) marcarRecebida(item.lancamentoId);
                avisar('Receita confirmada. Ela já conta no mês.');
                aoFechar();
              }}
            >
              Recebi
            </Botao>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-surface2 p-4">
          <p className="text-[14px] font-semibold">{item.descricao}</p>
          <p className="f-valor mt-1 text-[24px] text-receita">{formatarValor(item.valor)}</p>
          <p className={cx('mt-1 text-[13px]', atrasada ? 'font-semibold text-alerta' : 'text-suave')}>
            {atrasada ? 'Prevista para ' : 'Previsto para '}
            {formatarData(item.data)}
            {atrasada ? ' · atrasada' : ''}
          </p>
        </div>
        {adiando ? (
          <Campo rotulo="Nova data" htmlFor={id} erro={invalida ? 'Use hoje ou uma data futura.' : null}>
            <Entrada id={id} type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
          </Campo>
        ) : (
          <p className="text-[13px] leading-[19px] text-suave">
            Enquanto não for confirmada, ela aparece em “a receber” e não entra na receita do mês.
          </p>
        )}
      </div>
    </Modal>
  );
}
