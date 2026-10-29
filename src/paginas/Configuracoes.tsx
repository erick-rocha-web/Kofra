import { useId, useRef, useState, type ReactNode } from 'react';
import { atualizar, loja, useDados, useEstadoLoja } from '../estado/loja';
import { useUI } from '../estado/ui';
import { copiarTexto, lerArquivoTexto, salvarArquivo } from '../estado/arquivos';
import { Pagina } from '../layout/Pagina';
import { gerarBackup, lerBackup, nomeArquivoBackup, ErroBackup } from '../storage/backup';
import { gerarExemplo } from '../storage/exemplo';
import { temDadosProprios } from '../storage/padrao';
import type { Dados, Tema } from '../storage/tipos';
import { AreaTexto, Botao, Campo, Entrada, Medalhao, Segmentado, Selo } from '../ui/base';
import { Icone } from '../ui/Icone';
import { Confirmacao, Modal } from '../ui/Modal';

function Secao({
  id,
  icone,
  titulo,
  descricao,
  children,
  perigo,
}: {
  id: string;
  icone: string;
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  perigo?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className="cartao p-5 sm:p-6"
      style={perigo ? { borderColor: 'color-mix(in srgb, var(--neg) 45%, var(--border))' } : undefined}
    >
      <div className="mb-4 flex items-start gap-3">
        <Medalhao icone={icone} tom={perigo ? 'despesa' : 'marca'} tamanho={38} />
        <div className="min-w-0 pt-0.5">
          <h2 id={id} className="f-titulo text-[17px] leading-[22px]">
            {titulo}
          </h2>
          {descricao && <p className="mt-1 text-[13px] leading-[19px] text-suave">{descricao}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Linha({ titulo, texto, acao }: { titulo: ReactNode; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-borda py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="text-[14px] font-semibold leading-[20px]">{titulo}</p>
        {texto && <p className="mt-0.5 text-[12.5px] leading-[18px] text-suave">{texto}</p>}
      </div>
      {acao && <div className="flex shrink-0 flex-wrap gap-2">{acao}</div>}
    </div>
  );
}

const DOCUMENTOS: Record<'termos' | 'privacidade', { titulo: string; paragrafos: string[] }> = {
  termos: {
    titulo: 'Termos de uso',
    paragrafos: [
      'O Kofra é uma ferramenta pessoal para organizar receitas, despesas, investimentos, patrimônio, reserva e metas.',
      'Os cálculos e as calculadoras servem para planejamento e estudo. Eles não são recomendação de investimento nem consultoria financeira, contábil ou jurídica.',
      'Você é responsável pelos dados que cadastra e por manter backups. Nesta versão os dados ficam só no seu navegador.',
      'O Assistente usa o Claude, da Anthropic, quando o Kofra está aberto no claude.ai. As respostas podem conter erros: confira antes de decidir.',
    ],
  },
  privacidade: {
    titulo: 'Privacidade',
    paragrafos: [
      'Seus dados ficam guardados no armazenamento deste navegador (IndexedDB). O Kofra não tem servidor próprio e não envia seus dados para lugar nenhum por conta própria.',
      'Quando você exporta um backup, o arquivo vai para onde você escolher salvar.',
      'Quando você usa o Assistente, a sua pergunta e um resumo dos seus números são enviados ao Claude para gerar a resposta, usando a sua conta do claude.ai. Nada é enviado se você não usar o Assistente.',
      'Para apagar tudo, use "Apagar todos os dados" nesta tela. Limpar os dados do site no navegador também apaga.',
    ],
  },
};

function contar(d: Dados): string {
  const partes = [
    [d.lancamentos.length + d.recorrentes.length, 'lançamento', 'lançamentos'],
    [d.patrimonio.length, 'item de patrimônio', 'itens de patrimônio'],
    [d.ativos.length, 'investimento', 'investimentos'],
    [d.metas.length, 'meta', 'metas'],
  ] as const;
  const txt = partes.filter(([n]) => n > 0).map(([n, um, varios]) => `${n} ${n === 1 ? um : varios}`);
  return txt.length ? txt.join(', ') : 'nenhum dado cadastrado';
}

export function Configuracoes() {
  const dados = useDados();
  const estadoLoja = useEstadoLoja();
  const { avisar, navegar } = useUI();
  const { config } = dados;
  const idNome = useId();
  const idsSecao = { aparencia: useId(), conta: useId(), moeda: useId(), compartilhar: useId(), dados: useId(), docs: useId(), ajuda: useId(), perigo: useId() };

  const [textoBackup, setTextoBackup] = useState<string | null>(null);
  const [importando, setImportando] = useState<{ dados: Dados; exportadoEm: string | null } | null>(null);
  const [colar, setColar] = useState(false);
  const [textoColado, setTextoColado] = useState('');
  const [erroColado, setErroColado] = useState<string | null>(null);
  const [apagar, setApagar] = useState(false);
  const [exemplo, setExemplo] = useState(false);
  const [doc, setDoc] = useState<keyof typeof DOCUMENTOS | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const marcarBackup = () =>
    atualizar((d) => {
      d.config.ultimoBackup = new Date().toISOString();
    });

  async function exportar() {
    const texto = gerarBackup(loja.obterDados());
    const r = await salvarArquivo(nomeArquivoBackup(), texto);
    if (r === 'salvo') {
      marcarBackup();
      avisar('Backup exportado.');
    } else if (r === 'recusado') {
      avisar('Exportação cancelada.', 'info');
    } else {
      setTextoBackup(texto);
    }
  }

  async function aoEscolherArquivo(f: File | undefined) {
    if (!f) return;
    try {
      const texto = await lerArquivoTexto(f);
      setImportando(lerBackup(texto));
    } catch (e) {
      avisar(e instanceof ErroBackup ? e.message : 'Não foi possível ler o arquivo.', 'erro');
    } finally {
      if (arquivo.current) arquivo.current.value = '';
    }
  }

  const ultimo = config.ultimoBackup
    ? new Date(config.ultimoBackup).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null;
  const proprios = temDadosProprios(dados);

  return (
    <Pagina titulo="Configurações" estreita>
      <div className="flex flex-col gap-5">
        <Secao id={idsSecao.aparencia} icone="palette" titulo="Aparência" descricao="Escolha o tema. Em Sistema, o Kofra acompanha o tema do aparelho.">
          <Segmentado<Tema>
            rotulo="Tema"
            valor={config.tema}
            aoMudar={(t) =>
              atualizar((d) => {
                d.config.tema = t;
              })
            }
            opcoes={[
              { valor: 'claro', rotulo: 'Claro', icone: 'sun' },
              { valor: 'escuro', rotulo: 'Escuro', icone: 'moon' },
              { valor: 'sistema', rotulo: 'Sistema', icone: 'desktop' },
            ]}
          />
        </Secao>

        <Secao id={idsSecao.conta} icone="user-circle" titulo="Conta" descricao="Seu nome aparece no menu. Nesta versão não existe login: os dados ficam neste navegador.">
          <Campo rotulo="Nome" htmlFor={idNome}>
            <Entrada
              id={idNome}
              value={config.nome}
              maxLength={60}
              placeholder="Como você quer ser chamado"
              autoComplete="name"
              onChange={(e) =>
                atualizar((d) => {
                  d.config.nome = e.target.value;
                })
              }
            />
          </Campo>
        </Secao>

        <Secao id={idsSecao.moeda} icone="coins" titulo="Moeda">
          <Linha
            titulo="Real brasileiro (R$)"
            texto="Todos os valores do Kofra são em reais. Outras moedas chegam junto com a versão na nuvem."
            acao={<Selo tom="neutro">BRL</Selo>}
          />
        </Secao>

        <Secao id={idsSecao.compartilhar} icone="users-three" titulo="Compartilhar">
          <Linha
            titulo="Convidar outra pessoa"
            texto="Para dividir as finanças com alguém, o Kofra precisa de conta com login. Esse recurso está no plano da versão na nuvem."
            acao={
              <Botao icone="lock-simple" disabled aria-disabled>
                Em breve
              </Botao>
            }
          />
        </Secao>

        <Secao
          id={idsSecao.dados}
          icone="database"
          titulo="Dados"
          descricao={
            estadoLoja.persistente
              ? 'Tudo fica guardado neste navegador. Exporte um backup de vez em quando e sempre antes de limpar o navegador ou trocar de aparelho.'
              : 'Atenção: este navegador não está guardando dados. Exporte um backup antes de fechar.'
          }
        >
          <Linha
            titulo="Exportar backup"
            texto={ultimo ? `Último backup: ${ultimo}` : 'Você ainda não exportou nenhum backup.'}
            acao={
              <Botao variante="primario" icone="download-simple" onClick={exportar}>
                Exportar
              </Botao>
            }
          />
          <Linha
            titulo="Importar backup"
            texto="Substitui todos os dados atuais pelos do arquivo."
            acao={
              <>
                <Botao icone="upload-simple" onClick={() => arquivo.current?.click()}>
                  Escolher arquivo
                </Botao>
                <Botao variante="fantasma" onClick={() => setColar(true)}>
                  Colar texto
                </Botao>
                <input
                  ref={arquivo}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => void aoEscolherArquivo(e.target.files?.[0])}
                />
              </>
            }
          />
          <Linha
            titulo="Dados de exemplo"
            texto={
              config.exemplo
                ? 'Os exemplos estão carregados. Use a faixa no topo para apagá-los.'
                : proprios
                  ? 'Disponível só com o Kofra vazio, para não misturar com os seus dados.'
                  : 'Preenche o app com números fictícios para você conhecer cada tela.'
            }
            acao={
              <Botao icone="sparkle" disabled={proprios || config.exemplo} onClick={() => setExemplo(true)}>
                Carregar exemplo
              </Botao>
            }
          />
          <p className="mt-3 text-[12.5px] leading-[18px] text-suave">Neste navegador: {contar(dados)}.</p>
        </Secao>

        <Secao id={idsSecao.docs} icone="file-text" titulo="Documentos">
          <Linha titulo="Termos de uso" acao={<Botao variante="fantasma" iconeDireita="caret-right" onClick={() => setDoc('termos')}>Ler</Botao>} />
          <Linha titulo="Privacidade" acao={<Botao variante="fantasma" iconeDireita="caret-right" onClick={() => setDoc('privacidade')}>Ler</Botao>} />
        </Secao>

        <Secao id={idsSecao.ajuda} icone="question" titulo="Ajuda">
          <Linha
            titulo="Perguntas frequentes e contato"
            acao={<Botao variante="fantasma" iconeDireita="caret-right" onClick={() => navegar('suporte')}>Suporte</Botao>}
          />
          <Linha
            titulo="Aulas rápidas sobre finanças"
            acao={<Botao variante="fantasma" iconeDireita="caret-right" onClick={() => navegar('aprender')}>Aprender</Botao>}
          />
        </Secao>

        <Secao id={idsSecao.perigo} icone="warning" titulo="Zona de perigo" perigo>
          <Linha
            titulo="Apagar todos os dados"
            texto="Remove lançamentos, patrimônio, investimentos, reserva, metas e preferências deste navegador. Não dá para desfazer."
            acao={
              <Botao variante="perigo-suave" icone="trash" onClick={() => setApagar(true)}>
                Apagar tudo
              </Botao>
            }
          />
        </Secao>
      </div>

      <Confirmacao
        aberto={apagar}
        aoFechar={() => setApagar(false)}
        titulo="Apagar todos os dados?"
        perigo
        palavraChave="APAGAR"
        rotuloConfirmar="Apagar tudo"
        texto={
          <>
            <p>Isso remove {contar(dados)} e volta o Kofra ao estado inicial.</p>
            <p className="mt-2">Se quiser guardar uma cópia, exporte um backup antes.</p>
          </>
        }
        aoConfirmar={() => {
          void loja.apagarTudo();
          avisar('Todos os dados foram apagados.');
          navegar('inicio');
        }}
      />

      <Confirmacao
        aberto={exemplo}
        aoFechar={() => setExemplo(false)}
        titulo="Carregar dados de exemplo?"
        rotuloConfirmar="Carregar exemplo"
        texto="O Kofra vai mostrar números fictícios em todas as telas, com uma faixa avisando. Quando quiser começar de verdade, é só apagar os exemplos."
        aoConfirmar={() => {
          const ex = gerarExemplo();
          ex.config = { ...ex.config, tema: config.tema, nome: config.nome, ocultarValores: config.ocultarValores };
          loja.substituir(ex);
          avisar('Exemplo carregado.');
          navegar('inicio');
        }}
      />

      <Confirmacao
        aberto={!!importando}
        aoFechar={() => setImportando(null)}
        titulo="Importar este backup?"
        rotuloConfirmar="Importar e substituir"
        perigo
        texto={
          importando && (
            <>
              <p>
                O arquivo{importando.exportadoEm ? `, exportado em ${new Date(importando.exportadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })},` : ''}{' '}
                tem {contar(importando.dados)}.
              </p>
              <p className="mt-2">Os dados atuais deste navegador ({contar(dados)}) serão substituídos.</p>
            </>
          )
        }
        aoConfirmar={() => {
          if (!importando) return;
          loja.substituir(importando.dados);
          avisar('Backup importado.');
        }}
      />

      <Modal
        aberto={colar}
        aoFechar={() => {
          setColar(false);
          setErroColado(null);
        }}
        titulo="Colar backup"
        subtitulo="Cole aqui o conteúdo do arquivo .json exportado pelo Kofra."
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setColar(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              disabled={!textoColado.trim()}
              onClick={() => {
                try {
                  const r = lerBackup(textoColado);
                  setColar(false);
                  setTextoColado('');
                  setErroColado(null);
                  setImportando(r);
                } catch (e) {
                  setErroColado(e instanceof ErroBackup ? e.message : 'Não foi possível ler o texto.');
                }
              }}
            >
              Continuar
            </Botao>
          </>
        }
      >
        <Campo rotulo="Conteúdo do backup" htmlFor="kofra-colar-backup" erro={erroColado}>
          <AreaTexto
            id="kofra-colar-backup"
            rows={8}
            value={textoColado}
            onChange={(e) => setTextoColado(e.target.value)}
            placeholder='{"app": "kofra", ...}'
            className="font-mono text-[12.5px]"
          />
        </Campo>
      </Modal>

      <Modal
        aberto={textoBackup !== null}
        aoFechar={() => setTextoBackup(null)}
        titulo="Copie o seu backup"
        subtitulo="Aqui não foi possível salvar o arquivo direto. Copie o texto abaixo e guarde num arquivo .json (ou numa nota)."
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setTextoBackup(null)}>
              Fechar
            </Botao>
            <Botao
              variante="primario"
              icone="copy"
              onClick={async () => {
                const ok = await copiarTexto(textoBackup ?? '');
                if (ok) {
                  marcarBackup();
                  avisar('Backup copiado.');
                } else {
                  avisar('Selecione o texto e copie manualmente.', 'info');
                }
              }}
            >
              Copiar
            </Botao>
          </>
        }
      >
        <AreaTexto
          readOnly
          rows={10}
          value={textoBackup ?? ''}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-[12px]"
          aria-label="Texto do backup"
        />
      </Modal>

      <Modal aberto={doc !== null} aoFechar={() => setDoc(null)} titulo={doc ? DOCUMENTOS[doc].titulo : ''} largura="md">
        <div className="flex flex-col gap-3 text-[14px] leading-[22px] text-suave">
          {doc && DOCUMENTOS[doc].paragrafos.map((p) => <p key={p}>{p}</p>)}
          <p className="flex items-center gap-2 text-[12.5px]">
            <Icone nome="info" tamanho={15} /> Versão local · última revisão em outubro de 2026.
          </p>
        </div>
      </Modal>
    </Pagina>
  );
}
