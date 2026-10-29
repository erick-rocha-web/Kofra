import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { MesFluxo } from '../../engine/visaoGeral';
import { nomeMes } from '../../engine/datas';
import { formatarValor, OCULTO } from '../../engine/formato';
import { COR_SERIE } from '../cores';
import { useOculto } from '../base';

const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

const SERIES = [
  { chave: 'receita', rotulo: 'Receita', cor: COR_SERIE.receita, tipo: 'barra' },
  { chave: 'gastos', rotulo: 'Gastos', cor: COR_SERIE.gastos, tipo: 'barra' },
  { chave: 'saldo', rotulo: 'Saldo', cor: 'var(--text)', tipo: 'linha' },
] as const;

function Dica({ active, payload, label }: TooltipProps<number, string>) {
  const oculto = useOculto();
  if (!active || !payload?.length) return null;
  const linha = payload[0].payload as MesFluxo & { rotulo: string };
  return (
    <div className="min-w-[180px] rounded-xl border border-borda bg-surface px-3 py-2.5 text-[13px]" style={{ boxShadow: 'var(--shadow)' }}>
      <p className="mb-1.5 font-semibold capitalize">{label ? nomeMes(String(label)) : ''}</p>
      {SERIES.map((s) => (
        <div key={s.chave} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-suave">
            <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: s.cor }} />
            {s.rotulo}
          </span>
          <span className="f-valor">{oculto ? OCULTO : formatarValor(linha[s.chave])}</span>
        </div>
      ))}
    </div>
  );
}

/** Receita e gastos por mês (colunas) com o saldo (linha), no mesmo eixo em reais. */
export function GraficoFluxo({ meses, altura = 240 }: { meses: MesFluxo[]; altura?: number }) {
  const oculto = useOculto();
  const dados = meses.map((m) => ({ ...m, rotulo: m.mes }));
  const muitos = meses.length > 6;
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-suave" aria-label="Legenda">
        {SERIES.map((s) => (
          <li key={s.chave} className="flex items-center gap-1.5">
            <span
              className={s.tipo === 'linha' ? 'inline-block h-[3px] w-3.5 rounded-full' : 'inline-block h-2.5 w-2.5 rounded-[3px]'}
              style={{ background: s.cor }}
            />
            {s.rotulo}
          </li>
        ))}
      </ul>
      <div style={{ height: altura }} role="img" aria-label="Gráfico mensal de receita, gastos e saldo; os valores estão na tabela abaixo.">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barGap={2} barCategoryGap={muitos ? '22%' : '30%'}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="rotulo"
              tickFormatter={(m: string) => nomeMes(m, muitos ? 'sigla' : 'curto')}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              width={oculto ? 8 : 52}
              tick={oculto ? false : { fill: 'var(--muted)', fontSize: 12 }}
              tickFormatter={(v: number) => COMPACTO.format(v / 100)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<Dica />} cursor={{ fill: 'var(--surface2)' }} wrapperStyle={{ outline: 'none', zIndex: 5 }} />
            <Bar dataKey="receita" name="Receita" fill={COR_SERIE.receita} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="gastos" name="Gastos" fill={COR_SERIE.gastos} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Line
              dataKey="saldo"
              name="Saldo"
              type="linear"
              stroke="var(--text)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--text)', stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--text)', stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
