# Kofra — O que não deu para confirmar (NÃO CONFIRMADO)

Pontos em que a plataforma de referência não mostrou a regra com segurança. Para cada um, o Kofra usa um comportamento provisório, escrito abaixo. Nenhum número ou estatística foi inventado: quando não havia observação, o Kofra mostra o dado real ou deixa o recurso de fora. Detalhes em `docs/especificacao-calculos.md` (seção 9).

| # | Ponto | Como apareceu | O que o Kofra faz por enquanto |
|---|---|---|---|
| 1 | Propagação do "Investir" ao alterar um mês que já tinha herdado o ajuste | Ajustar outubro para 30% levou novembro e dezembro junto; depois, mudar outubro para 20% não mudou novembro | Vale deste mês em diante até o próximo ajuste (decidido no CP2) |
| 2 | Limites das faixas de mensagem da reserva | A referência tem 6 faixas de mensagem; os limites intermediários não foram medidos | Usa 3 estados (sem cobertura, parcial, total) com textos próprios |
| 3 | Valor da reserva em meses passados (Visão geral) | Não deu para ver como a referência guarda o histórico | Reconstrói pelos aportes e saques com data |
| 4 | Fonte e horário da cotação do dólar | O mesmo US$ 100 apareceu como R$ 533,50, R$ 533,21 e R$ 535,13 em momentos diferentes; não deu para confirmar de onde vem a cotação nem quando é atualizada | v1 só em reais (CP2); moeda estrangeira está no roadmap |
| 5 | Formatos aceitos em "Importar extrato" | Não testado | Fora da v1 (CP2) |
| 6 | Tipos de notificação do sino | O sino estava vazio | Avisos próprios (aprovados no CP2): receita prevista atrasada, despesa fixa vencendo em até 3 dias, meta com prazo em até 30 dias |
| 7 | Rendimento % quando o valor investido é zero | Caso não observado | Mostra "—" |
| 8 | "Despesas do mês" quando receita − investir ≤ 0 | Caso não observado | Barra cheia e o aviso "Sem orçamento livre neste mês" |
| 9 | Primeiro milhão (valor por mês) com taxa 0 | Caso não observado | (meta − valor inicial) ÷ número de meses |
| 10 | Empate exato em ,5 no % inteiro da composição | Não apareceu um empate exato | Meio para cima, como o resto do app |
| 11 | Juros compostos com valor inicial e mensal zerados | Caso não observado | Mostra zeros |
| 12 | Texto "Na média do costume" na Visão geral | Out/2026 (receita R$ 6.000,15 contra R$ 14.000,00 em setembro) mostrou esse texto sem número; ago/2026 (queda de R$ 1.000,00) mostrou "R$ 1.000,00 a menos" | Mostra sempre a variação real em R$ e % |
| 13 | Reserva em meses passados no Início | O card mostrou o valor de hoje em set/2026 (R$ 1.000, 42%), mas a Visão geral mostrou R$ 0,00 para setembro | Usa o histórico com data nos dois lugares |
| 14 | Dólar em lugares diferentes | Visão geral com o valor guardado (US$ 100 = R$ 533,50); Início e Patrimônio com a cotação do dia (R$ 535,13) | v1 só em reais |
| 15 | Meta da reserva com outros níveis e custos (Fase 4) | Medir exigia mudar a configuração real da conta, e a gravação foi bloqueada | Fórmula confirmada na Fase 2 (custo × 6 ou × 12), com 3 casos iguais |
