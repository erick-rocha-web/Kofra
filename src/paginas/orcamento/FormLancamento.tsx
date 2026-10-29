import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import {
  adicionarDespesaFixa,
  adicionarDespesaVariavel,
  adicionarReceita,
  criarCategoria,
  desmarcarRecebida,
  editarCompra,
  editarLancamento,
  editarRecorrente,
  excluirCompra,
  excluirLancamento,
  excluirRecorrenteDesde,
  marcarRecebida,
} from '../../estado/acoesOrcamento';
import type { ItemMes } from '../../engine/orcamento';
import { gerarParcelas, parcelaPadrao } from '../../engine/orcamento';
import { dataNoMes, dataValida, diaDe, hojeISO, mesAtual, mesDe, nomeMes, type Mes } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import { Alternador, Botao, Campo, Entrada, EntradaDinheiro } from '../../ui/base';
import { SeletorCategoria } from '../../ui/categoria';
import { Icone } from '../../ui/Icone';
import { Confirmacao, Modal } from '../../ui/Modal';

export type TipoForm = 'receita' | 'fixa' | 'variavel';

/** Data sugerida para um novo lançamento no mês escolhido. */
export function dataPadrao(mes: Mes): string {
  const hoje = hojeISO();
  return mes === mesAtual() ? hoje : dataNoMes(mes, diaDe(hoje));
}

function Nota({ icone = 'info', children }: { icone?: string; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-surface2 px-3 py-2.5 text-[12.5px] leading-[18px] text-suave">
      <Icone nome={icone} tamanho={15} className="mt-px shrink-0 text-marca" />
      <span>{children}</span>
    </p>
  );
}

