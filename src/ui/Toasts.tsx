import { useUI } from '../estado/ui';
import { Icone } from './Icone';
import { cx } from './base';

const ICONE = { sucesso: 'check-circle', erro: 'warning-circle', info: 'info' } as const;
const COR = { sucesso: 'text-receita', erro: 'text-despesa', info: 'text-marca' } as const;

export function Toasts() {
  const { avisos, fecharAviso } = useUI();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-8 lg:items-end"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
      aria-live="polite"
      role="status"
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          className="anima-entrar pointer-events-auto flex max-w-[440px] items-start gap-3 rounded-2xl border border-borda bg-surface px-4 py-3 text-[14px] leading-[20px]"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <Icone nome={ICONE[a.tom]} tamanho={19} className={cx('mt-px', COR[a.tom])} />
          <span className="min-w-0 flex-1">{a.texto}</span>
          <button
            type="button"
            onClick={() => fecharAviso(a.id)}
            className="-mr-1 rounded-md p-0.5 text-suave hover:text-texto"
            aria-label="Fechar aviso"
          >
            <Icone nome="x" tamanho={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
