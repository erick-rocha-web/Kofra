import { useMemo, useState } from 'react';
import { atualizar, useDados } from '../estado/loja';
import { useUI } from '../estado/ui';
import { calcularAvisos, type AvisoApp } from '../engine/avisos';
import { formatarData, hojeISO } from '../engine/datas';
import { Botao, BotaoIcone, EstadoVazio, Medalhao, Valor } from '../ui/base';
import { Modal } from '../ui/Modal';

const ICONE: Record<AvisoApp['tipo'], { icone: string; tom: 'despesa' | 'alerta' | 'marca' }> = {
  'receita-atrasada': { icone: 'clock', tom: 'alerta' },
  'despesa-vencendo': { icone: 'calendar-blank', tom: 'despesa' },
  'meta-prazo': { icone: 'flag-banner', tom: 'marca' },
};

export function useAvisosApp(): AvisoApp[] {
  const dados = useDados();
  return useMemo(() => {
    const dispensados = new Set(dados.avisosDispensados);
    return calcularAvisos(dados, hojeISO()).filter((a) => !dispensados.has(a.id));
  }, [dados]);
}

export function Sino({ tamanho = 42 }: { tamanho?: 38 | 42 }) {
  const [aberto, setAberto] = useState(false);
  const avisos = useAvisosApp();
  const { navegar } = useUI();

  return (
    <>
      <span className="relative inline-flex">
        <BotaoIcone
          icone="bell-simple"
          rotulo={avisos.length ? `Avisos (${avisos.length})` : 'Avisos'}
          tamanho={tamanho}
          onClick={() => setAberto(true)}
        />
        {avisos.length > 0 && (
          <span
            className="f-num pointer-events-none absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-despesa px-1 text-[11px] font-bold text-sobre-marca"
            aria-hidden
          >
            {avisos.length > 9 ? '9+' : avisos.length}
          </span>
        )}
      </span>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Avisos" largura="sm">
        {avisos.length === 0 ? (
          <EstadoVazio
            compacto
            icone="check-circle"
            titulo="Tudo em dia"
            texto="Aqui aparecem receitas previstas que atrasaram, despesas fixas que vencem nos próximos 3 dias e metas com prazo nos próximos 30 dias."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {avisos.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-borda p-3">
                <Medalhao icone={ICONE[a.tipo].icone} tom={ICONE[a.tipo].tom} tamanho={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-[20px]">{a.titulo}</p>
                  <p className="text-[13px] leading-[19px] text-suave">{a.texto}</p>
                  {a.valor !== undefined && <Valor c={a.valor} className="f-valor mt-0.5 block text-[14px]" />}
                  <p className="mt-0.5 text-[12px] text-suave">{formatarData(a.quando, 'extenso')}</p>
                  <div className="mt-2 flex gap-2">
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      onClick={() => {
                        setAberto(false);
                        navegar(a.rota);
                      }}
                    >
                      Ver
                    </Botao>
                    <Botao
                      tamanho="sm"
                      variante="fantasma"
                      onClick={() =>
                        atualizar((d) => {
                          d.avisosDispensados.push(a.id);
                          if (d.avisosDispensados.length > 300) d.avisosDispensados.splice(0, 100);
                        })
                      }
                    >
                      Dispensar
                    </Botao>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
