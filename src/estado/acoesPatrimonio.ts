import type { GrupoPatrimonio, Id, TipoBem } from '../storage/tipos';
import { novoId } from '../storage/padrao';
import { atualizar } from './loja';
import { somarMeses, type Mes } from '../engine/datas';
import type { Centavos } from '../engine/dinheiro';

export function adicionarItemPatrimonio(p: { grupo: GrupoPatrimonio; tipoBem?: TipoBem; nome: string; valor: Centavos; mes: Mes }): Id {
  const id = novoId();
  atualizar((d) => {
    d.patrimonio.push({
      id,
      grupo: p.grupo,
      ...(p.grupo === 'bem' ? { tipoBem: p.tipoBem ?? 'outros' } : {}),
      nome: p.nome.trim(),
      valores: [{ mes: p.mes, valor: p.valor }],
      fim: null,
      criadoEm: new Date().toISOString(),
    });
  });
  return id;
}

/** Atualiza nome/tipo e registra o valor do mês (vale dali em diante, até o próximo registro). */
export function atualizarItemPatrimonio(
  id: Id,
  mes: Mes,
  campos: { nome?: string; tipoBem?: TipoBem; valor?: Centavos },
): void {
  atualizar((d) => {
    const it = d.patrimonio.find((x) => x.id === id);
    if (!it) return;
    if (campos.nome !== undefined) it.nome = campos.nome.trim();
    if (campos.tipoBem && it.grupo === 'bem') it.tipoBem = campos.tipoBem;
    if (campos.valor !== undefined) {
      const reg = it.valores.find((v) => v.mes === mes);
      if (reg) reg.valor = campos.valor;
      else it.valores.push({ mes, valor: campos.valor });
      it.valores.sort((a, b) => a.mes.localeCompare(b.mes));
      if (it.fim && mes > it.fim) it.fim = null;
    }
  });
}

/** 'desde': o item deixa de existir do mês em diante (meses anteriores ficam). 'tudo': apaga o item. */
export function excluirItemPatrimonio(id: Id, mes: Mes, modo: 'desde' | 'tudo'): void {
  atualizar((d) => {
    const it = d.patrimonio.find((x) => x.id === id);
    if (!it) return;
    const primeiro = it.valores.reduce((m, v) => (v.mes < m ? v.mes : m), it.valores[0]?.mes ?? mes);
    if (modo === 'tudo' || mes <= primeiro) {
      d.patrimonio = d.patrimonio.filter((x) => x.id !== id);
      return;
    }
    it.fim = somarMeses(mes, -1);
    it.valores = it.valores.filter((v) => v.mes <= (it.fim as Mes));
  });
}
