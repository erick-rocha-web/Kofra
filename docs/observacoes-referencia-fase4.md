# Observações na plataforma de referência — Fase 4

Anotações feitas durante a prova cruzada de 28/10/2026 (base dos casos em `testes/conferencia/`). Só leitura, salvo os dados de teste "TESTE KOFRA" indicados.

## Orçamento (leitura, sem alterar nada)
Tipos de renda na referência: Renda Principal, Renda Extra, Outro.

### Set/2026
- Receitas: Salario Set 4.000,00 (Renda Principal, 07/09); Bonus Set 10.000,00 (Renda Extra, 20/09)
- Fixas: nenhuma · Variáveis: Lazer Set 500,00 (Lazer, 12/09)
- Resumo: R 14.000,00 · I 0,00 · D 500,00 · S 13.500,00

### Out/2026
- Receitas: Salario 5.000,00 (Renda Principal 05/10); Freela 1.000,00 (Renda Extra 20/10); Centavos 0,05 (Outro); Centavos 2 0,10 (Outro)
- Fixas: Aluguel 1.500,00 (Moradia, venc. 10/10)
- Variáveis: Parcelado 1/3 333,34 (Vestuário 01/10); Parcelado 6x 1/6 16,65 (Lazer 01/10); Mercado 700,00 (Mercado 15/10)
- Resumo: R 6.000,15 · I 1.200,03 (20%) · D 2.549,99 · S 2.250,13
- Gráficos POR ABA: Receita → Renda Principal 83 / Renda Extra 17 / Outro 0; Fixa → Moradia 100; Variável → Mercado 67 / Vestuário 32 / Lazer 2

### Nov/2026
- Receitas: Recorrente 1.000,00 (Renda Principal 05/11); Futuro 500,00 (Renda Extra 10/11, recebida)
- Fixas: Aluguel 1.500,00 (Moradia 10/11); Claude code 120,00 (Trabalho 23/11) ← dado real do usuário, só leitura
- Variáveis: Parcelado 2/3 333,33 (Vestuário 01/11); Parcelado 6x 2/6 16,67 (Lazer 01/11)
- Resumo: R 1.500,00 · I 450,00 (30%) · D 1.970,00 · S −920,00
- Gráficos: Receita → RP 67 / RE 33; Fixa → Moradia 93 / Trabalho 7; Variável → Vestuário 95 / Lazer 5

### Dez/2026
- Receitas: Recorrente 1.000,00 · Fixas: Aluguel 1.500 + Claude code 120 · Variáveis: Parcelado 3/3 333,33; 6x 3/6 16,67
- Resumo: R 1.000,00 · I 300,00 · D 1.970,00 · S −1.270,00
- Gráficos: Fixa → Moradia 93 / Trabalho 7; Variável → Vestuário 95 / Lazer 5

### Jan/2027
- Receitas: Recorrente 1.000,00 · Fixas: Aluguel 1.500 (10/01) + Claude code 120 (23/01) · Variáveis: 6x 4/6 16,67
- Resumo: R 1.000,00 · I 300,00 · D 1.636,67 · S −936,67
- Gráfico Fixa → Moradia 93 / Trabalho 7
- ATENÇÃO: os cards animam os números; ler duas vezes. Trocar de mês rápido mostra dados do mês errado (bug da referência).

## Gráfico por categoria — correção da Fase 2
Print da Fase 2 (blob-1793121915529-ocqz27.jpg): aba Variável de out/2026 com Mercado 68% / Vestuário 32% (700 e 333,34).
O OC01 da Fase 2 ("Aluguel fixa + Mercado variável, juntas") foi interpretação errada: coincidência numérica (1500/2200 = 68,2% e 700/1033,34 = 67,7%).
Regra real: cada aba mostra só os seus lançamentos (Receita por tipo de renda; Fixa; Variável), % inteiro meio para cima.

## Visão geral (leitura)
- Mês atual (out): Receita 6.000,15 com texto "Na média do costume" (variação real −7.999,85 vs set 14.000,00); Gastos 2.549,99 "R$ 2.049,99 a mais que no período anterior"; Saldo 3.450,16; Patrimônio 48.983,50 (+43.983,50); Investimentos 15.450,00 sem anterior; Reserva 1.000,01 sem anterior
- 3 meses (ago–out × mai–jul): Receita 20.000,15 (+19.000,15); Gastos 3.049,99 sem anterior; Saldo 16.950,16
- 6 meses: Receita 21.000,15 sem anterior; Gastos 3.049,99 sem anterior; Saldo 17.950,16
- 12 meses: idem 6 meses
- Personalizado ago–ago (× jul): Receita 0,00 "R$ 1.000,00 a menos que no período anterior"; Gastos 0,00 sem anterior; Saldo 0,00; Patrimônio/Investimentos/Reserva 0,00 sem anterior
- Início mostra Patrimônio total 48.985,13 (dólar do dia); Visão geral mostra 48.983,50.

