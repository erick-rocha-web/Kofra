import { Fragment, type ReactNode } from 'react';

/** **negrito** dentro de uma linha. */
function emLinha(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
      <strong key={i} className="font-semibold text-texto">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

/**
 * Markdown mínimo e seguro (sem HTML): parágrafos, "## títulos", listas "- " e "1.", **negrito**.
 * Usado nas aulas e nas respostas do assistente.
 */
export function TextoRico({ texto, className }: { texto: string; className?: string }) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const blocos: ReactNode[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      blocos.push(<p key={`p${blocos.length}`}>{emLinha(paragrafo.join(' '))}</p>);
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      const Tag = lista.ordenada ? 'ol' : 'ul';
      blocos.push(
        <Tag key={`l${blocos.length}`} className={lista.ordenada ? 'list-decimal' : undefined}>
          {lista.itens.map((it, i) => (
            <li key={i}>{emLinha(it)}</li>
          ))}
        </Tag>,
      );
      lista = null;
    }
  };

  for (const bruta of linhas) {
    const l = bruta.trim();
    if (!l) {
      fecharParagrafo();
      fecharLista();
      continue;
    }
    const titulo = l.match(/^#{1,3}\s+(.*)$/);
    const item = l.match(/^[-*•]\s+(.*)$/);
    const num = l.match(/^\d+[.)]\s+(.*)$/);
    if (titulo) {
      fecharParagrafo();
      fecharLista();
      blocos.push(<h2 key={`h${blocos.length}`}>{emLinha(titulo[1])}</h2>);
    } else if (item || num) {
      fecharParagrafo();
      const ordenada = !!num;
      if (!lista || lista.ordenada !== ordenada) {
        fecharLista();
        lista = { ordenada, itens: [] };
      }
      lista.itens.push((item ?? num)![1]);
    } else {
      fecharLista();
      paragrafo.push(l);
    }
  }
  fecharParagrafo();
  fecharLista();
  return <div className={className ?? 'texto-aula'}>{blocos}</div>;
}
