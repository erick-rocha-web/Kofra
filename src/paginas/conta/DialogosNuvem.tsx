import { useEffect, useState, type FormEvent } from 'react';
import { salvarArquivo } from '../../estado/arquivos';
import { loja, useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { cancelarSaida, definirSenhaNova, fecharErroLink, fecharRecuperacao, obterSincronizador, sairMesmoAssim, useConta, useNuvem } from '../../nuvem/conta';
import { temDadosLocais } from '../../nuvem/decisoes';
import type { Escolha, OpcaoEscolha } from '../../nuvem/sincronizacao';
import { gerarBackup, nomeArquivoBackup } from '../../storage/backup';
import { contar } from '../../storage/resumo';
import type { Dados } from '../../storage/tipos';
import { Botao } from '../../ui/base';
import { Modal } from '../../ui/Modal';
import { CampoSenha } from './BlocoConta';

function useBaixarBackup() {
  const { avisar } = useUI();
  return async (dados: Dados) => {
    const r = await salvarArquivo(nomeArquivoBackup(), gerarBackup(dados));
    if (r === 'salvo') avisar('Backup baixado.');
    else avisar('Não foi possível baixar o backup.', 'erro');
    return r === 'salvo';
  };
}

/** Descarte em espera: o backup é oferecido antes de a versão sumir. */
interface Descarte {
  opcao: OpcaoEscolha;
  dados: Dados;
  origem: string;
}

function EtapaBackup({ descarte, aoVoltar, aoContinuar }: { descarte: Descarte; aoVoltar: () => void; aoContinuar: () => void }) {
  const baixar = useBaixarBackup();
  const [baixado, setBaixado] = useState(false);
  return (
    <Modal
      aberto
      aoFechar={aoVoltar}
      aoVoltar={aoVoltar}
      titulo="Antes de continuar"
      largura="sm"
      fecharClicandoFora={false}
      rodape={
        <>
          <Botao variante={baixado ? 'secundario' : 'primario'} icone="download-simple" onClick={async () => setBaixado(await baixar(descarte.dados))}>
            Baixar backup
          </Botao>
          <Botao variante={baixado ? 'primario' : 'secundario'} onClick={aoContinuar}>
            {baixado ? 'Continuar' : 'Continuar sem backup'}
          </Botao>
        </>
      }
    >
      <p className="text-[14px] leading-[21px] text-suave">
        Os dados {descarte.origem} ({contar(descarte.dados)}) vão ser descartados. Baixe um backup agora se quiser guardar uma cópia: depois não dá para recuperar.
      </p>
    </Modal>
  );
}

function DialogoEscolha({ escolha }: { escolha: Escolha }) {
  const local = useDados();
  const { avisar } = useUI();
  const [descarte, setDescarte] = useState<Descarte | null>(null);
  const { remota, tipo } = escolha;

  async function aplicar(opcao: OpcaoEscolha) {
    await obterSincronizador()?.resolverEscolha(opcao);
    avisar(opcao === 'enviar' || opcao === 'local' ? 'Seus dados foram enviados para a conta.' : 'Pronto: os dados foram atualizados.');
  }

  /** Vai para a etapa do backup só quando há algo a perder. */
  function escolher(opcao: OpcaoEscolha) {
    if (opcao === 'nuvem' || opcao === 'vazia') {
      if (temDadosLocais(local)) return setDescarte({ opcao, dados: local, origem: 'deste navegador' });
    } else if (remota) {
      return setDescarte({ opcao, dados: remota.dados, origem: 'da nuvem' });
    }
    void aplicar(opcao);
  }

  if (descarte) {
    return (
      <EtapaBackup
        descarte={descarte}
        aoVoltar={() => setDescarte(null)}
        aoContinuar={() => {
          setDescarte(null);
          void aplicar(descarte.opcao);
        }}
      />
    );
  }

  const adiar = () => obterSincronizador()?.adiarEscolha();

  if (tipo === 'enviar') {
    return (
      <Modal
        aberto
        aoFechar={adiar}
        titulo="Enviar os dados deste navegador para a sua conta?"
        largura="sm"
        fecharClicandoFora={false}
        rodape={
          <>
            <Botao onClick={() => escolher('vazia')}>Não, começar vazia</Botao>
            <Botao variante="primario" data-foco-inicial onClick={() => escolher('enviar')}>
              Sim, enviar
            </Botao>
          </>
        }
      >
        <p className="text-[14px] leading-[21px] text-suave">
          Sua conta está vazia e este navegador tem {contar(local)}. Se você não enviar, a conta começa vazia e os dados saem deste navegador; antes, dá para baixar um backup.
        </p>
      </Modal>
    );
  }

  const conflito = tipo === 'conflito';
  return (
    <Modal
      aberto
      aoFechar={adiar}
      titulo={!conflito ? 'Quais dados você quer manter?' : remota ? 'Seus dados mudaram em outro aparelho' : 'Seus dados foram apagados em outro aparelho'}
      largura="sm"
      fecharClicandoFora={false}
      rodape={
        <>
          <Botao onClick={() => escolher('local')}>{conflito ? 'Manter a deste aparelho' : 'Manter os deste navegador'}</Botao>
          <Botao variante="primario" data-foco-inicial onClick={() => escolher('nuvem')}>
            {conflito ? 'Ficar com a da nuvem' : 'Ficar com a nuvem'}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[14px] leading-[21px] text-suave">
        <p>Na nuvem: {remota ? contar(remota.dados) : 'nenhum dado'}.</p>
        <p>{conflito ? 'Neste aparelho' : 'Neste navegador'}: {contar(local)}.</p>
        <p>A versão que você não escolher é descartada. Antes disso, dá para baixar um backup dela.</p>
      </div>
    </Modal>
  );
}

function DialogoPerda() {
  const { avisar, navegar } = useUI();
  const baixar = useBaixarBackup();
  return (
    <Modal
      aberto
      aoFechar={cancelarSaida}
      titulo="Há alterações que não foram enviadas"
      largura="sm"
      fecharClicandoFora={false}
      rodape={
        <>
          <Botao variante="secundario" onClick={cancelarSaida}>
            Cancelar
          </Botao>
          <Botao icone="download-simple" onClick={() => void baixar(loja.obterDados())}>
            Baixar backup
          </Botao>
          <Botao
            variante="perigo"
            onClick={async () => {
              await sairMesmoAssim();
              avisar('Você saiu da conta.');
              navegar('inicio');
            }}
          >
            Sair mesmo assim
          </Botao>
        </>
      }
    >
      <p className="text-[14px] leading-[21px] text-suave">
        Não foi possível enviar suas últimas alterações. Se você sair agora, elas vão se perder, porque sair apaga os dados deste navegador. Baixe um backup antes, se quiser guardá-las.
      </p>
    </Modal>
  );
}

function DialogoSenhaNova() {
  const { avisar } = useUI();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro('Senha curta: use pelo menos 8 caracteres.');
    setEnviando(true);
    const falha = await definirSenhaNova(senha);
    setEnviando(false);
    setErro(falha);
    if (!falha) avisar('Senha alterada.');
  }

  return (
    <Modal aberto aoFechar={fecharRecuperacao} titulo="Defina a senha nova" subtitulo="Depois disso, é com ela que você entra." largura="sm" fecharClicandoFora={false}>
      <form onSubmit={aoEnviar} className="flex flex-col gap-3.5" noValidate>
        <CampoSenha rotulo="Senha nova" valor={senha} aoMudar={setSenha} autoComplete="new-password" ajuda="No mínimo 8 caracteres." />
        {erro && (
          <p role="alert" className="text-[13px] font-medium leading-[19px] text-despesa">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <Botao type="submit" variante="primario" disabled={enviando}>
            Salvar senha
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

export function DialogosNuvem() {
  const { disponivel, recuperandoSenha, erroLink, saida } = useConta();
  const { escolha, escolhaAberta } = useNuvem();
  const { avisar } = useUI();

  useEffect(() => {
    if (!erroLink) return;
    avisar(erroLink, 'erro');
    fecharErroLink();
  }, [erroLink, avisar]);

  if (!disponivel) return null;
  if (recuperandoSenha) return <DialogoSenhaNova />;
  if (saida === 'avisar-perda') return <DialogoPerda />;
  if (escolha && escolhaAberta) return <DialogoEscolha key={escolha.tipo} escolha={escolha} />;
  return null;
}
