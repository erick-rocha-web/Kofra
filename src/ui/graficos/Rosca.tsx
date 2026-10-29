import { Cell, Pie, PieChart, Tooltip, type TooltipProps } from 'recharts';
import { formatarPct, formatarValor, OCULTO } from '../../engine/formato';
import { porcentagem } from '../../engine/dinheiro';
import { useOculto } from '../base';

export interface Fatia {
  id: string;
  rotulo: string;
  valor: number;
  cor: string;
}

/** Junta a cauda em "Outras" para a rosca ter no máximo `max` fatias. */
export function agruparFatias(fatias: Fatia[], max = 6, rotuloOutras = 'Outras'): Fatia[] {
  const ordenadas = [...fatias].filter((f) => f.valor > 0).sort((a, b) => b.valor - a.valor);
  if (ordenadas.length <= max) return ordenadas;
  const topo = ordenadas.slice(0, max - 1);
  const resto = ordenadas.slice(max - 1).reduce((s, f) => s + f.valor, 0);
  return [...topo, { id: '__outras', rotulo: rotuloOutras, valor: resto, cor: 'var(--cat-0)' }];
}

function DicaRosca({ active, payload, total }: TooltipProps<number, string> & { total: number }) {
  const oculto = useOculto();
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const valor = Number(p.value ?? 0);
  const pct = porcentagem(valor, total, 0) ?? 0;
  const cor = (p.payload as Fatia | undefined)?.cor;
  return (
    <div className="rounded-xl border border-borda bg-surface px-3 py-2 text-[13px]" style={{ boxShadow: 'var(--shadow)' }}>
      <div className="f-valor text-[15px]">{oculto ? `R$ ${OCULTO}` : formatarValor(valor)}</div>
      <div className="mt-0.5 flex items-center gap-2 text-suave">
        <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: cor }} />
        <span>{String(p.name)}</span>
        <span className="f-num">· {formatarPct(pct)}</span>
      </div>
    </div>
  );
}

/** Rosca grossa (parte do todo, até 6 fatias) com o total no centro. */
export function Rosca({
  fatias,
  tamanho = 200,
  espessura = 20,
  rotuloCentro,
  rotuloAcessivel,
}: {
  fatias: Fatia[];
  tamanho?: number;
  espessura?: number;
  rotuloCentro: string;
  rotuloAcessivel: string;
}) {
  const oculto = useOculto();
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const raio = tamanho / 2 - 4;
  const vazio = total <= 0;
  const dados = vazio ? [{ id: 'vazio', rotulo: 'Sem dados', valor: 1, cor: 'var(--surface2)' }] : fatias;

  return (
    <div className="relative mx-auto shrink-0" style={{ width: tamanho, height: tamanho }} role="img" aria-label={rotuloAcessivel}>
      {/* O nome acessível está no contêiner; o SVG do gráfico é só desenho. Os ids das fatias não vão para o DOM. */}
      <div aria-hidden="true">
      <PieChart width={tamanho} height={tamanho}>
        <Pie
          data={dados.map(({ id: _id, ...resto }) => resto)}
          dataKey="valor"
          nameKey="rotulo"
          cx="50%"
          cy="50%"
          innerRadius={raio - espessura}
          outerRadius={raio}
          startAngle={90}
          endAngle={-270}
          paddingAngle={dados.length > 1 ? 1.6 : 0}
          cornerRadius={dados.length > 1 ? 4 : 0}
          stroke="none"
          isAnimationActive={false}
          rootTabIndex={-1}
        >
          {dados.map((f) => (
            <Cell key={f.id} fill={f.cor} />
          ))}
        </Pie>
        {!vazio && <Tooltip content={<DicaRosca total={total} />} wrapperStyle={{ zIndex: 5, outline: 'none' }} />}
      </PieChart>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="f-valor text-[18px] leading-[22px]">
          {oculto ? `R$ ${OCULTO}` : formatarValor(total, { semCentavos: total >= 1_000_000 })}
        </span>
        <span className="mt-0.5 text-[12px] text-suave">{rotuloCentro}</span>
      </div>
    </div>
  );
}

/** Lista que acompanha a rosca: o "modo tabela" com todos os valores. */
export function LegendaRosca({
  itens,
  total,
  aoClicar,
}: {
  itens: { id: string; rotulo: string; valor: number; cor: string; extra?: string }[];
  total: number;
  aoClicar?: (id: string) => void;
}) {
  const oculto = useOculto();
  return (
    <ul className="flex flex-col">
      {itens.map((i) => {
        const pct = porcentagem(i.valor, total, 0) ?? 0;
        const conteudo = (
          <>
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.cor }} />
            <span className="min-w-0 flex-1 truncate text-left">
              {i.rotulo}
              {i.extra && <span className="text-suave"> · {i.extra}</span>}
            </span>
            <span className="f-num w-11 shrink-0 text-right text-[13px] font-semibold text-suave">{formatarPct(pct)}</span>
            <span className="f-num w-[104px] shrink-0 text-right font-semibold">
              {oculto ? `R$ ${OCULTO}` : formatarValor(i.valor)}
            </span>
          </>
        );
        return (
          <li key={i.id} className="border-t border-borda first:border-t-0">
            {aoClicar ? (
              <button type="button" onClick={() => aoClicar(i.id)} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2.5 text-[13.5px] hover:bg-surface2">
                {conteudo}
              </button>
            ) : (
              <div className="flex items-center gap-2.5 px-1 py-2.5 text-[13.5px]">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
