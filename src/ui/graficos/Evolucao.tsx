import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { formatarValor, OCULTO } from '../../engine/formato';
import { useOculto } from '../base';

const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

interface Ponto {
  rotulo: string;
  investido: number;
  acumulado: number;
}

function Dica({ active, payload, label }: TooltipProps<number, string>) {
  const oculto = useOculto();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Ponto;
  return (
    <div className="min-w-[190px] rounded-xl border border-borda bg-surface px-3 py-2.5 text-[13px]" style={{ boxShadow: 'var(--shadow)' }}>
      <p className="mb-1.5 font-semibold">{label}</p>
      {[
        { r: 'Total acumulado', v: p.acumulado, cor: 'var(--brand)' },
        { r: 'Total investido', v: p.investido, cor: 'var(--cat-0)' },
        { r: 'Juros', v: p.acumulado - p.investido, cor: 'transparent' },
      ].map((s) => (
        <div key={s.r} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-suave">
            <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: s.cor }} />
            {s.r}
          </span>
          <span className="f-valor">{oculto ? OCULTO : formatarValor(s.v)}</span>
        </div>
      ))}
    </div>
  );
}

/** Evolução do total acumulado contra o total investido (mesmo eixo, em reais). */
export function GraficoEvolucao({ pontos, altura = 260 }: { pontos: Ponto[]; altura?: number }) {
  const oculto = useOculto();
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-suave" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: 'var(--brand)' }} />
          Total acumulado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: 'var(--cat-0)' }} />
          Total investido
        </li>
      </ul>
      <div style={{ height: altura }} role="img" aria-label="Evolução do total acumulado e do total investido; os valores estão na tabela mês a mês.">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis dataKey="rotulo" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
            <YAxis
              width={oculto ? 8 : 56}
              tick={oculto ? false : { fill: 'var(--muted)', fontSize: 12 }}
              tickFormatter={(v: number) => COMPACTO.format(v / 100)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<Dica />} cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }} wrapperStyle={{ outline: 'none', zIndex: 5 }} />
            <Area dataKey="acumulado" type="linear" stroke="var(--brand)" strokeWidth={2} fill="var(--brand)" fillOpacity={0.1} isAnimationActive={false} dot={false} activeDot={{ r: 5, fill: 'var(--brand)', stroke: 'var(--surface)', strokeWidth: 2 }} />
            <Line dataKey="investido" type="linear" stroke="var(--cat-0)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 5, fill: 'var(--cat-0)', stroke: 'var(--surface)', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
