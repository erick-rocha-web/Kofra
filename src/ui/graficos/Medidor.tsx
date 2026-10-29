import { formatarPct, formatarValor, OCULTO } from '../../engine/formato';
import { useOculto } from '../base';

export interface ParteMedidor {
  rotulo: string;
  valor: number;
  pct: number;
  cor: string;
}

/** Barra 100% com duas partes (no lugar de uma rosca de 2 fatias), com os valores ao lado. */
export function Medidor({ partes, titulo }: { partes: ParteMedidor[]; titulo: string }) {
  const oculto = useOculto();
  const total = partes.reduce((s, p) => s + Math.max(0, p.valor), 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-surface2"
        role="img"
        aria-label={`${titulo}: ${partes.map((p) => `${p.rotulo} ${formatarPct(p.pct, 1)}`).join(', ')}`}
      >
        {partes.map((p) =>
          p.valor > 0 ? (
            <div key={p.rotulo} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${total ? (p.valor / total) * 100 : 0}%`, background: p.cor }} />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2 xs:grid-cols-2">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-start gap-2.5 rounded-xl bg-surface2 px-3 py-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.cor }} />
            <span className="min-w-0">
              <span className="block text-[12.5px] text-suave">{p.rotulo}</span>
              <span className="f-valor block text-[16px]">{oculto ? `R$ ${OCULTO}` : formatarValor(p.valor)}</span>
              <span className="f-num block text-[12.5px] font-semibold text-suave">{formatarPct(p.pct, 1)} do total</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
