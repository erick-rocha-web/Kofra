import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icone } from './Icone';
import { corVar } from './cores';
import { useDados } from '../estado/loja';
import type { Centavos } from '../engine/dinheiro';
import { formatarNumero, formatarValor, OCULTO } from '../engine/formato';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

/* ───────────── Botões ───────────── */

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'perigo-suave' | 'contorno';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-sobre-marca font-bold hover:brightness-110 active:brightness-95',
  secundario: 'bg-surface2 text-texto font-semibold hover:bg-borda',
  fantasma: 'bg-transparent text-suave font-semibold hover:bg-surface2 hover:text-texto',
  perigo: 'bg-despesa text-sobre-marca font-bold hover:brightness-110',
  'perigo-suave': 'bg-despesa-suave text-despesa font-semibold hover:brightness-110',
  contorno: 'bg-transparent text-texto font-semibold border border-borda hover:bg-surface2',
};

const TAMANHOS = {
  sm: 'h-9 px-3 text-[13px] rounded-[10px] gap-1.5',
  md: 'h-[46px] px-[18px] text-[14px] rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-xl gap-2',
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: keyof typeof TAMANHOS;
  icone?: string;
  iconeDireita?: string;
  larguraTotal?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = 'secundario', tamanho = 'md', icone, iconeDireita, larguraTotal, className, children, type = 'button', ...resto },
  ref,
) {
  const tamIcone = tamanho === 'sm' ? 15 : 17;
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,filter,color] disabled:opacity-50 disabled:hover:brightness-100',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraTotal && 'w-full',
        className,
      )}
      {...resto}
    >
      {icone && <Icone nome={icone} tamanho={tamIcone} />}
      {children}
      {iconeDireita && <Icone nome={iconeDireita} tamanho={tamIcone} />}
    </button>
  );
});

export interface BotaoIconeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icone: string;
  rotulo: string;
  variante?: 'superficie' | 'fantasma' | 'primario' | 'perigo';
  tamanho?: 30 | 34 | 38 | 42 | 46;
  redondo?: boolean;
  tamanhoIcone?: number;
}

const VAR_ICONE = {
  superficie: 'bg-surface2 text-texto hover:bg-borda',
  fantasma: 'bg-transparent text-suave hover:bg-surface2 hover:text-texto',
  primario: 'bg-marca text-sobre-marca hover:brightness-110',
  perigo: 'bg-transparent text-suave hover:bg-despesa-suave hover:text-despesa',
};

export const BotaoIcone = forwardRef<HTMLButtonElement, BotaoIconeProps>(function BotaoIcone(
  { icone, rotulo, variante = 'superficie', tamanho = 42, redondo, tamanhoIcone, className, type = 'button', style, ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={cx(
        'inline-flex shrink-0 items-center justify-center transition-[background-color,color,filter] disabled:opacity-40',
        redondo ? 'rounded-full' : tamanho <= 34 ? 'rounded-[10px]' : 'rounded-xl',
        VAR_ICONE[variante],
        className,
      )}
      style={{ width: tamanho, height: tamanho, ...style }}
      {...resto}
    >
      <Icone nome={icone} tamanho={tamanhoIcone ?? Math.round(tamanho * 0.44)} />
    </button>
  );
});

/* ───────────── Estrutura ───────────── */

export function Cartao({
  children,
  className,
  como: Tag = 'section',
  ...resto
}: { children: ReactNode; className?: string; como?: 'section' | 'div' | 'article' } & Record<string, unknown>) {
  return (
    <Tag className={cx('cartao', className)} {...resto}>
      {children}
    </Tag>
  );
}

export function TituloSecao({ children, acoes, id }: { children: ReactNode; acoes?: ReactNode; id?: string }) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-3">
      <h2 id={id} className="f-titulo text-[17px] leading-[22px]">
        {children}
      </h2>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

export type Tom = 'marca' | 'receita' | 'despesa' | 'investimento' | 'neutro' | 'alerta';

