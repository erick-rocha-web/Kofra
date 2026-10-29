import { useEffect, useId, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI, type Rota } from '../../estado/ui';
import { excluirAula, marcarAulaLida, restaurarAulasPadrao, salvarAula } from '../../estado/acoesAprender';
import { Pagina } from '../../layout/Pagina';
import type { Aula } from '../../storage/tipos';
import { AreaTexto, Botao, Campo, Entrada, EstadoVazio, Selo } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Confirmacao, Modal } from '../../ui/Modal';
import { TextoRico } from '../../ui/TextoRico';

function EditorAula({ aberto, aoFechar, aula, aoSalvar }: { aberto: boolean; aoFechar: () => void; aula: Aula | null; aoSalvar?: (id: string) => void }) {
  const { avisar } = useUI();
  const ids = { titulo: useId(), resumo: useId(), corpo: useId() };
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!aberto) return;
    setTitulo(aula?.titulo ?? '');
    setResumo(aula?.resumo ?? '');
    setCorpo(aula?.corpo ?? '');
    setErro(null);
  }, [aberto, aula]);
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={aula ? 'Editar aula' : 'Nova aula'}
      largura="lg"
      fecharClicandoFora={false}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              if (!titulo.trim() || !corpo.trim()) return setErro('A aula precisa de título e texto.');
              const id = salvarAula(aula?.id ?? null, { titulo: titulo.trim(), resumo: resumo.trim(), corpo });
              avisar(aula ? 'Aula atualizada.' : 'Aula criada.');
              aoFechar();
              aoSalvar?.(id);
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Título" htmlFor={ids.titulo} erro={erro}>
          <Entrada id={ids.titulo} value={titulo} maxLength={90} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Resumo" htmlFor={ids.resumo} ajuda="Uma frase que aparece na lista de aulas.">
          <Entrada id={ids.resumo} value={resumo} maxLength={140} onChange={(e) => setResumo(e.target.value)} />
        </Campo>
        <Campo
          rotulo="Texto"
          htmlFor={ids.corpo}
          ajuda="Deixe uma linha em branco entre parágrafos. Use “## ” no começo da linha para um subtítulo e “- ” para itens de lista."
        >
          <AreaTexto id={ids.corpo} rows={14} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}

export function Aprender() {
  const { aulas } = useDados();
  const { navegar, avisar } = useUI();
  const [nova, setNova] = useState(false);
  const ordenadas = [...aulas].sort((a, b) => a.ordem - b.ordem);
  const lidas = ordenadas.filter((a) => a.lidaEm).length;

  return (
    <Pagina
      titulo="Aprender"
      acoes={
        <Botao tamanho="sm" variante="secundario" icone="plus" onClick={() => setNova(true)}>
          Nova aula
        </Botao>
      }
      estreita
    >
      {ordenadas.length ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13.5px] text-suave">
            {lidas} de {ordenadas.length} {ordenadas.length === 1 ? 'aula lida' : 'aulas lidas'}. Os textos são seus: dá para editar, apagar e criar novas aulas.
          </p>
          <ol className="flex flex-col gap-3">
            {ordenadas.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => navegar(a.id as Rota)}
                  className="cartao flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-surface2"
                >
                  <span className="f-valor inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-marca-suave text-[18px] text-marca">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="f-titulo block text-[17px] leading-[23px]">{a.titulo}</span>
                    {a.resumo && <span className="mt-1 block text-[14px] text-suave">{a.resumo}</span>}
                  </span>
                  {a.lidaEm ? (
                    <Selo tom="receita" icone="check">
                      Lida
                    </Selo>
                  ) : (
                    <Icone nome="caret-right" tamanho={15} className="mt-1 text-suave" />
                  )}
                </button>
              </li>
            ))}
          </ol>
          {['aula-1', 'aula-2', 'aula-3'].some((id) => !ordenadas.some((a) => a.id === id)) && (
            <button
              type="button"
              className="self-start text-[13px] font-semibold text-marca hover:underline"
              onClick={() => {
                const n = restaurarAulasPadrao();
                avisar(`${n} ${n === 1 ? 'aula restaurada' : 'aulas restauradas'}.`);
              }}
            >
              Restaurar aulas de exemplo apagadas
            </button>
          )}
        </div>
      ) : (
        <div className="cartao">
          <EstadoVazio
            icone="book-open"
            titulo="Nenhuma aula por aqui"
            acoes={
              <Botao
                variante="primario"
                onClick={() => {
                  const n = restaurarAulasPadrao();
                  avisar(`${n} ${n === 1 ? 'aula restaurada' : 'aulas restauradas'}.`);
                }}
              >
                Restaurar aulas de exemplo
              </Botao>
            }
          />
        </div>
      )}
      <EditorAula aberto={nova} aoFechar={() => setNova(false)} aula={null} aoSalvar={(id) => navegar(id as Rota)} />
    </Pagina>
  );
}

