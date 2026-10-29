import { useEffect, useId, useMemo, useState } from 'react';
import { useDados } from '../../estado/loja';
import { useUI } from '../../estado/ui';
import { adicionarLocal, excluirLocal, excluirMovimentoLocal, movimentarLocal, renomearLocal } from '../../estado/acoesReserva';
import { valorLocal } from '../../engine/reserva';
import { ativosNoMes } from '../../engine/investimentos';
import { dataValida, formatarData, hojeISO, mesAtual } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import type { LocalReserva } from '../../storage/tipos';
import { Botao, BotaoIcone, Campo, Entrada, EntradaDinheiro, Segmentado, Selecao, Valor, cx } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Confirmacao, Modal } from '../../ui/Modal';

export function ModalNovoLocal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { nome: useId(), valor: useId(), ativo: useId() };
  const ativos = useMemo(() => ativosNoMes(dados, mesAtual()), [dados]);
  const [modo, setModo] = useState<'manual' | 'ativo'>('manual');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [ativoId, setAtivoId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!aberto) return;
    setModo('manual');
    setNome('');
    setValor(null);
    setAtivoId(ativos[0]?.ativo.id ?? '');
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const salvar = () => {
    if (modo === 'manual') {
      if (!nome.trim()) return setErro('Dê um nome ao local.');
      adicionarLocal({ nome, valorInicial: valor ?? 0, data: hojeISO() });
    } else {
      const a = ativos.find((x) => x.ativo.id === ativoId);
      if (!a) return setErro('Escolha um investimento.');
      adicionarLocal({ nome: a.ativo.nome, ativoId: a.ativo.id, data: hojeISO() });
    }
    avisar('Local adicionado à reserva.');
    aoFechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Onde a reserva está"
      subtitulo="Uma parte da sua reserva: uma conta, uma aplicação, um cofrinho."
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" onClick={salvar}>
            Adicionar
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmentado
          rotulo="Tipo de local"
          valor={modo}
          aoMudar={setModo}
          larguraTotal
          opcoes={[
            { valor: 'manual', rotulo: 'Informar valor', icone: 'piggy-bank' },
            { valor: 'ativo', rotulo: 'Usar investimento', icone: 'link-simple' },
          ]}
        />
        {modo === 'manual' ? (
          <>
            <Campo rotulo="Nome do local" htmlFor={ids.nome} erro={erro}>
              <Entrada id={ids.nome} value={nome} maxLength={60} placeholder="Ex.: conta remunerada, cofrinho do banco" onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <Campo rotulo="Quanto tem lá hoje" htmlFor={ids.valor} ajuda="Depois você registra aportes e saques neste local.">
              <EntradaDinheiro id={ids.valor} valor={valor} aoMudar={setValor} />
            </Campo>
          </>
        ) : ativos.length ? (
          <Campo rotulo="Investimento" htmlFor={ids.ativo} erro={erro} ajuda="O valor acompanha o valor atual do investimento, mês a mês.">
            <Selecao id={ids.ativo} value={ativoId} onChange={(e) => setAtivoId(e.target.value)}>
              {ativos.map((a) => (
                <option key={a.ativo.id} value={a.ativo.id}>
                  {a.ativo.nome} · {formatarValor(a.atual)}
                </option>
              ))}
            </Selecao>
          </Campo>
        ) : (
          <p className="rounded-2xl border border-dashed border-borda p-3 text-[13px] text-suave">
            Nenhum investimento cadastrado neste mês. Cadastre na tela Investimentos ou informe o valor.
          </p>
        )}
      </div>
    </Modal>
  );
}

