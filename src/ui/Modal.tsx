import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Botao, BotaoIcone, Campo, Entrada, cx } from './base';

let travas = 0;
function travarRolagem() {
  travas++;
  if (travas === 1) document.documentElement.style.overflow = 'hidden';
  return () => {
    travas--;
    if (travas === 0) document.documentElement.style.overflow = '';
  };
}

export interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: 'sm' | 'md' | 'lg';
  /** Impede fechar clicando fora (formulários longos). */
  fecharClicandoFora?: boolean;
  /** Botão de voltar no lugar do título (fluxos em etapas). */
  aoVoltar?: () => void;
  /** Não leva o foco para o primeiro campo (telas de detalhe; evita abrir o teclado no celular). */
  semFocoEmCampo?: boolean;
}

const LARGURAS = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[500px]', lg: 'sm:max-w-[640px]' };

export function Modal({
  aberto,
  aoFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = 'md',
  fecharClicandoFora = true,
  aoVoltar,
  semFocoEmCampo,
}: ModalProps) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const aoFecharRef = useRef(aoFechar);
  aoFecharRef.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const destravar = travarRolagem();
    const t = setTimeout(() => {
      const alvo = semFocoEmCampo
        ? caixa.current
        : caixa.current?.querySelector<HTMLElement>('[autofocus], [data-foco-inicial]') ??
          caixa.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), select, textarea') ??
          caixa.current;
      alvo?.focus({ preventScroll: true });
    }, 30);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        aoFecharRef.current();
      }
      if (e.key === 'Tab' && caixa.current) {
        const focaveis = caixa.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener('keydown', tecla, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', tecla, true);
      destravar();
      anterior?.focus?.({ preventScroll: true });
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div
        className="anima-fade absolute inset-0"
        style={{ background: 'var(--overlay)' }}
        onClick={() => fecharClicandoFora && aoFechar()}
        aria-hidden
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={cx(
          'anima-modal relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-borda bg-surface outline-none sm:max-h-[86dvh] sm:rounded-[22px]',
          LARGURAS[largura],
        )}
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5 sm:px-6">
          {aoVoltar && <BotaoIcone icone="arrow-left" rotulo="Voltar" variante="fantasma" tamanho={34} onClick={aoVoltar} />}
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={idTitulo} className="f-titulo text-[19px] leading-[24px]">
              {titulo}
            </h2>
            {subtitulo && <p className="mt-1 text-[13px] leading-[19px] text-suave">{subtitulo}</p>}
          </div>
          <BotaoIcone icone="x" rotulo="Fechar" variante="fantasma" tamanho={34} onClick={aoFechar} />
        </div>
        <div className="rolagem-fina min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1 sm:px-6">{children}</div>
        {rodape && (
          <div
            className="flex flex-wrap items-center justify-end gap-2 border-t border-borda px-5 py-4 sm:px-6"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Confirmacao({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  texto,
  rotuloConfirmar = 'Confirmar',
  perigo,
  palavraChave,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  titulo: string;
  texto: ReactNode;
  rotuloConfirmar?: string;
  perigo?: boolean;
  /** Se informada, a pessoa precisa digitá-la para liberar o botão. */
  palavraChave?: string;
}) {
  const [digitado, setDigitado] = useState('');
  const id = useId();
  useEffect(() => {
    if (aberto) setDigitado('');
  }, [aberto]);
  const liberado = !palavraChave || digitado.trim().toUpperCase() === palavraChave.toUpperCase();
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      largura="sm"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante={perigo ? 'perigo' : 'primario'}
            disabled={!liberado}
            onClick={() => {
              aoConfirmar();
              aoFechar();
            }}
          >
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-[14px] leading-[21px] text-suave">
        <div>{texto}</div>
        {palavraChave && (
          <Campo rotulo={<>Digite <strong className="text-texto">{palavraChave}</strong> para confirmar</>} htmlFor={id}>
            <Entrada id={id} value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </Campo>
        )}
      </div>
    </Modal>
  );
}
