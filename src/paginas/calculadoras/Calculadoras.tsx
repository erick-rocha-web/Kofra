import { useUI } from '../../estado/ui';
import { Pagina } from '../../layout/Pagina';
import { Medalhao } from '../../ui/base';
import { Icone } from '../../ui/Icone';

const LISTA = [
  {
    rota: 'juros-compostos' as const,
    icone: 'chart-line-up',
    titulo: 'Juros compostos',
    texto: 'Quanto um valor inicial e aportes mensais viram com o tempo, mês a mês.',
  },
  {
    rota: 'primeiro-milhao' as const,
    icone: 'target',
    titulo: 'Primeiro milhão',
    texto: 'Em quanto tempo você chega a R$ 1 milhão, ou quanto separar todo mês para alcançar essa marca numa data.',
  },
];

export function Calculadoras() {
  const { navegar } = useUI();
  return (
    <Pagina titulo="Calculadoras">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {LISTA.map((c) => (
          <button
            key={c.rota}
            type="button"
            onClick={() => navegar(c.rota)}
            className="cartao flex items-start gap-4 p-5 text-left transition-colors hover:bg-surface2 sm:p-6"
          >
            <Medalhao icone={c.icone} tamanho={46} />
            <span className="min-w-0 flex-1">
              <span className="f-titulo block text-[18px] leading-[24px]">{c.titulo}</span>
              <span className="mt-1 block text-[14px] leading-[21px] text-suave">{c.texto}</span>
            </span>
            <Icone nome="caret-right" tamanho={15} className="mt-1 text-suave" />
          </button>
        ))}
      </div>
      <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-[18px] text-suave">
        <Icone nome="info" tamanho={15} className="mt-px shrink-0" />
        Simulações com taxa constante, para planejar e estudar. Não são recomendação de investimento.
      </p>
    </Pagina>
  );
}
