import { useEffect, useRef, useState } from 'react';
import { useUI } from '../estado/ui';
import { criarMes, mesAtual, nomeMes, nomeMesCapitalizado, partesMes, somarMeses } from '../engine/datas';
import { BotaoIcone, cx } from '../ui/base';

const SIGLAS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Seletor de mês: setas + rótulo que abre uma grade de meses. */
export function SeletorMes({ compacto }: { compacto?: boolean }) {
  const { mes, setMes } = useUI();
  const [aberto, setAberto] = useState(false);
  const [anoVisto, setAnoVisto] = useState(() => partesMes(mes).ano);
  const caixa = useRef<HTMLDivElement>(null);
  const atual = mesAtual();

  useEffect(() => {
    if (!aberto) return;
    setAnoVisto(partesMes(mes).ano);
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto, mes]);

  return (
    <div ref={caixa} className="relative">
      <div
        className={cx(
          'flex items-center rounded-xl bg-surface2 px-1',
          compacto ? 'h-[38px]' : 'h-[42px]',
        )}
      >
        <BotaoIcone
          icone="caret-left"
          rotulo="Mês anterior"
          variante="fantasma"
          tamanho={compacto ? 30 : 34}
          tamanhoIcone={14}
          onClick={() => setMes(somarMeses(mes, -1))}
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className={cx(
            'f-num rounded-lg px-1 text-center font-semibold hover:text-marca',
            compacto ? 'min-w-[72px] text-[13px]' : 'min-w-[150px] text-[14px]',
          )}
        >
          {compacto ? nomeMes(mes, 'rotulo') : nomeMesCapitalizado(mes)}
        </button>
        <BotaoIcone
          icone="caret-right"
          rotulo="Próximo mês"
          variante="fantasma"
          tamanho={compacto ? 30 : 34}
          tamanhoIcone={14}
          onClick={() => setMes(somarMeses(mes, 1))}
        />
      </div>

      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher mês"
          className="anima-entrar absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-2xl border border-borda bg-surface p-3"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <BotaoIcone icone="caret-left" rotulo="Ano anterior" variante="fantasma" tamanho={34} onClick={() => setAnoVisto((a) => a - 1)} />
            <span className="f-titulo text-[15px]">{anoVisto}</span>
            <BotaoIcone icone="caret-right" rotulo="Próximo ano" variante="fantasma" tamanho={34} onClick={() => setAnoVisto((a) => a + 1)} />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {SIGLAS.map((s, i) => {
              const m = criarMes(anoVisto, i + 1);
              const sel = m === mes;
              const hoje = m === atual;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setMes(m);
                    setAberto(false);
                  }}
                  className={cx(
                    'h-10 rounded-[10px] text-[13px] font-semibold capitalize transition-colors',
                    sel ? 'bg-marca text-sobre-marca' : hoje ? 'bg-marca-suave text-marca' : 'hover:bg-surface2',
                  )}
                  aria-pressed={sel}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {mes !== atual && (
            <button
              type="button"
              className="mt-2 h-9 w-full rounded-[10px] text-[13px] font-semibold text-marca hover:bg-marca-suave"
              onClick={() => {
                setMes(atual);
                setAberto(false);
              }}
            >
              Voltar para {nomeMes(atual, 'longo')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