const TONS: Record<Tom, string> = {
  marca: 'bg-marca-suave text-marca',
  receita: 'bg-receita-suave text-receita',
  despesa: 'bg-despesa-suave text-despesa',
  investimento: 'bg-investimento-suave text-investimento',
  neutro: 'bg-surface2 text-suave',
  alerta: 'bg-alerta-suave text-alerta',
};

export const COR_TOM: Record<Tom, string> = {
  marca: 'var(--brand)',
  receita: 'var(--pos)',
  despesa: 'var(--neg)',
  investimento: 'var(--inv)',
  neutro: 'var(--neutral)',
  alerta: 'var(--warn)',
};

export function Selo({ tom = 'marca', children, icone }: { tom?: Tom; children: ReactNode; icone?: string }) {
  return (
    <span className={cx('selo', TONS[tom])}>
      {icone && <Icone nome={icone} tamanho={13} />}
      {children}
    </span>
  );
}

/** Círculo com ícone (atalhos, listas). */
export function Medalhao({ icone, tom = 'marca', cor, tamanho = 36 }: { icone: string; tom?: Tom; cor?: string; tamanho?: number }) {
  const estilo: CSSProperties = cor
    ? { width: tamanho, height: tamanho, color: corVar(cor), background: `color-mix(in srgb, ${corVar(cor)} 16%, transparent)` }
    : { width: tamanho, height: tamanho };
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full', !cor && TONS[tom])} style={estilo}>
      <Icone nome={icone} tamanho={Math.round(tamanho * 0.5)} />
    </span>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  texto,
  acoes,
  compacto,
}: {
  icone: string;
  titulo: string;
  texto?: ReactNode;
  acoes?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-center text-center', compacto ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-12')}>
      <span
        className="mb-1 inline-flex items-center justify-center rounded-full bg-marca-suave text-marca"
        style={{ width: compacto ? 44 : 56, height: compacto ? 44 : 56 }}
      >
        <Icone nome={icone} tamanho={compacto ? 22 : 26} />
      </span>
      <p className="f-titulo text-[16px] leading-[22px]">{titulo}</p>
      {texto && <p className="max-w-[44ch] text-[14px] leading-[21px] text-suave">{texto}</p>}
      {acoes && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acoes}</div>}
    </div>
  );
}

