import { useEffect, useId, useState } from 'react';
import { atualizar, useDados } from '../estado/loja';
import { useUI } from '../estado/ui';
import { copiarTexto } from '../estado/arquivos';
import { Pagina } from '../layout/Pagina';
import { useConta } from '../nuvem/conta';
import { Botao, Campo, Entrada, Medalhao } from '../ui/base';
import { Icone } from '../ui/Icone';
import { Modal } from '../ui/Modal';

const PERGUNTAS_DADOS: Record<'local' | 'nuvem', { p: string; r: string }[]> = {
  local: [
    {
      p: 'Onde ficam os meus dados?',
      r: 'No armazenamento deste navegador, neste aparelho. Nada sai daqui, a não ser quando você exporta um backup ou usa o Assistente.',
    },
    {
      p: 'Como uso o Pila em outro aparelho?',
      r: 'Em Configurações → Dados, exporte um backup (arquivo .json). No outro aparelho, abra o Pila e importe esse arquivo.',
    },
  ],
  nuvem: [
    {
      p: 'Onde ficam os meus dados?',
      r: 'Sem login, tudo fica neste navegador. Com login, os dados também ficam guardados no Supabase, num servidor em São Paulo, e só a sua conta acessa.',
    },
    {
      p: 'Como uso o Pila em outro aparelho?',
      r: 'Entre com a mesma conta em Configurações → Conta. Seus dados ficam iguais em todos os aparelhos. Sem internet, as alterações ficam no aparelho e vão quando a conexão voltar.',
    },
  ],
};

const PERGUNTAS: { p: string; r: string }[] = [
  {
    p: 'Com que frequência devo fazer backup?',
    r: 'Uma vez por mês, e sempre antes de limpar os dados do navegador ou trocar de aparelho. Limpar o navegador apaga os dados do Pila.',
  },
  {
    p: 'Como funciona o “Investir” do Orçamento?',
    r: 'É a parte da receita que você separa antes de gastar, em % ou valor fixo. O ajuste vale do mês escolhido em diante, até você mudar de novo. O saldo do mês é receita − despesas − investir.',
  },
  {
    p: 'Qual a diferença entre despesa fixa e variável?',
    r: 'A fixa se repete todo mês no mesmo dia (aluguel, internet): você cadastra uma vez. A variável é de um mês só (mercado, lazer). Compras parceladas viram uma parcela em cada mês.',
  },
  {
    p: 'Por que o patrimônio de um mês repete o do mês anterior?',
    r: 'Cada item guarda um valor por mês, que continua valendo nos meses seguintes até você atualizar. Assim você só mexe no que mudou.',
  },
  {
    p: 'Como a meta da reserva é calculada?',
    r: 'Custo essencial de um mês × 6 (nível Básico) ou × 12 (nível Blindado). O que você já tem é a soma dos locais da lista.',
  },
  {
    p: 'O que significa “Separe ~R$ N por mês” nas metas?',
    r: 'É o que falta para a meta dividido pelos meses até o prazo, arredondado para reais inteiros. O dia do prazo não entra na conta, só o mês.',
  },
  {
    p: 'O Assistente vê os meus dados?',
    r: 'Só quando você pergunta: a pergunta e um resumo dos seus números vão para o Claude, usando a sua conta do claude.ai. Lançamentos sugeridos por ele só entram depois que você confirma.',
  },
  {
    p: 'Como escondo os valores em público?',
    r: 'Toque no ícone de olho ao lado do título de qualquer tela. Os valores viram “••••••” até você tocar de novo.',
  },
];

function soDigitos(t: string) {
  return t.replace(/\D/g, '');
}

