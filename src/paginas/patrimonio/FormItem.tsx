import { useEffect, useId, useState } from 'react';
import { useUI } from '../../estado/ui';
import { adicionarItemPatrimonio, atualizarItemPatrimonio, excluirItemPatrimonio } from '../../estado/acoesPatrimonio';
import { valorNoMes } from '../../engine/patrimonio';
import { nomeMes, type Mes } from '../../engine/datas';
import { formatarValor } from '../../engine/formato';
import type { GrupoPatrimonio, ItemPatrimonio, TipoBem } from '../../storage/tipos';
import { Botao, Campo, Entrada, EntradaDinheiro, Segmentado } from '../../ui/base';
import { Icone } from '../../ui/Icone';
import { Modal } from '../../ui/Modal';

export const ROTULO_GRUPO: Record<GrupoPatrimonio, string> = { liquidez: 'Liquidez', bem: 'Bem', divida: 'Dívida' };

const EXEMPLOS: Record<GrupoPatrimonio, string> = {
  liquidez: 'Ex.: conta do banco, carteira',
  bem: 'Ex.: Apartamento, Carro',
  divida: 'Ex.: Financiamento, Cartão parcelado',
};

const AJUDA: Record<GrupoPatrimonio, string> = {
  liquidez: 'Dinheiro disponível: contas, carteira, saldo em aplicativos.',
  bem: 'O que você tem e poderia vender: imóveis, veículos, equipamentos.',
  divida: 'Quanto falta pagar hoje (o saldo devedor, não a parcela).',
};

export function FormItemPatrimonio({
  aberto,
  aoFechar,
  mes,
  grupoInicial,
  item,
}: {
  aberto: boolean;
  aoFechar: () => void;
  mes: Mes;
  grupoInicial: GrupoPatrimonio;
  item: ItemPatrimonio | null;
}) {
  const { avisar } = useUI();
  const ids = { nome: useId(), valor: useId() };
  const [grupo, setGrupo] = useState<GrupoPatrimonio>(grupoInicial);
  const [tipoBem, setTipoBem] = useState<TipoBem>('imovel');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setExcluindo(false);
    if (item) {
      setGrupo(item.grupo);
      setTipoBem(item.tipoBem ?? 'outros');
      setNome(item.nome);
      setValor(valorNoMes(item.valores, mes, item.fim));
    } else {
      setGrupo(grupoInicial);
      setTipoBem('imovel');
      setNome('');
      setValor(null);
    }
  }, [aberto, item, grupoInicial, mes]);

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Dê um nome para identificar.';
    if (valor === null || valor < 0) e.valor = 'Informe o valor.';
    setErros(e);
    if (Object.keys(e).length || valor === null) return;
    if (item) {
      atualizarItemPatrimonio(item.id, mes, { nome, tipoBem, valor });
      avisar(`Atualizado. O valor vale de ${nomeMes(mes)} em diante.`);
    } else {
      adicionarItemPatrimonio({ grupo, tipoBem, nome, valor, mes });
      avisar(`${ROTULO_GRUPO[grupo]} adicionada em ${nomeMes(mes)}.`);
    }
    aoFechar();
  };

  const historico = item ? [...item.valores].sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 6) : [];

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={item ? `Editar ${item.nome}` : 'Adicionar ao patrimônio'}
      fecharClicandoFora={false}
      rodape={
        excluindo ? (
          <>
            <Botao variante="secundario" onClick={() => setExcluindo(false)} className="mr-auto">
              Voltar
            </Botao>
            <Botao
              variante="perigo-suave"
              onClick={() => {
                if (item) excluirItemPatrimonio(item.id, mes, 'tudo');
                avisar('Item apagado de todos os meses.');
                aoFechar();
              }}
            >
              Apagar de todos os meses
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                if (item) excluirItemPatrimonio(item.id, mes, 'desde');
                avisar(`Item removido de ${nomeMes(mes)} em diante.`);
                aoFechar();
              }}
            >
              Remover de {nomeMes(mes, 'curto')} em diante
            </Botao>
          </>
        ) : (
          <>
            {item && (
              <Botao variante="perigo-suave" icone="trash" className="mr-auto" onClick={() => setExcluindo(true)}>
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar}>
              {item ? 'Salvar' : 'Adicionar'}
            </Botao>
          </>
        )
      }
    >
      {excluindo ? (
        <div className="flex flex-col gap-3 text-[14px] leading-[21px] text-suave">
          <p>
            <strong className="text-texto">Remover de {nomeMes(mes)} em diante</strong> mantém o histórico: o item continua nos meses
            anteriores (útil quando você vendeu um bem ou quitou uma dívida).
          </p>
          <p>
            <strong className="text-texto">Apagar de todos os meses</strong> some com ele por completo, como se nunca tivesse existido.
          </p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {!item && (
            <Segmentado<GrupoPatrimonio>
              rotulo="O que é"
              valor={grupo}
              aoMudar={setGrupo}
              larguraTotal
              opcoes={[
                { valor: 'liquidez', rotulo: 'Liquidez', icone: 'bank' },
                { valor: 'bem', rotulo: 'Bem', icone: 'house-line' },
                { valor: 'divida', rotulo: 'Dívida', icone: 'credit-card' },
              ]}
            />
          )}
          <p className="-mt-1 text-[12.5px] leading-[18px] text-suave">{AJUDA[grupo]}</p>
          {grupo === 'bem' && (
            <Segmentado<TipoBem>
              rotulo="Tipo de bem"
              valor={tipoBem}
              aoMudar={setTipoBem}
              pequeno
              opcoes={[
                { valor: 'imovel', rotulo: 'Imóvel', icone: 'house-line' },
                { valor: 'veiculo', rotulo: 'Veículo', icone: 'car' },
                { valor: 'outros', rotulo: 'Outros', icone: 'tag' },
              ]}
            />
          )}
          <Campo rotulo="Nome" htmlFor={ids.nome} erro={erros.nome}>
            <Entrada id={ids.nome} value={nome} maxLength={60} placeholder={EXEMPLOS[grupo]} onChange={(e) => setNome(e.target.value)} invalido={!!erros.nome} />
          </Campo>
          <Campo
            rotulo={`Valor em ${nomeMes(mes)}`}
            htmlFor={ids.valor}
            erro={erros.valor}
            ajuda="Esse valor vale para os meses seguintes até você atualizar."
          >
            <EntradaDinheiro id={ids.valor} valor={valor} aoMudar={setValor} invalido={!!erros.valor} />
          </Campo>
          {historico.length > 1 && (
            <div className="rounded-2xl bg-surface2 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-suave">
                <Icone nome="clock-counter-clockwise" tamanho={13} /> Valores registrados
              </p>
              <ul className="flex flex-col gap-1 text-[13px]">
                {historico.map((h) => (
                  <li key={h.mes} className="flex justify-between">
                    <span className="text-suave">{nomeMes(h.mes, 'curto')}</span>
                    <span className="f-num font-semibold">{formatarValor(h.valor)}</span>
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