export function BarraProgresso({
  valor,
  cor = 'var(--brand)',
  altura = 8,
  rotulo,
}: {
  valor: number;
  cor?: string;
  altura?: number;
  rotulo?: string;
}) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface2"
      style={{ height: altura }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={rotulo}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v}%`, background: cor }} />
    </div>
  );
}

/* ───────────── Valores ───────────── */

export function useOculto(): boolean {
  return useDados().config.ocultarValores;
}

/** Valor em reais, respeitando "ocultar valores". */
export function Valor({
  c,
  sinal,
  semCentavos,
  className,
  style,
  forcarVisivel,
}: {
  c: Centavos;
  sinal?: boolean;
  semCentavos?: boolean;
  className?: string;
  style?: CSSProperties;
  forcarVisivel?: boolean;
}) {
  const oculto = useOculto() && !forcarVisivel;
  return (
    <span className={cx('f-num whitespace-nowrap', className)} style={style}>
      {oculto ? `R$ ${OCULTO}` : formatarValor(c, { sinal, semCentavos })}
    </span>
  );
}

/** Valor grande com o "R$" menor, como no cartão principal. `tamanho` aceita px ou um clamp() em CSS. */
export function ValorGrande({
  c,
  tamanho = 56,
  semCentavos,
  cor,
}: {
  c: Centavos;
  tamanho?: number | string;
  semCentavos?: boolean;
  cor?: string;
}) {
  const oculto = useOculto();
  const neg = c < 0;
  const fonte = typeof tamanho === 'number' ? `${tamanho}px` : tamanho;
  return (
    <span className="flex min-w-0 items-baseline gap-2.5" style={{ color: cor }}>
      <span className="f-valor text-suave" style={{ fontSize: `calc(${fonte} * 0.43)` }}>
        {neg ? '−R$' : 'R$'}
      </span>
      <span className="f-valor min-w-0 truncate" style={{ fontSize: fonte, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'normal' }}>
        {oculto ? OCULTO : formatarNumero(c, semCentavos)}
      </span>
    </span>
  );
}

/* ───────────── Formulários ───────────── */

export function Campo({
  rotulo,
  htmlFor,
  ajuda,
  erro,
  children,
  extra,
}: {
  rotulo: ReactNode;
  htmlFor?: string;
  ajuda?: ReactNode;
  erro?: string | null;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold leading-[18px]">
          {rotulo}
        </label>
        {extra}
      </div>
      {children}
      {erro ? (
        <p className="text-[12.5px] font-medium leading-[18px] text-despesa" role="alert">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-[12.5px] leading-[18px] text-suave">{ajuda}</p>
      ) : null}
    </div>
  );
}

const CLASSE_CAMPO =
  'h-[46px] w-full min-w-0 rounded-xl border bg-campo px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-suave placeholder:opacity-70 focus:border-marca focus:shadow-[0_0_0_3px_var(--ring)] disabled:opacity-60';

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }>(
  function Entrada({ className, invalido, ...resto }, ref) {
    return (
      <input
        ref={ref}
        className={cx(CLASSE_CAMPO, invalido ? 'border-despesa' : 'border-borda', className)}
        aria-invalid={invalido || undefined}
        {...resto}
      />
    );
  },
);

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AreaTexto(
  { className, ...resto },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full min-w-0 rounded-xl border border-borda bg-campo px-3.5 py-3 text-[15px] leading-[22px] outline-none transition-[border-color,box-shadow] placeholder:text-suave focus:border-marca focus:shadow-[0_0_0_3px_var(--ring)]',
        className,
      )}
      {...resto}
    />
  );
});

export function Selecao({
  className,
  children,
  ...resto
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      <select
        className={cx(CLASSE_CAMPO, 'appearance-none border-borda pr-10', className)}
        {...resto}
      >
        {children}
      </select>
      <Icone
        nome="caret-down"
        tamanho={14}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-suave"
      />
    </div>
  );
}

/**
 * Campo de dinheiro com máscara de centavos: digitar 100000 mostra 1.000,00.
 * `valor` em centavos (null = vazio).
 */
export function EntradaDinheiro({
  id,
  valor,
  aoMudar,
  placeholder = '0,00',
  invalido,
  autoFocus,
  disabled,
  ariaLabel,
  maximo = 99_999_999_999,
}: {
  id?: string;
  valor: Centavos | null;
  aoMudar: (c: Centavos | null) => void;
  placeholder?: string;
  invalido?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  maximo?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const texto = valor === null ? '' : formatarNumero(valor);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el) {
      const fim = el.value.length;
      el.setSelectionRange(fim, fim);
    }
  }, [texto]);

  return (
    <div
      className={cx(
        'flex h-[46px] w-full min-w-0 items-center gap-2.5 rounded-xl border bg-campo px-3.5 transition-[border-color,box-shadow] focus-within:border-marca focus-within:shadow-[0_0_0_3px_var(--ring)]',
        invalido ? 'border-despesa' : 'border-borda',
        disabled && 'opacity-60',
      )}
      onClick={() => ref.current?.focus()}
    >
      <span className="f-valor text-[15px] text-suave">R$</span>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={invalido || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        className="f-valor h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-suave placeholder:opacity-60"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
          if (!digitos) return aoMudar(null);
          const c = Number(digitos.slice(0, 13));
          aoMudar(Math.min(c, maximo));
        }}
        onPaste={(e) => {
          const t = e.clipboardData.getData('text');
          const m = t.replace(/[^\d.,-]/g, '');
          if (/[.,]/.test(m)) {
            e.preventDefault();
            const partes = m.split(/[.,]/);
            const dec = partes.length > 1 && partes[partes.length - 1].length <= 2 ? partes.pop()! : '';
            const int = partes.join('').replace(/\D/g, '');
            const c = Number(int || '0') * 100 + Number((dec + '00').slice(0, 2));
            aoMudar(Math.min(c, maximo));
          }
        }}
      />
    </div>
  );
}

/* ───────────── Controles ───────────── */

export interface OpcaoSegmento<T extends string> {
  valor: T;
  rotulo: string;
  icone?: string;
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  larguraTotal,
  pequeno,
}: {
  opcoes: OpcaoSegmento<T>[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  larguraTotal?: boolean;
  pequeno?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className={cx('flex gap-1 rounded-xl bg-surface2 p-1', larguraTotal ? 'w-full' : 'w-fit max-w-full overflow-x-auto rolagem-fina')}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={cx(
              'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] transition-colors',
              pequeno ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-3.5 text-[13px]',
              larguraTotal && 'flex-1',
              ativo ? 'bg-marca font-bold text-sobre-marca' : 'font-semibold text-suave hover:text-texto',
            )}
          >
            {o.icone && <Icone nome={o.icone} tamanho={15} />}
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function Alternador({
  ligado,
  aoMudar,
  rotulo,
  descricao,
  id,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  descricao?: ReactNode;
  id?: string;
}) {
  const auto = useId();
  const idFinal = id ?? auto;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={idFinal} className="block cursor-pointer text-[14px] font-semibold leading-[20px]">
          {rotulo}
        </label>
        {descricao && <p className="mt-0.5 text-[12.5px] leading-[18px] text-suave">{descricao}</p>}
      </div>
      <button
        id={idFinal}
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => aoMudar(!ligado)}
        className={cx(
          'relative mt-0.5 h-[26px] w-[44px] shrink-0 rounded-full transition-colors',
          ligado ? 'bg-marca' : 'bg-borda',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] h-5 w-5 rounded-full bg-surface shadow transition-[left]',
            ligado ? 'left-[21px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  );
}

/** Caixa de seleção estilizada. */
export function Marcador({
  marcado,
  aoMudar,
  children,
  id,
}: {
  marcado: boolean;
  aoMudar: (v: boolean) => void;
  children: ReactNode;
  id?: string;
}) {
  const auto = useId();
  const idFinal = id ?? auto;
  return (
    <label htmlFor={idFinal} className="flex cursor-pointer items-start gap-3">
      <input
        id={idFinal}
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:shadow-[0_0_0_3px_var(--ring)]',
          marcado ? 'border-marca bg-marca text-sobre-marca' : 'border-borda bg-campo',
        )}
      >
        {marcado && <Icone nome="check" tamanho={13} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/** Percentual com 2 casas e máscara (digitar 135 mostra 1,35). `valor` em % (ex.: 1.35). */
export function EntradaPercentual({
  id,
  valor,
  aoMudar,
  invalido,
  ariaLabel,
}: {
  id?: string;
  valor: number | null;
  aoMudar: (v: number | null) => void;
  invalido?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const texto = valor === null ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length);
  }, [texto]);
  return (
    <div
      className={cx(
        'flex h-[46px] w-full min-w-0 items-center gap-2 rounded-xl border bg-campo px-3.5 transition-[border-color,box-shadow] focus-within:border-marca focus-within:shadow-[0_0_0_3px_var(--ring)]',
        invalido ? 'border-despesa' : 'border-borda',
      )}
      onClick={() => ref.current?.focus()}
    >
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        className="f-valor h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-suave placeholder:opacity-60"
        placeholder="0,00"
        value={texto}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
          aoMudar(d ? Number(d) / 100 : null);
        }}
      />
      <span className="f-valor text-[15px] text-suave">%</span>
    </div>
  );
}