function ModalContatos({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { config } = useDados();
  const { avisar } = useUI();
  const ids = { w: useId(), e: useId() };
  const [whats, setWhats] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (aberto) {
      setWhats(config.contatoSuporte.whatsapp);
      setEmail(config.contatoSuporte.email);
      setErro(null);
    }
  }, [aberto, config.contatoSuporte]);
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Contatos de suporte"
      subtitulo="Quem responde dúvidas sobre este Pila? Preencha o WhatsApp e o e-mail."
      largura="sm"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={() => {
              if (whats && soDigitos(whats).length < 10) return setErro('Use o número com DDD (e o código do país, se for de fora).');
              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro('E-mail inválido.');
              atualizar((d) => {
                d.config.contatoSuporte = { whatsapp: whats.trim(), email: email.trim() };
              });
              avisar('Contatos salvos.');
              aoFechar();
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="WhatsApp" htmlFor={ids.w} erro={erro} ajuda="Com DDD. Ex.: (11) 91234-5678">
          <Entrada id={ids.w} inputMode="tel" value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="(00) 00000-0000" />
        </Campo>
        <Campo rotulo="E-mail" htmlFor={ids.e}>
          <Entrada id={ids.e} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="suporte@exemplo.com" />
        </Campo>
      </div>
    </Modal>
  );
}

export function Suporte() {
  const { config } = useDados();
  const { disponivel } = useConta();
  const { avisar, navegar } = useUI();
  const [editar, setEditar] = useState(false);
  const { whatsapp, email } = config.contatoSuporte;
  const digitos = soDigitos(whatsapp);
  const linkWhats = digitos ? `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}` : null;

  return (
    <Pagina titulo="Suporte" estreita>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="faq" className="flex flex-col gap-3">
          <h2 id="faq" className="f-titulo text-[18px]">
            Perguntas frequentes
          </h2>
          <div className="cartao overflow-hidden">
            {[...PERGUNTAS_DADOS[disponivel ? 'nuvem' : 'local'], ...PERGUNTAS].map((q) => (
              <details key={q.p} className="group border-t border-borda first:border-t-0">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-[14.5px] font-semibold hover:bg-surface2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{q.p}</span>
                  <Icone nome="caret-down" tamanho={15} className="text-suave transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-[14px] leading-[22px] text-suave">{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="contato" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="contato" className="f-titulo text-[18px]">
              Fale com o suporte
            </h2>
            <Botao tamanho="sm" variante="fantasma" icone="pencil-simple" onClick={() => setEditar(true)}>
              Editar contatos
            </Botao>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="cartao flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <Medalhao icone="whatsapp-logo" tom="receita" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">WhatsApp</p>
                  <p className="f-num truncate text-[13px] text-suave select-all">{whatsapp || 'Ainda não definido'}</p>
                </div>
              </div>
              {linkWhats ? (
                <a
                  href={linkWhats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-surface2 px-4 text-[13.5px] font-semibold hover:bg-borda"
                >
                  Abrir conversa <Icone nome="arrow-square-out" tamanho={15} />
                </a>
              ) : (
                <Botao tamanho="sm" onClick={() => setEditar(true)}>
                  Definir número
                </Botao>
              )}
            </div>
            <div className="cartao flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <Medalhao icone="envelope-simple" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">E-mail</p>
                  <p className="truncate text-[13px] text-suave select-all">{email || 'Ainda não definido'}</p>
                </div>
              </div>
              {email ? (
                <Botao
                  tamanho="sm"
                  icone="copy"
                  onClick={async () => {
                    const ok = await copiarTexto(email);
                    avisar(ok ? 'E-mail copiado.' : 'Selecione o endereço e copie.', ok ? 'sucesso' : 'info');
                  }}
                >
                  Copiar endereço
                </Botao>
              ) : (
                <Botao tamanho="sm" onClick={() => setEditar(true)}>
                  Definir e-mail
                </Botao>
              )}
            </div>
          </div>
        </section>

        <section className="cartao flex flex-wrap items-center gap-4 p-5">
          <Medalhao icone="book-open" />
          <p className="min-w-0 flex-1 text-[14px] text-suave">Quer entender melhor reserva, orçamento e juros compostos? Veja as aulas curtas.</p>
          <Botao variante="secundario" iconeDireita="arrow-right" onClick={() => navegar('aprender')}>
            Aprender
          </Botao>
        </section>
      </div>
      <ModalContatos aberto={editar} aoFechar={() => setEditar(false)} />
    </Pagina>
  );
}
