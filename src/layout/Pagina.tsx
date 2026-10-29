import type { ReactNode } from 'react';
import { atualizar, useDados } from '../estado/loja';
import { useUI, type Rota } from '../estado/ui';
import { BotaoIcone, cx } from '../ui/base';
import { Logo } from '../ui/Logo';
import { SeletorMes } from './SeletorMes';
import { Sino } from './Sino';

function BotaoOcultar() {
  const oculto = useDados().config.ocultarValores;
  return (
    <BotaoIcone
      icone={oculto ? 'eye-slash' : 'eye'}
      rotulo={oculto ? 'Mostrar valores' : 'Ocultar valores'}
      variante="fantasma"
      tamanho={38}
      tamanhoIcone={20}
      aria-pressed={oculto}
      onClick={() =>
        atualizar((d) => {
          d.config.ocultarValores = !d.config.ocultarValores;
        })
      }
    />
  );
}

interface Props {
  titulo: string;
  /** Mostra o seletor de mês (Início, Orçamento, Investimentos, Patrimônio). */
  usaMes?: boolean;
  /** Ações ao lado do título (ex.: "Como funciona"). */
  acoes?: ReactNode;
  /** Rota de volta (subpáginas). */
  voltarPara?: Rota;
  rotuloVoltar?: string;
  children: ReactNode;
  /** Largura máxima do conteúdo. */
  estreita?: boolean;
}

export function Pagina({ titulo, usaMes, acoes, voltarPara, rotuloVoltar, children, estreita }: Props) {
  const { navegar } = useUI();
  const voltar = voltarPara && (
    <BotaoIcone
      icone="arrow-left"
      rotulo={rotuloVoltar ?? 'Voltar'}
      variante="fantasma"
      tamanho={38}
      onClick={() => navegar(voltarPara)}
    />
  );

  return (
    <>
      {/* Celular: barra superior */}
      <div
        className="gutter sticky z-30 flex h-[60px] items-center justify-between gap-2 border-b border-borda bg-side lg:hidden"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <button type="button" onClick={() => navegar('inicio')} aria-label="Ir para o início" className="rounded-lg">
          <Logo tamanho={26} />
        </button>
        <div className="flex items-center gap-1.5">
          {usaMes && <SeletorMes compacto />}
          <Sino tamanho={38} />
          <BotaoIcone icone="sliders-horizontal" rotulo="Configurações" tamanho={38} onClick={() => navegar('configuracoes')} />
        </div>
      </div>

      {/* Computador: cabeçalho */}
      <header className="sticky top-0 z-30 hidden h-[76px] items-center justify-between gap-4 border-b border-borda bg-bg px-[34px] lg:flex">
        <div className="flex min-w-0 items-center gap-2">
          {voltar}
          <h1 className="f-titulo truncate text-[26px] leading-[32px]">{titulo}</h1>
          <BotaoOcultar />
          {acoes}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Sino />
          {usaMes && <SeletorMes />}
        </div>
      </header>

      <main
        className={cx(
          'gutter mx-auto w-full pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-4 lg:px-[34px] lg:pb-14 lg:pt-7',
          estreita ? 'max-w-[880px]' : 'max-w-[1240px]',
        )}
      >
        <div className="mb-5 flex min-w-0 flex-wrap items-center gap-1.5 lg:hidden">
          {voltar}
          <h1 className="f-titulo min-w-0 text-[24px] leading-[30px]">{titulo}</h1>
          <BotaoOcultar />
          {acoes}
        </div>
        {children}
      </main>
    </>
  );
}