## Patrimônio (leitura) — tela mostra reais inteiros; Início mostra 48.985,13 (dólar do dia = 535,13)
- Ago/2026: (não lido ainda) · Set/2026: total 5.000; liquidez 5.000; composição Conta Set 100
- Out/2026: total 48.985; L 15.535; I 15.450; B 30.000; D 12.000; composição Carro 49 / Renda fixa 18 / Conta 16 / Conta Set 8 / Renda variável 8 / Dólar 1; Liquidez: Conta 64 / Conta Set 32 / Dólar 3
- Nov/2026: total 47.985; B 29.000; composição Carro 48 / RF 18 / Conta 17 / Conta Set 8 / RV 8 / Dólar 1; Liquidez 64/32/3
- Dez/2026: igual a novembro (herança)
- Estrutura: carrossel de roscas (Total, Liquidez, Bens, Dívidas) com % dentro de cada grupo.

## Investimentos (leitura) — out/2026
- Valor atual 15.450; investido 15.000; rendimento +3.0% (+R$ 450)
- Renda fixa: 1 ativo, 10.850, +850, +8.5% · Renda variável: 1 ativo, 4.600, −400, −8.0%

## Metas — prévia "Guarde ~R$ N/mês" no formulário de criação (hoje 28/10/2026, nada salvo)
- 5.000,00 até 15/03/2027 → 1.000
- 1.234,56 até 28/11/2026 → 1.235
- 2.050,00 até 10/02/2027 → 513 (512,5 → meio para cima)
- 10.000,00 até 31/10/2026 → 10.000 (mesmo mês → 1)
- 999,99 até 31/12/2030 → 20
- 3.000,00 até 15/09/2026 (passado) → sem sugestão
- Card da meta TESTE KOFRA Viagem: "31 dez 2027 · R$ 12.300 · CDB · Meta concluída"

## Parcelamento — prévia "Nx de R$ Y" no formulário (nada salvo nessas prévias)
- 1.234,56 em 5x → 246,91 · 99,99 em 4x → 25,00 · 10,00 em 3x → 3,33 · 2.000,00 em 12x → 166,67 · 0,05 em 2x → 0,03 (empate, meio para cima) · 0,10 em 3x → 0,03

## DADOS NOVOS CRIADOS NA FASE 4 (entram na lista de limpeza)
- [x] Variável TESTE KOFRA Parcelado 4x — R$ 99,99 em 4x, data 20/01/2027, Lazer (parcelas jan–abr/2027)
- [x] Receita prevista TESTE KOFRA Prevista Jan — R$ 333,33, 15/01/2027, Renda Extra
- [x] Receita prevista TESTE KOFRA Prevista Fev — R$ 250,50, 20/02/2027, Renda Extra

## Orçamento depois dos dados novos
### Jan/2027 com a prevista PENDENTE
- Receita 1.000,00 · "A receber R$ 333,33" · Investir 300,00 · Despesas 1.661,66 · Saldo −961,66
- Variável: 6x 4/6 16,67 (01/01) + 4x 1/4 24,99 (01/01; 1ª parcela absorve para baixo) · Gráfico Receita: Renda Principal 100 (prevista pendente fica fora) · Variável: Lazer 100
### Fev/2027 (prevista pendente)
- Receita 1.000,00 · "A receber R$ 250,50" · Investir 300,00 · Despesas 1.661,67 (4x 2/4 25,00 + 6x 5/6 16,67) · Saldo −961,67
### Jan/2027 depois de "Marcar como recebido"
- Receita 1.333,33 · Investir 400,00 (30% de 1.333,33 = 399,999 → 400,00) · Despesas 1.661,66 · Saldo −728,33
- Gráfico Receita: Renda Principal 75 / Renda Extra 25

## Investimentos — edições de "Valor atual" (dados de teste; valem do mês editado em diante)
- Nov/2026 (herança de out): atual 15.450 · investido 15.000 · +R$ 450 · +3.0%
- Jan/2027: CDB valor atual 11.111,11 → lista "R$ 11.111 · +R$ 1.111 · +11.1%" (prévia no diálogo: "Rendimento: +R$ 1.111,11")
- Jan/2027: Ações valor atual 4.321,09 → "R$ 4.321 · −R$ 679 · −13.6%" (prévia: "−R$ 678,91")
- Jan/2027 totais: atual 15.432 · investido 15.000 · +R$ 432 · +2.9%
- Fev/2027: CDB valor atual 9.876,54 → "R$ 9.877 · −R$ 123 · −1.2%" (prévia "−R$ 123,46")
- Fev/2027 totais: atual 14.198 · investido 15.000 · −R$ 802 · −5.3%
- [x] DADOS ALTERADOS: CDB (jan/2027 = 11.111,11; fev/2027 = 9.876,54) e Ações (jan/2027 = 4.321,09)

