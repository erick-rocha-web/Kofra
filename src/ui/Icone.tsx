import { memo } from 'react';
import { ICONES, type NomeIcone } from './icones';

interface Props {
  nome: NomeIcone | string;
  tamanho?: number;
  className?: string;
  titulo?: string;
}

/** Ícone Phosphor (Bold) desenhado em SVG, na cor do texto atual. */
export const Icone = memo(function Icone({ nome, tamanho = 18, className, titulo }: Props) {
  const corpo = (ICONES as Record<string, string>)[nome] ?? ICONES['circle-dashed'];
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
      style={{ flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: corpo }}
    />
  );
});
