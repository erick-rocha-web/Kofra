import { useMemo, useState } from 'react';
import type { Categoria, NaturezaCategoria } from '../storage/tipos';
import { ICONES_CATEGORIA } from './icones';
import { Icone } from './Icone';
import { NOMES_COR, SLOTS_COR, corVar, type SlotCor } from './cores';
import { Botao, Campo, Entrada, cx } from './base';
import { normalizar } from '../engine/formato';

/** Círculo cheio na cor da categoria com o ícone em branco (preto sobre o amarelo). */
export function IconeCategoria({ icone, cor, tamanho = 36 }: { icone: string; cor: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        background: corVar(cor),
        color: cor === 'c4' ? 'var(--on-cat-4)' : '#ffffff',
      }}
    >
      <Icone nome={icone} tamanho={Math.round(tamanho * 0.5)} />
    </span>
  );
}

export function SeletorCor({ valor, aoMudar, rotulo = 'Cor' }: { valor: string; aoMudar: (c: SlotCor) => void; rotulo?: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {SLOTS_COR.map((s) => {
        const ativo = s === valor;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={NOMES_COR[s]}
            title={NOMES_COR[s]}
            onClick={() => aoMudar(s)}
            className={cx(
              'inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
              ativo ? 'border-texto' : 'border-transparent',
            )}
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: corVar(s), color: s === 'c4' ? 'var(--on-cat-4)' : '#fff' }}
            >
              {ativo && <Icone nome="check" tamanho={14} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SeletorIcone({ valor, aoMudar, cor }: { valor: string; aoMudar: (i: string) => void; cor: string }) {
  return (
    <div role="radiogroup" aria-label="Ícone" className="rolagem-fina grid max-h-[176px] grid-cols-7 gap-1.5 overflow-y-auto pr-1 xs:grid-cols-8">
      {ICONES_CATEGORIA.map((i) => {
        const ativo = i === valor;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={i}
            onClick={() => aoMudar(i)}
            className={cx(
              'inline-flex aspect-square items-center justify-center rounded-xl transition-colors',
              ativo ? '' : 'text-suave hover:bg-surface2 hover:text-texto',
            )}
            style={ativo ? { background: corVar(cor), color: cor === 'c4' ? 'var(--on-cat-4)' : '#fff' } : undefined}
          >
            <Icone nome={i} tamanho={19} />
          </button>
        );
      })}
    </div>
  );
}

/** Escolha de categoria em "chips"; permite criar uma nova ali mesmo. */
export function SeletorCategoria({
  categorias,
  natureza,
  valor,
  aoMudar,
  aoCriar,
  rotulo,
  erro,
}: {
  categorias: Categoria[];
  natureza: NaturezaCategoria;
  valor: string | null;
  aoMudar: (id: string) => void;
  aoCriar: (nome: string) => string;
  rotulo: string;
  erro?: string | null;
}) {
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const lista = useMemo(
    () =>
      categorias
        .filter((c) => c.natureza === natureza && (!c.arquivada || c.id === valor))
        .sort((a, b) => a.ordem - b.ordem),
    [categorias, natureza, valor],
  );
  const existe = lista.some((c) => normalizar(c.nome) === normalizar(nome));

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold leading-[18px]">{rotulo}</legend>
      <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-1.5">
        {lista.map((c) => {
          const ativo = c.id === valor;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(c.id)}
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-[13px] font-medium transition-colors',
                ativo ? 'border-marca bg-marca-suave font-semibold' : 'border-borda hover:bg-surface2',
              )}
            >
              <IconeCategoria icone={c.icone} cor={c.cor} tamanho={26} />
              {c.nome}
            </button>
          );
        })}
        {!criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-borda px-3 text-[13px] font-semibold text-marca hover:bg-marca-suave"
          >
            <Icone nome="plus" tamanho={14} /> Nova
          </button>
        )}
      </div>
      {criando && (
        <div className="mt-1 flex flex-wrap items-end gap-2 rounded-2xl bg-surface2 p-3">
          <div className="min-w-[160px] flex-1">
            <Campo rotulo="Nome da nova categoria" htmlFor={`nova-cat-${natureza}`} erro={existe ? 'Já existe uma categoria com esse nome.' : null}>
              <Entrada
                id={`nova-cat-${natureza}`}
                value={nome}
                maxLength={30}
                autoFocus
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nome.trim() && !existe) {
                      aoMudar(aoCriar(nome.trim()));
                      setNome('');
                      setCriando(false);
                    }
                  }
                }}
              />
            </Campo>
          </div>
          <Botao variante="fantasma" onClick={() => setCriando(false)}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            disabled={!nome.trim() || existe}
            onClick={() => {
              aoMudar(aoCriar(nome.trim()));
              setNome('');
              setCriando(false);
            }}
          >
            Criar
          </Botao>
        </div>
      )}
      {erro && (
        <p className="text-[12.5px] font-medium text-despesa" role="alert">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
