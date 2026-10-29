import { useState, type ReactNode } from 'react';
import { loja, useDados, useEstadoLoja } from '../estado/loja';
import { useUI } from '../estado/ui';
import { iniciais } from '../engine/formato';
import { dadosVazios } from '../storage/padrao';
import { Botao, BotaoIcone, cx } from '../ui/base';
import { Icone } from '../ui/Icone';
import { Logo } from '../ui/Logo';
import { Modal } from '../ui/Modal';
import { Toasts } from '../ui/Toasts';
import { NAV, NAV_INFERIOR, itemAtivo } from './navegacao';

function DialogoSair({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { navegar } = useUI();
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Sair"
      largura="sm"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              aoFechar();
              navegar('configuracoes');
            }}
          >
            Ver backup
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-[14px] leading-[21px] text-suave">
        <p>Esta versão do Kofra ainda não tem conta com login: seus dados ficam guardados só neste navegador.</p>
        <p>
          Para levar tudo para outro aparelho, exporte um backup em <strong className="text-texto">Configurações → Dados</strong> e
          importe lá. A conta com login e sincronização está no plano da versão na nuvem.
        </p>
      </div>
    </Modal>
  );
}

function Perfil({ aoSair }: { aoSair: () => void }) {
  const nome = useDados().config.nome.trim();
  const { navegar } = useUI();
  return (
    <div className="flex items-center gap-2.5 border-t border-borda px-1.5 pt-3.5">
      <button
        type="button"
        onClick={() => navegar('configuracoes')}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 text-left hover:bg-surface2"
        title="Editar perfil"
      >
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-marca text-[12px] font-bold"
        >
          {nome ? iniciais(nome) : <Icone nome="user-circle" tamanho={18} />}
        </span>
        <span className={cx('min-w-0 flex-1 truncate text-[14px] font-medium', !nome && 'text-suave')}>
          {nome || 'Seu nome'}
        </span>
      </button>
      <BotaoIcone icone="sign-out" rotulo="Sair" variante="fantasma" tamanho={34} tamanhoIcone={19} onClick={aoSair} />
    </div>
  );
}

function BarraLateral({ aoSair }: { aoSair: () => void }) {
  const { rota, navegar } = useUI();
  const ativo = itemAtivo(rota);
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col gap-[22px] border-r border-borda bg-side pb-4 pr-3.5 pt-[22px] lg:flex"
      style={{ paddingLeft: 'calc(14px + env(safe-area-inset-left, 0px))' }}
    >
      <button type="button" onClick={() => navegar('inicio')} className="flex h-9 items-center px-2" aria-label="Kofra, ir para o início">
        <Logo />
      </button>
      <ul className="rolagem-fina -mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {NAV.map((n) => {
          const on = n.rota === ativo;
          return (
            <li key={n.rota}>
              <a
                href={`#${n.rota}`}
                onClick={(e) => {
                  e.preventDefault();
                  navegar(n.rota);
                }}
                aria-current={on ? 'page' : undefined}
                className={cx(
                  'flex h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] leading-5 transition-colors',
                  on ? 'bg-surface2 font-bold text-texto' : 'font-medium text-suave hover:bg-surface2 hover:text-texto',
                )}
              >
                <Icone nome={n.icone} tamanho={19} className={on ? 'text-marca' : undefined} />
                <span className="min-w-0 flex-1 truncate">{n.rotulo}</span>
                <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-marca' : 'bg-transparent')} />
              </a>
            </li>
          );
        })}
      </ul>
      <Perfil aoSair={aoSair} />
    </nav>
  );
}

