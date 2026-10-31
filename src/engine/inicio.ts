import { porcentagem, type Centavos } from './dinheiro';

/**
 * "% do orçamento mensal" do cartão Despesas do mês:
 * despesas ÷ (receita − investir), inteiro (CONFIRMADO: 60% e 53%).
 * Com orçamento livre zero ou negativo, devolve null (DECISÃO PILA: a tela mostra a barra cheia e um aviso).
 */
export function percentualDoOrcamento(despesas: Centavos, receita: Centavos, investir: Centavos): number | null {
  const base = receita - investir;
  if (base <= 0) return null;
  return porcentagem(despesas, base, 0);
}