## Reserva — meta fixa em R$ 2.400,00 (Blindado × 200,00: configuração do usuário, NÃO alterada)
- Tentativa de mudar nível/custo para medir a meta: BLOQUEADA pelo próprio ambiente (escrita em dado que não é de teste). Cancelei; nada mudou.
- Movimentos no local de teste "TESTE KOFRA Reserva 2" (aportes/saque, todos hoje):
  - início: locais 0,01 + 1.000,00 = 1.000,01 → 42% · texto "VOCÊ ESTÁ MELHOR QUE 80% DOS BRASILEIROS!" (estatística sem fonte; o Pila não usa)
  - +199,99 → 1.200,00 → 50%
  - +1.188,00 → 2.388,00 → mostra 100% · "FALTA POUCO PARA DORMIR TRANQUILO, NÃO PARE AGORA!" (99,5% ainda incompleta)
  - +12,00 → 2.400,00 → "PARABÉNS, VOCÊ ESTÁ 100% PROTEGIDO" · "Reserva completa. Respira fundo." (sem número de %)
  - +1.200,00 → 3.600,00 → mesmo estado completo, sem mostrar 150%
  - −2.599,99 (saque) → 1.000,01 → 42% (valor restaurado)
- [x] DADOS ALTERADOS: TESTE KOFRA Reserva 2 ganhou 4 aportes e 1 saque (saldo final igual ao de antes: R$ 1.000,00)

## Metas — progresso (meta de teste TESTE KOFRA Viagem; card mostra reais inteiros)
- total 20.000 · guardado 12.300 → "R$ 12.300 · Faltam R$ 7.700"
- retirada 1.234,56 (28/10) → guardado 11.065,44 → "R$ 11.065 · Faltam R$ 8.935"
- aporte 8.934,56 (28/10) → guardado 20.000,00 → "R$ 20.000 · Meta concluída" (igual ao total conta como concluída)
- total 25.000 → "R$ 20.000 · Faltam R$ 5.000"
- total de volta a 12.000 → "R$ 20.000 · Meta concluída"
- [x] DADOS ALTERADOS: a meta ganhou 2 movimentações (−1.234,56 e +8.934,56); total voltou a R$ 12.000,00; guardado agora R$ 20.000,00

## Início — prévias no "Personalizar visão geral" (só leitura; cancelado sem salvar). Os cards seguem o mês escolhido no topo.
- Set/2026: Patrimônio 5.000 · Investimentos "Comece a investir" · Despesas do mês R$ 500 → 4% · Saldo 13.500 · Reserva R$ 1.000 de 2.400 → 42% (mostra o valor atual mesmo em setembro) · Bens 0 · Meta Viagem 20.000 de 12.000 → 100%
- Out/2026: Patrimônio 48.985 · Investimentos 15.450 · Despesas R$ 2.550 → 53% · Saldo 2.250 · Reserva 1.000 → 42% · Bens 30.000
- Nov/2026: Patrimônio 47.985 (Início: 47.985,13) · Despesas R$ 1.970 → 188% (barra cheia) · Saldo −920 · Bens 29.000
- Dez/2026: Patrimônio 47.985 · Despesas R$ 1.970 → 281% · Saldo −1.270
- Jan/2027: Patrimônio 47.967 · Investimentos 15.432 · Despesas R$ 1.662 → 178% · Saldo −728

## Visão geral — janelas personalizadas (só leitura; o filtro volta a "Mês atual" ao recarregar)
- Set–Set (× ago): Receita 14.000,00 sem anterior · Gastos 500,00 sem anterior · Saldo 13.500,00 · Patrimônio 5.000,00 sem anterior · Investimentos 0,00 · Reserva 0,00
- Ago–Set (× jun–jul): Receita 14.000,00 "R$ 13.000,00 a mais que no período anterior" · Gastos 500,00 sem anterior · Saldo 13.500,00 · Patrimônio 5.000,00 sem anterior · Investimentos 0,00 · Reserva 0,00
- Mês atual (out), relido depois das edições: igual ao começo do dia (Receita "Na média do costume"; Gastos +2.049,99; Saldo 3.450,16; Patrimônio 48.983,50 +43.983,50; Investimentos 15.450,00 e Reserva 1.000,01 sem anterior)
- Observação: Visão geral usa o dólar guardado (48.983,50 → US$ 100 = 533,50); Início e Patrimônio usam a cotação do dia (535,13).