export function FormLancamento({
  aberto,
  aoFechar,
  tipo,
  mes,
  item,
}: {
  aberto: boolean;
  aoFechar: () => void;
  tipo: TipoForm;
  mes: Mes;
  /** Presente ao editar. */
  item?: ItemMes | null;
}) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { data: useId(), valor: useId(), desc: useId(), parcelas: useId() };
  const natureza = tipo === 'receita' ? 'receita' : 'despesa';
  const editando = !!item;
  const ehRecorrente = item?.tipo === 'receita-recorrente' || item?.tipo === 'fixa' || (!item && tipo === 'fixa');
  const grupo = item?.parcela?.grupoId;

  const [data, setData] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [repetir, setRepetir] = useState(false);
  const [prevista, setPrevista] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState('2');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    if (item) {
      if (item.parcela) {
        setData(item.parcela.dataCompra);
        setValor(item.parcela.valorTotal);
        setParcelado(true);
        setParcelas(String(item.parcela.total));
      } else {
        setData(item.data);
        setValor(item.valor);
        setParcelado(false);
        setParcelas('2');
      }
      setDescricao(item.descricao);
      setCategoriaId(item.categoriaId);
      setRepetir(item.tipo === 'receita-recorrente');
      setPrevista(item.tipo === 'receita-prevista');
    } else {
      setData(dataPadrao(mes));
      setValor(null);
      setDescricao('');
      // Nada pré-escolhido: evita lançar sem querer na primeira categoria da lista (visto no teste de uso real).
      setCategoriaId(null);
      setRepetir(false);
      setPrevista(false);
      setParcelado(false);
      setParcelas('2');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, item, tipo]);

  const n = Math.max(0, Math.floor(Number(parcelas) || 0));
  const previa = useMemo(() => {
    if (!parcelado || !valor || n < 2 || n > 120) return null;
    const p = gerarParcelas(valor, n, dataValida(data) ? data : dataPadrao(mes));
    return { padrao: parcelaPadrao(valor, n), primeira: p[0].valor };
  }, [parcelado, valor, n, data, mes]);

  const titulo = editando
    ? { receita: 'Editar receita', fixa: 'Editar despesa fixa', variavel: grupo ? 'Editar compra parcelada' : 'Editar despesa variável' }[tipo]
    : { receita: prevista ? 'Nova receita prevista' : 'Nova receita', fixa: 'Nova despesa fixa', variavel: 'Nova despesa variável' }[tipo];

  const rotuloData =
    tipo === 'fixa' ? 'Vencimento' : prevista ? 'Data prevista' : parcelado ? 'Data da compra' : repetir ? 'Data do primeiro recebimento' : 'Data';

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!dataValida(data)) e.data = 'Informe uma data válida.';
    else if (prevista && !editando && data < hojeISO()) e.data = 'Para uma receita prevista, use hoje ou uma data futura.';
    if (!valor || valor <= 0) e.valor = 'Informe um valor maior que zero.';
    if (!categoriaId) e.categoria = natureza === 'receita' ? 'Escolha de onde vem a receita.' : 'Escolha uma categoria.';
    if (parcelado && (n < 2 || n > 120)) e.parcelas = 'Use de 2 a 120 parcelas.';
    setErros(e);
    return !Object.keys(e).length;
  }

  function salvar() {
    if (!validar() || !valor || !categoriaId) return;
    const nomeCat = dados.categorias.find((c) => c.id === categoriaId)?.nome ?? '';
    const desc = descricao.trim() || nomeCat;
    if (!editando) {
      if (tipo === 'receita') adicionarReceita({ descricao: desc, valor, data, categoriaId, modo: repetir ? 'recorrente' : prevista ? 'prevista' : 'avulsa' });
      else if (tipo === 'fixa') adicionarDespesaFixa({ descricao: desc, valor, vencimento: data, categoriaId });
      else adicionarDespesaVariavel({ descricao: desc, valor, data, categoriaId, parcelas: parcelado ? n : 1 });
      const destino = mesDe(data);
      avisar(destino === mes ? 'Lançamento adicionado.' : `Lançamento adicionado em ${nomeMes(destino)}.`);
    } else if (item) {
      if (item.recorrenteId) {
        editarRecorrente(item.recorrenteId, mes, { descricao: desc, valor, dia: diaDe(data), categoriaId });
        avisar(`Alteração vale de ${nomeMes(mes)} em diante.`);
      } else if (tipo === 'variavel' && (grupo || parcelado)) {
        editarCompra({ grupoId: grupo, lancamentoId: grupo ? undefined : item.lancamentoId }, { descricao: desc, valor, data, categoriaId, parcelas: parcelado ? n : 1 });
        avisar('Compra atualizada.');
      } else if (item.lancamentoId) {
        editarLancamento(item.lancamentoId, { descricao: desc, valor, data, categoriaId });
        avisar('Lançamento atualizado.');
      }
    }
    aoFechar();
  }

  function excluir() {
    if (!item) return;
    if (item.recorrenteId) excluirRecorrenteDesde(item.recorrenteId, mes);
    else if (grupo) excluirCompra(grupo);
    else if (item.lancamentoId) excluirLancamento(item.lancamentoId);
    avisar('Lançamento excluído.');
    aoFechar();
  }

  const recorrenteInicio = item?.recorrenteId ? dados.recorrentes.find((r) => r.id === item.recorrenteId)?.inicio : undefined;
  const textoExcluir = item?.recorrenteId
    ? recorrenteInicio && mes > recorrenteInicio
      ? `Ele deixa de aparecer de ${nomeMes(mes)} em diante. Os meses anteriores continuam como estão.`
      : 'Como este é o primeiro mês dele, o lançamento recorrente será apagado por completo.'
    : grupo
      ? `As ${item?.parcela?.total} parcelas desta compra serão apagadas.`
      : 'Este lançamento será apagado.';

  return (
    <>
      <Modal
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={titulo}
        fecharClicandoFora={false}
        rodape={
          <>
            {editando && (
              <Botao variante="perigo-suave" icone="trash" className="mr-auto" onClick={() => setConfirmarExcluir(true)}>
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar}>
              {editando ? 'Salvar' : 'Adicionar'}
            </Botao>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
            <Campo rotulo={rotuloData} htmlFor={ids.data} erro={erros.data}>
              <Entrada id={ids.data} type="date" value={data} onChange={(e) => setData(e.target.value)} invalido={!!erros.data} required />
            </Campo>
            <Campo rotulo={parcelado ? 'Valor total' : 'Valor'} htmlFor={ids.valor} erro={erros.valor}>
              <EntradaDinheiro id={ids.valor} valor={valor} aoMudar={setValor} invalido={!!erros.valor} />
            </Campo>
          </div>

          {tipo === 'variavel' && (
            <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
              <Alternador
                rotulo="Compra parcelada"
                descricao="Cada parcela entra no dia 1º de um mês, a partir do mês da compra."
                ligado={parcelado}
                aoMudar={setParcelado}
              />
              {parcelado && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[120px]">
                    <Campo rotulo="Parcelas" htmlFor={ids.parcelas} erro={erros.parcelas}>
                      <Entrada
                        id={ids.parcelas}
                        type="number"
                        inputMode="numeric"
                        min={2}
                        max={120}
                        value={parcelas}
                        onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        invalido={!!erros.parcelas}
                      />
                    </Campo>
                  </div>
                  {previa && (
                    <p className="f-num pb-3 text-[14px] font-semibold">
                      {n}× de {formatarValor(previa.padrao)}
                      {previa.primeira !== previa.padrao && (
                        <span className="block text-[12.5px] font-normal text-suave">1ª parcela: {formatarValor(previa.primeira)}</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Campo rotulo="Descrição" htmlFor={ids.desc} ajuda="Se ficar em branco, usamos o nome da categoria.">
            <Entrada
              id={ids.desc}
              value={descricao}
              maxLength={80}
              placeholder={tipo === 'receita' ? 'Ex.: Salário, Freela' : tipo === 'fixa' ? 'Ex.: Aluguel, Internet' : 'Ex.: Mercado, Farmácia'}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>

          <SeletorCategoria
            categorias={dados.categorias}
            natureza={natureza}
            valor={categoriaId}
            aoMudar={setCategoriaId}
            aoCriar={(nome) => criarCategoria(natureza, nome)}
            rotulo={natureza === 'receita' ? 'De onde vem' : 'Categoria'}
            erro={erros.categoria}
          />

          {tipo === 'receita' && !editando && (
            <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
              <Alternador
                rotulo="Repete todo mês"
                descricao="Aparece de novo nos meses seguintes, no mesmo dia."
                ligado={repetir}
                aoMudar={(v) => {
                  setRepetir(v);
                  if (v) setPrevista(false);
                }}
              />
              <div className="border-t border-borda" />
              <Alternador
                rotulo="Ainda vou receber"
                descricao="Fica em “a receber” e só entra na receita quando você confirmar."
                ligado={prevista}
                aoMudar={(v) => {
                  setPrevista(v);
                  if (v) setRepetir(false);
                }}
              />
            </div>
          )}

          {editando && item?.tipo === 'receita-prevista' && item.lancamentoId && (
            <Alternador
              rotulo="Já recebi"
              descricao="Marcada como recebida, ela passa a contar na receita do mês."
              ligado={!!item.prevista?.recebida}
              aoMudar={(v) => (v ? marcarRecebida(item.lancamentoId!) : desmarcarRecebida(item.lancamentoId!))}
            />
          )}

          {ehRecorrente && (
            <Nota icone="arrow-clockwise">
              {editando
                ? `As mudanças valem de ${nomeMes(mes)} em diante; os meses anteriores ficam como estão.`
                : 'Vale deste mês em diante: aparece todo mês, no mesmo dia, até você excluir.'}
            </Nota>
          )}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>

      <Confirmacao
        aberto={confirmarExcluir}
        aoFechar={() => setConfirmarExcluir(false)}
        titulo={item?.recorrenteId && recorrenteInicio && mes > recorrenteInicio ? `Excluir de ${nomeMes(mes)} em diante?` : 'Excluir lançamento?'}
        texto={textoExcluir}
        rotuloConfirmar="Excluir"
        perigo
        aoConfirmar={excluir}
      />
    </>
  );
}
