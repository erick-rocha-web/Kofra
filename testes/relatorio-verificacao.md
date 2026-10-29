# Relatório de verificação das fórmulas (Fase 2)

Gerado por `ferramentas/verificar_formulas.py` a partir dos CSVs de `testes/`.
Tolerância: R$ 0,01 em dinheiro; igualdade exata em percentuais exibidos, datas e textos.

| Arquivo | Casos | Checagens | OK | Maior diferença (R$) |
|---|---:|---:|---:|---:|
| orcamento_saldo.csv | 20 | 25 | 25 | 0,00 |
| orcamento_investir.csv | 11 | 12 | 12 | 0,00 |
| orcamento_receita_prevista.csv | 2 | 3 | 3 | 0,00 |
| orcamento_categorias.csv | 1 | 1 | 1 | — |
| parcelamento.csv | 2 | 13 | 13 | 0,00 |
| patrimonio.csv | 8 | 8 | 8 | 0,00 |
| patrimonio_composicao.csv | 1 | 1 | 1 | — |
| investimentos_rendimento.csv | 5 | 8 | 8 | 0,00 |
| reserva_meta.csv | 3 | 3 | 3 | 0,00 |
| reserva_percentual.csv | 7 | 21 | 21 | 0,00 |
| visao_geral.csv | 8 | 43 | 43 | 0,00 |
| visao_geral_estoques.csv | 5 | 10 | 10 | 0,00 |
| inicio_indicadores.csv | 2 | 2 | 2 | — |
| metas_aporte_mensal.csv | 14 | 14 | 14 | — |
| metas_progresso.csv | 3 | 8 | 8 | 0,00 |
| juros_compostos.csv | 6 | 22 | 22 | 0,00 |
| juros_compostos_mes_a_mes.csv | 4 | 393 | 393 | 0,00 |
| primeiro_milhao_tempo.csv | 10 | 30 | 30 | 0,00 |
| primeiro_milhao_aporte.csv | 3 | 13 | 13 | 0,00 |

**Total: 630 de 630 checagens OK.**

Nenhuma divergência: todas as fórmulas reproduzem exatamente o que a referência mostrou.