export function PaginaAula({ id }: { id: string }) {
  const { aulas } = useDados();
  const { navegar, avisar } = useUI();
  const [editar, setEditar] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const ordenadas = [...aulas].sort((a, b) => a.ordem - b.ordem);
  const i = ordenadas.findIndex((a) => a.id === id);
  const aula = ordenadas[i];
  const proxima = ordenadas[i + 1];

  if (!aula) {
    return (
      <Pagina titulo="Aula" voltarPara="aprender" rotuloVoltar="Voltar às aulas" estreita>
        <div className="cartao">
          <EstadoVazio icone="book-open" titulo="Aula não encontrada" acoes={<Botao onClick={() => navegar('aprender')}>Ver todas as aulas</Botao>} />
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina
      titulo={`Aula ${i + 1}`}
      voltarPara="aprender"
      rotuloVoltar="Voltar às aulas"
      estreita
      acoes={
        <Botao tamanho="sm" variante="fantasma" icone="pencil-simple" onClick={() => setEditar(true)}>
          Editar
        </Botao>
      }
    >
      <article className="cartao p-6 sm:p-8">
        <h2 className="f-titulo text-[26px] leading-[32px] sm:text-[30px] sm:leading-[36px]">{aula.titulo}</h2>
        {aula.resumo && <p className="mt-2 text-[15px] text-suave">{aula.resumo}</p>}
        <div className="mt-6 max-w-[66ch] text-[15.5px] leading-[26px]">
          <TextoRico texto={aula.corpo} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-borda pt-5">
          <Botao
            variante={aula.lidaEm ? 'secundario' : 'primario'}
            icone={aula.lidaEm ? 'arrow-counter-clockwise' : 'check'}
            onClick={() => {
              marcarAulaLida(aula.id, !aula.lidaEm);
              if (!aula.lidaEm) avisar('Aula marcada como lida.');
            }}
          >
            {aula.lidaEm ? 'Marcar como não lida' : 'Marcar como lida'}
          </Botao>
          {proxima && (
            <Botao variante="secundario" iconeDireita="arrow-right" onClick={() => navegar(proxima.id as Rota)}>
              Próxima aula
            </Botao>
          )}
          <Botao variante="fantasma" icone="trash" className="ml-auto" onClick={() => setExcluir(true)}>
            Apagar aula
          </Botao>
        </div>
      </article>
      <EditorAula aberto={editar} aoFechar={() => setEditar(false)} aula={aula} />
      <Confirmacao
        aberto={excluir}
        aoFechar={() => setExcluir(false)}
        titulo="Apagar esta aula?"
        perigo
        rotuloConfirmar="Apagar"
        texto="As aulas de exemplo podem ser restauradas depois; uma aula criada por você some de vez."
        aoConfirmar={() => {
          excluirAula(aula.id);
          avisar('Aula apagada.');
          navegar('aprender');
        }}
      />
    </Pagina>
  );
}
