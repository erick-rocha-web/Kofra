import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mesAtual, type Mes } from '../engine/datas';

export const ROTAS = [
  'inicio',
  'visao-geral',
  'orcamento',
  'assistente',
  'reserva',
  'metas',
  'investimentos',
  'patrimonio',
  'aprender',
  'calculadoras',
  'juros-compostos',
  'primeiro-milhao',
  'suporte',
  'configuracoes',
  'categorias',
] as const;

export type RotaFixa = (typeof ROTAS)[number];
/** Rotas fixas + páginas de aula ("aula-<id>"). */
export type Rota = RotaFixa | `aula-${string}`;

function lerRota(): Rota {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if ((ROTAS as readonly string[]).includes(h)) return h as RotaFixa;
  if (/^aula-[A-Za-z0-9-]+$/.test(h)) return h as Rota;
  return 'inicio';
}

export interface Aviso {
  id: number;
  texto: string;
  tom: 'sucesso' | 'erro' | 'info';
}

interface ContextoUI {
  rota: Rota;
  navegar: (r: Rota) => void;
  mes: Mes;
  setMes: (m: Mes) => void;
  avisos: Aviso[];
  avisar: (texto: string, tom?: Aviso['tom']) => void;
  fecharAviso: (id: number) => void;
}

const Ctx = createContext<ContextoUI | null>(null);

export function ProvedorUI({ children }: { children: ReactNode }) {
  const [rota, setRota] = useState<Rota>(() => lerRota());
  const [mes, setMes] = useState<Mes>(() => mesAtual());
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const navegar = useCallback((r: Rota) => {
    if (lerRota() === r && window.location.hash) return;
    window.location.hash = r;
  }, []);

  const fecharAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const avisar = useCallback(
    (texto: string, tom: Aviso['tom'] = 'sucesso') => {
      const id = ++seq.current;
      setAvisos((a) => [...a.slice(-2), { id, texto, tom }]);
      setTimeout(() => fecharAviso(id), tom === 'erro' ? 6000 : 3500);
    },
    [fecharAviso],
  );

  const valor = useMemo(
    () => ({ rota, navegar, mes, setMes, avisos, avisar, fecharAviso }),
    [rota, navegar, mes, avisos, avisar, fecharAviso],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useUI(): ContextoUI {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI fora do ProvedorUI');
  return c;
}