export function ModalLocal({ local, aoFechar }: { local: LocalReserva | null; aoFechar: () => void }) {
  const dados = useDados();
  const { avisar } = useUI();
  const ids = { nome: useId(), valor: useId(), data: useId() };
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'aporte' | 'saque'>('aporte');
  const [valor, setValor] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState(false);

  useEffect(() => {
    if (!local) return;
    setNome(local.nome);
    setTipo('aporte');
    setValor(null);
    setData(hojeISO());
    setErro(null);
  }, [local]);

  // sempre a versão mais recente do local (após aportes)
  const atual = local ? dados.reserva.locais.find((l) => l.id === local.id) ?? local : null;
  if (!atual) return null;
  const saldo = valorLocal(dados, atual, hojeISO());
  const ligado = atual.vinculo.tipo === 'ativo';
  const ativo = atual.vinculo.tipo === 'ativo' ? dados.ativos.find((a) => a.id === (atual.vinculo as { ativoId: string }).ativoId) : null;
  const historico = [...atual.movimentos].sort((a, b) => b.data.localeCompare(a.data));

  const registrar = () => {
    if (!valor || valor <= 0) return setErro('Informe um valor maior que zero.');
    if (!dataValida(data) || data > hojeISO()) return setErro('Use hoje ou uma data passada.');
    if (tipo === 'saque' && valor > saldo) return setErro('O saque é maior que o saldo deste local.');
    movimentarLocal(atual.id, data, tipo === 'aporte' ? valor : -valor);
    avisar(tipo === 'aporte' ? 'Aporte registrado.' : 'Saque registrado.');
    setValor(null);
    setErro(null);
  };

  return (
    <>
      <Modal
        aberto={!!local}
        aoFechar={() => {
          if (nome.trim() && nome.trim() !== atual.nome) renomearLocal(atual.id, nome);
          aoFechar();
        }}
        titulo={atual.nome}
        semFocoEmCampo
        rodape={
          <>
            <Botao variante="perigo-suave" icone="trash" className="mr-auto" onClick={() => setExcluir(true)}>
              Excluir local
            </Botao>
            <Botao
              variante="primario"
              onClick={() => {
                if (nome.trim() && nome.trim() !== atual.nome) renomearLocal(atual.id, nome);
                aoFechar();
              }}
            >
              Concluir
            </Botao>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-surface2 p-4">
            <p className="rotulo-secao">Saldo neste local</p>
            <Valor c={saldo} className="f-valor mt-1 block text-[26px]" />
            {ligado && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-suave">
                <Icone nome="link-simple" tamanho={14} /> Acompanha {ativo ? `o investimento “${ativo.nome}”` : 'um investimento que não existe mais'}.
              </p>
            )}
          </div>
          <Campo rotulo="Nome" htmlFor={ids.nome}>
            <Entrada id={ids.nome} value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          {!ligado && (
            <div className="flex flex-col gap-3 rounded-2xl border border-borda p-3.5">
              <Segmentado
                rotulo="Movimento"
                valor={tipo}
                aoMudar={setTipo}
                larguraTotal
                opcoes={[
                  { valor: 'aporte', rotulo: 'Guardar mais', icone: 'plus' },
                  { valor: 'saque', rotulo: 'Tirar', icone: 'minus' },
                ]}
              />
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                <Campo rotulo={tipo === 'aporte' ? 'Valor do aporte' : 'Valor do saque'} htmlFor={ids.valor} erro={erro}>
                  <EntradaDinheiro id={ids.valor} valor={valor} aoMudar={setValor} />
                </Campo>
                <Campo rotulo="Data" htmlFor={ids.data}>
                  <Entrada id={ids.data} type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
                </Campo>
              </div>
              <Botao variante="secundario" icone={tipo === 'aporte' ? 'plus' : 'minus'} onClick={registrar}>
                {tipo === 'aporte' ? 'Registrar aporte' : 'Registrar saque'}
              </Botao>
            </div>
          )}
          {!ligado && historico.length > 0 && (
            <div>
              <p className="rotulo-secao mb-2">Movimentações</p>
              <ul className="flex flex-col">
                {historico.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 border-t border-borda py-2 first:border-t-0">
                    <Icone
                      nome={m.valor >= 0 ? 'arrow-down' : 'arrow-up'}
                      tamanho={15}
                      className={m.valor >= 0 ? 'text-receita' : 'text-despesa'}
                      titulo={m.valor >= 0 ? 'Aporte' : 'Saque'}
                    />
                    <span className="f-num w-24 text-[13px] text-suave">{formatarData(m.data)}</span>
                    <Valor c={m.valor} sinal className={cx('f-valor flex-1 text-[14px]', m.valor >= 0 ? 'text-receita' : 'text-despesa')} />
                    <BotaoIcone
                      icone="trash"
                      rotulo="Apagar movimentação"
                      variante="perigo"
                      tamanho={30}
                      onClick={() => {
                        excluirMovimentoLocal(atual.id, m.id);
                        avisar('Movimentação apagada.');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
      <Confirmacao
        aberto={excluir}
        aoFechar={() => setExcluir(false)}
        titulo={`Excluir “${atual.nome}”?`}
        perigo
        rotuloConfirmar="Excluir"
        texto={ligado ? 'O investimento continua existindo; só deixa de contar na reserva.' : 'O saldo deste local deixa de contar na reserva, com todo o histórico.'}
        aoConfirmar={() => {
          excluirLocal(atual.id);
          avisar('Local excluído.');
          aoFechar();
        }}
      />
    </>
  );
}
