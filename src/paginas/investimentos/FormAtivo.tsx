import { useEffect, useId, useState } from 'react';
import { useUI } from '../../estado/ui';
import { adicionarAtivo, atualizarAtivo, excluirAtivo, vinculosDoAtivo } from '../../estado/acoesInvestimentos';
import { TIPOS_ATIVO, rendimento, valorAtivoNoMes } from '../../engine/investimentos';
import { nomeMes, type Mes } from '../../engine/datas';
import { formatarPct, formatarValor } from '../../engine/formato';
import type { Ativo, TipoAtivo } from '../../storage/tipos';
import { Botao, Campo, Entrada, EntradaDinheiro, cx } from '../../ui/base';
import { IconeCategoria } from '../../ui/categoria';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';

export function FormAtivo({ aberto, aoFechar, mes, ativo }: { aberto: boolean; aoFechar: () => void; mes: Mes; ativo: Ativo | null }) {
  const { avisar } = useUI();
  const ids = { nome: useId(), inst: useId(), inv: useId(), atual: useId() };
  const [nome, setNome] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [tipo, setTipo] = useState<TipoAtivo>('renda_fixa');
  const [investido, setInvestido] = useState<number | null>(null);
  const [atual, setAtual] = useState<number | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setExcluindo(false);
    if (ativo) {
      const v = valorAtivoNoMes(ativo, mes);
      setNome(ativo.nome);
      setInstituicao(ativo.instituicao);
      setTipo(ativo.tipo);
      setInvestido(v?.investido ?? null);
      setAtual(v?.atual ?? null);
    } else {
      setNome('');
      setInstituicao('');
      setTipo('renda_fixa');
      setInvestido(null);
      setAtual(null);
    }
  }, [aberto, ativo, mes]);

  const previa = investido !== null && atual !== null ? rendimento(investido, atual) : null;
  const vinculos = ativo && excluindo ? vinculosDoAtivo(ativo.id) : null;

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Dê um nome ao investimento.';
    if (investido === null) e.inv = 'Informe quanto você colocou.';
    if (atual === null) e.atual = 'Informe quanto vale hoje.';
    setErros(e);
    if (Object.keys(e).length || investido === null || atual === null) return;
    const dados = { nome, instituicao, tipo, investido, atual };
    if (ativo) {
      atualizarAtivo(ativo.id, mes, dados);
      avisar(`Atualizado. Os valores valem de ${nomeMes(mes)} em diante.`);
    } else {
      adicionarAtivo(dados, mes);
      avisar(`Investimento adicionado em ${nomeMes(mes)}.`);
    }
    aoFechar();
  };

  const historico = ativo ? [...ativo.valores].sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 6) : [];

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={ativo ? `Editar ${ativo.nome}` : 'Novo investimento'}
      fecharClicandoFora={false}
      rodape={
        excluindo ? (
          <>
            <Botao variante="secundario" className="mr-auto" onClick={() => setExcluindo(false)}>
              Voltar
            </Botao>
            <Botao
              variante="perigo-suave"
              onClick={() => {
                if (ativo) excluirAtivo(ativo.id, mes, 'tudo');
                avisar('Investimento apagado de todos os meses.');
                aoFechar();
              }}
            >
              Apagar de todos os meses
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                if (ativo) excluirAtivo(ativo.id, mes, 'desde');
                avisar(`Investimento removido de ${nomeMes(mes)} em diante.`);
                aoFechar();
              }}
            >
              Resgatei: remover de {nomeMes(mes, 'curto')} em diante
            </Botao>
          </>
        ) : (
          <>
            {ativo && (
              <Botao variante="perigo-suave" icone="trash" className="mr-auto" onClick={() => setExcluindo(true)}>
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar}>
              {ativo ? 'Salvar' : 'Adicionar'}
            </Botao>
          </>
        )
      }
    >
      {excluindo ? (
        <div className="flex flex-col gap-3 text-[14px] leading-[21px] text-suave">
          <p>
            <strong className="text-texto">Resgatei</strong> tira o investimento de {nomeMes(mes)} em diante e mantém o histórico dos meses
            anteriores.
          </p>
          <p>
            <strong className="text-texto">Apagar de todos os meses</strong> some com ele por completo.
          </p>
          {vinculos && (vinculos.locais.length > 0 || vinculos.metas.length > 0) && (
            <p className="flex items-start gap-2 rounded-xl bg-alerta-suave p-3 text-texto">
              <Icone nome="warning" tamanho={16} className="mt-0.5 shrink-0 text-alerta" />
              <span>
                Ele está ligado a{' '}
                {[...vinculos.locais.map((n) => `“${n}” na reserva`), ...vinculos.metas.map((n) => `à meta “${n}”`)].join(', ')}. Se você apagar de
                todos os meses, o último valor fica registrado lá como um aporte.
              </span>
            </p>
          )}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <Campo rotulo="Nome" htmlFor={ids.nome} erro={erros.nome}>
            <Entrada id={ids.nome} value={nome} maxLength={60} placeholder="Ex.: CDB 110% do CDI, fundo de ações" onChange={(e) => setNome(e.target.value)} invalido={!!erros.nome} />
          </Campo>
          <Campo rotulo="Instituição" htmlFor={ids.inst}>
            <Entrada id={ids.inst} value={instituicao} maxLength={60} placeholder="Banco ou corretora" onChange={(e) => setInstituicao(e.target.value)} />
          </Campo>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Tipo</legend>
            <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-1 gap-1.5 xs:grid-cols-2">
              {TIPOS_ATIVO.map((t) => (
                <button
                  key={t.tipo}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t.tipo}
                  onClick={() => setTipo(t.tipo)}
                  className={cx(
                    'flex h-11 items-center gap-2.5 rounded-xl border px-2 text-left text-[13.5px] font-medium',
                    tipo === t.tipo ? 'border-marca bg-marca-suave font-semibold' : 'border-borda hover:bg-surface2',
                  )}
                >
                  <IconeCategoria icone={t.icone} cor={t.cor} tamanho={28} />
                  {t.rotulo}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
            <Campo rotulo="Quanto você aplicou" htmlFor={ids.inv} erro={erros.inv} ajuda="Quanto saiu do seu bolso.">
              <EntradaDinheiro id={ids.inv} valor={investido} aoMudar={setInvestido} invalido={!!erros.inv} />
            </Campo>
            <Campo rotulo={`Valor atual (${nomeMes(mes, 'curto')})`} htmlFor={ids.atual} erro={erros.atual} ajuda="Quanto vale no extrato.">
              <EntradaDinheiro id={ids.atual} valor={atual} aoMudar={setAtual} invalido={!!erros.atual} />
            </Campo>
          </div>
          {previa && (
            <p className="flex items-center justify-between rounded-xl bg-surface2 px-3.5 py-3 text-[14px]">
              <span className="font-semibold text-suave">Rendimento</span>
              <span className={cx('f-valor', previa.valor > 0 ? 'text-receita' : previa.valor < 0 ? 'text-despesa' : '')}>
                {formatarValor(previa.valor, { sinal: true })}
                {previa.pct !== null && <span className="ml-1.5 text-[13px]">({formatarPct(previa.pct, 1, true)})</span>}
              </span>
            </p>
          )}
          <p className="text-[12.5px] leading-[18px] text-suave">Os valores valem de {nomeMes(mes)} em diante, até você atualizar.</p>
          {historico.length > 1 && (
            <div className="rounded-2xl bg-surface2 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-suave">
                <Icone nome="clock-counter-clockwise" tamanho={13} /> Valores registrados
              </p>
              <ul className="flex flex-col gap-1 text-[13px]">
                {historico.map((h) => (
                  <li key={h.mes} className="flex justify-between gap-2">
                    <span className="text-suave">{nomeMes(h.mes, 'curto')}</span>
                    <span className="f-num">
                      {formatarValor(h.investido)} → <strong>{formatarValor(h.atual)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      )}
    </Modal>
  );
}
