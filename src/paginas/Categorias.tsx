import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../estado/loja';
import { useUI } from '../estado/ui';
import {
  criarCategoria,
  editarCategoria,
  excluirCategoria,
  nomeCategoriaExiste,
  usosDaCategoria,
} from '../estado/acoesOrcamento';
import { Pagina } from '../layout/Pagina';
import type { Categoria, NaturezaCategoria } from '../storage/tipos';
import { Botao, BotaoIcone, Campo, Entrada, Segmentado, Selecao } from '../ui/base';
import { IconeCategoria, SeletorCor, SeletorIcone } from '../ui/categoria';
import { Icone } from '../ui/Icone';
import { Confirmacao, Modal } from '../ui/Modal';

function FormCategoria({
  aberto,
  aoFechar,
  natureza,
  categoria,
}: {
  aberto: boolean;
  aoFechar: () => void;
  natureza: NaturezaCategoria;
  categoria: Categoria | null;
}) {
  const { avisar } = useUI();
  const id = useId();
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('tag');
  const [cor, setCor] = useState('c1');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!aberto) return;
    setNome(categoria?.nome ?? '');
    setIcone(categoria?.icone ?? (natureza === 'receita' ? 'coins' : 'tag'));
    setCor(categoria?.cor ?? 'c1');
    setErro(null);
  }, [aberto, categoria, natureza]);

  const salvar = () => {
    const n = nome.trim();
    if (!n) return setErro('Dê um nome para a categoria.');
    if (nomeCategoriaExiste(natureza, n, categoria?.id)) return setErro('Já existe uma categoria com esse nome.');
    if (categoria) editarCategoria(categoria.id, { nome: n, icone, cor });
    else criarCategoria(natureza, n, icone, cor);
    avisar(categoria ? 'Categoria atualizada.' : 'Categoria criada.');
    aoFechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={categoria ? 'Editar categoria' : natureza === 'receita' ? 'Novo tipo de renda' : 'Nova categoria'}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" onClick={salvar}>
            {categoria ? 'Salvar' : 'Criar'}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-3">
          <IconeCategoria icone={icone} cor={cor} tamanho={46} />
          <div className="min-w-0 flex-1">
            <Campo rotulo="Nome" htmlFor={id} erro={erro}>
              <Entrada id={id} value={nome} maxLength={30} onChange={(e) => setNome(e.target.value)} invalido={!!erro} />
            </Campo>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Cor</span>
          <SeletorCor valor={cor} aoMudar={setCor} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Ícone</span>
          <SeletorIcone valor={icone} aoMudar={setIcone} cor={cor} />
        </div>
      </div>
    </Modal>
  );
}

export function Categorias() {
  const { categorias } = useDados();
  const { avisar } = useUI();
  const [natureza, setNatureza] = useState<NaturezaCategoria>('despesa');
  const [editar, setEditar] = useState<Categoria | null | 'nova'>(null);
  const [excluir, setExcluir] = useState<Categoria | null>(null);
  const [destino, setDestino] = useState('');
  const idDestino = useId();

  const lista = useMemo(() => categorias.filter((c) => c.natureza === natureza).sort((a, b) => a.ordem - b.ordem), [categorias, natureza]);
  const ativas = lista.filter((c) => !c.arquivada);
  const arquivadas = lista.filter((c) => c.arquivada);
  const usos = excluir ? usosDaCategoria(excluir.id) : 0;

  useEffect(() => {
    if (excluir) setDestino(lista.find((c) => c.id !== excluir.id && !c.arquivada)?.id ?? '');
  }, [excluir, lista]);

  const linha = (c: Categoria) => (
    <li key={c.id} className="flex items-center gap-3 border-t border-borda px-4 py-3 first:border-t-0">
      <IconeCategoria icone={c.icone} cor={c.cor} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{c.nome}</p>
        <p className="text-[12.5px] text-suave">
          {(() => {
            const n = usosDaCategoria(c.id);
            return n ? `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}` : 'Sem lançamentos';
          })()}
        </p>
      </div>
      <BotaoIcone icone="pencil-simple" rotulo={`Editar ${c.nome}`} variante="fantasma" tamanho={34} onClick={() => setEditar(c)} />
      <BotaoIcone
        icone={c.arquivada ? 'arrow-counter-clockwise' : 'archive'}
        rotulo={c.arquivada ? `Reativar ${c.nome}` : `Arquivar ${c.nome}`}
        variante="fantasma"
        tamanho={34}
        onClick={() => {
          editarCategoria(c.id, { arquivada: !c.arquivada });
          avisar(c.arquivada ? 'Categoria reativada.' : 'Categoria arquivada: ela some das opções, mas os lançamentos ficam.');
        }}
      />
      <BotaoIcone icone="trash" rotulo={`Excluir ${c.nome}`} variante="perigo" tamanho={34} onClick={() => setExcluir(c)} />
    </li>
  );

  return (
    <Pagina titulo="Categorias" voltarPara="orcamento" rotuloVoltar="Voltar ao Orçamento" estreita>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmentado<NaturezaCategoria>
            rotulo="Tipo de categoria"
            valor={natureza}
            aoMudar={setNatureza}
            opcoes={[
              { valor: 'despesa', rotulo: 'Despesas' },
              { valor: 'receita', rotulo: 'Fontes de renda' },
            ]}
          />
          <Botao variante="primario" icone="plus" onClick={() => setEditar('nova')}>
            {natureza === 'receita' ? 'Novo tipo de renda' : 'Nova categoria'}
          </Botao>
        </div>
        <section className="cartao overflow-hidden">
          <ul>{ativas.map(linha)}</ul>
        </section>
        {arquivadas.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="rotulo-secao flex items-center gap-2">
              <Icone nome="archive" tamanho={14} /> Arquivadas
            </h2>
            <div className="cartao overflow-hidden opacity-80">
              <ul>{arquivadas.map(linha)}</ul>
            </div>
          </section>
        )}
      </div>

      <FormCategoria
        aberto={editar !== null}
        aoFechar={() => setEditar(null)}
        natureza={natureza}
        categoria={editar === 'nova' ? null : editar}
      />

      <Confirmacao
        aberto={!!excluir}
        aoFechar={() => setExcluir(null)}
        titulo={`Excluir “${excluir?.nome ?? ''}”?`}
        perigo
        rotuloConfirmar={usos ? 'Mover e excluir' : 'Excluir'}
        texto={
          usos ? (
            <div className="flex flex-col gap-3">
              <p>
                Esta categoria tem {usos} {usos === 1 ? 'lançamento' : 'lançamentos'}. Escolha para onde eles vão. Se preferir manter tudo como está,
                arquive em vez de excluir.
              </p>
              <Campo rotulo="Mover lançamentos para" htmlFor={idDestino}>
                <Selecao id={idDestino} value={destino} onChange={(e) => setDestino(e.target.value)}>
                  {lista
                    .filter((c) => c.id !== excluir?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.arquivada ? ' (arquivada)' : ''}
                      </option>
                    ))}
                </Selecao>
              </Campo>
            </div>
          ) : (
            'Ela não tem lançamentos, então nada mais muda.'
          )
        }
        aoConfirmar={() => {
          if (!excluir) return;
          if (usos && !destino) return;
          excluirCategoria(excluir.id, usos ? destino : undefined);
          avisar('Categoria excluída.');
        }}
      />
    </Pagina>
  );
}
