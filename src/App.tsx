import { useEffect, type ReactNode } from 'react';
import { useDados, useEstadoLoja } from './estado/loja';
import { useUI, type Rota } from './estado/ui';
import { Shell } from './layout/Shell';
import { Calculadoras } from './paginas/calculadoras/Calculadoras';
import { JurosCompostos } from './paginas/calculadoras/JurosCompostos';
import { PrimeiroMilhao } from './paginas/calculadoras/PrimeiroMilhao';
import { Aprender, PaginaAula } from './paginas/aprender/Aprender';
import { Assistente } from './paginas/assistente/Assistente';
import { Categorias } from './paginas/Categorias';
import { Configuracoes } from './paginas/Configuracoes';
import { Inicio } from './paginas/Inicio';
import { Investimentos } from './paginas/investimentos/Investimentos';
import { Metas } from './paginas/metas/Metas';
import { Orcamento } from './paginas/orcamento/Orcamento';
import { Patrimonio } from './paginas/patrimonio/Patrimonio';
import { Reserva } from './paginas/reserva/Reserva';
import { Suporte } from './paginas/Suporte';
import { VisaoGeral } from './paginas/VisaoGeral';
import { Logo } from './ui/Logo';

function pagina(rota: Rota): ReactNode {
  switch (rota) {
    case 'inicio':
      return <Inicio />;
    case 'configuracoes':
      return <Configuracoes />;
    case 'visao-geral':
      return <VisaoGeral />;
    case 'orcamento':
      return <Orcamento />;
    case 'categorias':
      return <Categorias />;
    case 'assistente':
      return <Assistente />;
    case 'reserva':
      return <Reserva />;
    case 'metas':
      return <Metas />;
    case 'investimentos':
      return <Investimentos />;
    case 'patrimonio':
      return <Patrimonio />;
    case 'calculadoras':
      return <Calculadoras />;
    case 'juros-compostos':
      return <JurosCompostos />;
    case 'primeiro-milhao':
      return <PrimeiroMilhao />;
    case 'suporte':
      return <Suporte />;
    case 'aprender':
      return <Aprender />;
    default:
      return rota.startsWith('aula-') ? <PaginaAula id={rota} /> : <Inicio />;
  }
}

function Carregando() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 text-suave">
        <Logo tamanho={40} />
        <span className="text-[13px]">Abrindo seus dados…</span>
      </div>
    </div>
  );
}

export function App() {
  const estado = useEstadoLoja();
  const { rota } = useUI();
  const tema = useDados().config.tema;

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'claro' || tema === 'escuro') raiz.dataset.pilaTema = tema;
    else delete raiz.dataset.pilaTema;
  }, [tema]);

  if (estado.status === 'carregando') return <Carregando />;
  return <Shell key="shell">{pagina(rota)}</Shell>;
}