function NavInferior({ aoSair }: { aoSair: () => void }) {
  const { rota, navegar } = useUI();
  const [mais, setMais] = useState(false);
  const ativo = itemAtivo(rota);
  const principais = NAV.filter((n) => NAV_INFERIOR.includes(n.rota));
  const outros = NAV.filter((n) => !NAV_INFERIOR.includes(n.rota));
  const maisAtivo = !NAV_INFERIOR.includes(ativo);

  const item = (icone: string, rotulo: string, on: boolean, aoClicar: () => void, chave: string) => (
    <li key={chave} className="flex-1">
      <button
        type="button"
        onClick={aoClicar}
        aria-current={on ? 'page' : undefined}
        className={cx(
          'flex h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors',
          on ? 'font-bold text-marca' : 'font-medium text-suave',
        )}
      >
        <Icone nome={icone} tamanho={22} />
        <span>{rotulo}</span>
      </button>
    </li>
  );

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="gutter fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-side lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="mx-auto flex max-w-[560px]">
          {principais.map((n) =>
            item(n.icone, n.rotulo, n.rota === ativo, () => navegar(n.rota), n.rota),
          )}
          {item('squares-four', 'Mais', maisAtivo, () => setMais(true), 'mais')}
        </ul>
      </nav>
      <Modal aberto={mais} aoFechar={() => setMais(false)} titulo="Mais" largura="sm">
        <ul className="grid grid-cols-2 gap-2 xs:grid-cols-3">
          {outros.map((n) => {
            const on = n.rota === ativo;
            return (
              <li key={n.rota}>
                <button
                  type="button"
                  onClick={() => {
                    setMais(false);
                    navegar(n.rota);
                  }}
                  className={cx(
                    'flex h-[84px] w-full flex-col items-start justify-between rounded-2xl border p-3 text-left text-[13px] font-semibold leading-[17px]',
                    on ? 'border-marca bg-marca-suave' : 'border-borda bg-surface hover:bg-surface2',
                  )}
                >
                  <Icone nome={n.icone} tamanho={20} className="text-marca" />
                  <span>{n.rotulo}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                setMais(false);
                aoSair();
              }}
              className="flex h-[84px] w-full flex-col items-start justify-between rounded-2xl border border-borda bg-surface p-3 text-left text-[13px] font-semibold text-suave hover:bg-surface2"
            >
              <Icone nome="sign-out" tamanho={20} />
              <span>Sair</span>
            </button>
          </li>
        </ul>
      </Modal>
    </>
  );
}

function Faixas() {
  const estado = useEstadoLoja();
  const exemplo = useDados().config.exemplo;
  const { navegar, avisar } = useUI();
  const faixas: ReactNode[] = [];
  if (estado.status === 'pronto' && !estado.persistente) {
    faixas.push(
      <div key="mem" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-alerta-suave px-4 py-2.5 text-[13px] leading-[19px] text-texto">
        <Icone nome="warning" tamanho={17} className="text-alerta" />
        <span className="min-w-0 flex-1">
          Este navegador não está guardando dados (janela privada ou armazenamento bloqueado). O que você cadastrar some ao fechar.
        </span>
        <button type="button" className="font-semibold text-marca underline-offset-2 hover:underline" onClick={() => navegar('configuracoes')}>
          Exportar backup
        </button>
      </div>,
    );
  }
  if (estado.erroAoSalvar) {
    faixas.push(
      <div key="erro" className="flex items-center gap-3 bg-despesa-suave px-4 py-2.5 text-[13px] leading-[19px]">
        <Icone nome="warning-circle" tamanho={17} className="text-despesa" />
        <span className="min-w-0 flex-1">Não foi possível salvar a última alteração. Exporte um backup por segurança.</span>
      </div>,
    );
  }
  if (exemplo) {
    faixas.push(
      <div key="ex" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-marca-suave px-4 py-2.5 text-[13px] leading-[19px]">
        <Icone nome="sparkle" tamanho={17} className="text-marca" />
        <span className="min-w-0 flex-1">Você está vendo dados de exemplo. Nada disso é seu.</span>
        <button
          type="button"
          className="font-semibold text-marca underline-offset-2 hover:underline"
          onClick={() => {
            const d = dadosVazios();
            d.config = { ...loja.obterDados().config, exemplo: false, cardInicio: { tipo: 'patrimonio' } };
            loja.substituir(d);
            avisar('Exemplos apagados. Agora é com você.');
            navegar('inicio');
          }}
        >
          Apagar exemplos e começar
        </button>
      </div>,
    );
  }
  if (!faixas.length) return null;
  return <div className="relative z-20">{faixas}</div>;
}

export function Shell({ children }: { children: ReactNode }) {
  const [sair, setSair] = useState(false);
  return (
    <div className="min-h-[100dvh] lg:pl-[248px]">
      <BarraLateral aoSair={() => setSair(true)} />
      <Faixas />
      {children}
      <NavInferior aoSair={() => setSair(true)} />
      <Toasts />
      <DialogoSair aberto={sair} aoFechar={() => setSair(false)} />
    </div>
  );
}
