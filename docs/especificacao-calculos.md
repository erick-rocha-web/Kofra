# Kofra — Especificação dos cálculos

Fase 2 · observações feitas na plataforma de referência em 27/10/2026 · 19 arquivos de teste · 630 checagens · diferença máxima R$ 0,00

Fase 4 · prova cruzada em 28/10/2026 · 105 casos novos refeitos na interface do Kofra · 235 de 237 checagens iguais (as 2 diferenças estão explicadas abaixo) · 1 correção (gráfico por categoria, seção 1.6) · detalhes em `docs/relatorio-fase4.md`

## Como ler

| Marca | Significado |
|---|---|
| **CONFIRMADO** | Regra observada na referência e reproduzida pela fórmula abaixo em todos os casos de teste (tolerância R$ 0,01; diferença obtida R$ 0,00). |
| **NÃO CONFIRMADO** | Não deu para observar com segurança. O Kofra usa a regra indicada como provisória, e ela entra na lista do fim. |
| **DECISÃO KOFRA** | O Kofra faz diferente da referência de propósito (pedido da planta ou ajuste de clareza). |

Os casos ficam em `testes/*.csv` (separador `;`, vírgula decimal, colunas `obs_*` = o que a referência mostrou). `ferramentas/verificar_formulas.py` recalcula tudo e gera `testes/relatorio-verificacao.md`. Na Fase 3 os mesmos CSVs alimentam os testes Vitest do `engine/`.

## Convenções gerais

- **Dinheiro em centavos inteiros.** Nada de número com vírgula flutuante nos cálculos.
- **Arredondamento: meio para cima.** 30% de 6.000,15 = 1.800,045 → **1.800,05** (o arredondamento "bancário" daria 1.800,04 e foi descartado pelos testes). Vale também para percentuais: 41,5% → 42%; 11,75% → 11,8%.
- **Percentuais exibidos:** inteiros na reserva, na composição e nos gráficos de categoria; uma casa decimal no rendimento e nas calculadoras.
- **Mês de competência:** tudo é apurado por mês (ano + mês). "Mês atual" = mês do relógio do aparelho.
- **Formato:** pt-BR (R$ 1.234,56 · 8,5%). A referência mostra o rendimento como "8.5%", com ponto; o Kofra usa vírgula (DECISÃO KOFRA).

## Resumo

| # | Cálculo | Fórmula | Status | Casos |
|---|---|---|---|---|
| 1 | Saldo do mês (Orçamento) | receita − despesas fixas − despesas variáveis − investir | CONFIRMADO | 20 |
| 2 | Investir | % da receita (meio centavo para cima) ou valor fixo | CONFIRMADO (propagação entre meses: NÃO CONFIRMADO) | 11 |
| 3 | Receita prevista | não entra na receita; soma em "a receber" | CONFIRMADO | 2 |
| 4 | Gráfico por categoria | cada aba (Receita, Fixa, Variável) mostra só os seus itens; categoria ÷ total da aba, inteiro | CONFIRMADO (corrigido na Fase 4) | 1 + 11 |
| 5 | Parcelamento | parcela = total ÷ n; a 1ª absorve a sobra | CONFIRMADO | 2 |
| 6 | Patrimônio | liquidez + investimentos + bens − dívidas, mês a mês com herança | CONFIRMADO | 8 |
| 7 | Composição do patrimônio | item ÷ (liquidez + investimentos + bens), inteiro | CONFIRMADO | 1 |
| 8 | Rendimento | atual − investido; % = rendimento ÷ investido | CONFIRMADO | 5 |
| 9 | Meta da reserva | custo essencial × 6 ou 12 | CONFIRMADO | 3 |
| 10 | Progresso da reserva | soma dos locais ÷ meta, inteiro | CONFIRMADO | 7 |
| 11 | Visão geral | somas da janela; variação contra a janela anterior de mesmo tamanho | CONFIRMADO | 13 |
| 12 | Despesas do mês (Início) | despesas ÷ (receita − investir), inteiro | CONFIRMADO | 2 |
| 13 | Progresso da meta | guardado, falta, concluída | CONFIRMADO | 3 |
| 14 | Sugestão mensal da meta | falta ÷ meses até o prazo, em reais inteiros | CONFIRMADO | 14 |
| 15 | Juros compostos | saldo × (1 + i) + aporte, mês a mês | CONFIRMADO | 6 + 131 linhas |
| 16 | Primeiro milhão — tempo | menor nº de meses até R$ 1 milhão (máx. 100 anos) | CONFIRMADO | 10 |
| 17 | Primeiro milhão — aporte | aporte da série que chega a R$ 1 milhão no prazo | CONFIRMADO | 3 |

---

## 1. Orçamento

### 1.1 Receita do mês — CONFIRMADO
- `receita = soma das receitas confirmadas do mês`.
- **Repetir todos os meses:** a receita passa a existir do mês em que foi criada em diante, no mesmo dia. Editar uma recorrente vale "deste mês em diante".
- **Recebimento futuro (prevista):** não entra na receita. A soma das previstas pendentes aparece como **a receber**. Ao marcar como recebida, passa a contar; "ainda não recebi" troca a data prevista. A data precisa ser futura. *(orcamento_receita_prevista.csv)*
- Repetir e recebimento futuro são mutuamente exclusivos.

### 1.2 Despesas — CONFIRMADO
- **Fixa:** existe do mês de criação em diante, no mesmo dia de vencimento; não aparece em meses anteriores. Editar vale "deste mês em diante".
- **Variável:** lançamento só daquele mês.
- `despesas do mês = soma das fixas ativas no mês + soma das variáveis (inclui parcelas) do mês`.

### 1.3 Parcelamento — CONFIRMADO
```
parcela_padrão = arredonda(total ÷ n, 2 casas)
1ª parcela     = total − (n − 1) × parcela_padrão
demais         = parcela_padrão
data da k-ésima = dia 1º do (mês da compra + k − 1)
prévia          = "n× de R$ parcela_padrão"
```
1.000 em 3× → 333,34 · 333,33 · 333,33. 100 em 6× → 16,65 · 16,67 × 5. A soma das parcelas é sempre exatamente o total. *(parcelamento.csv)*

### 1.4 Investir — CONFIRMADO (com 1 ponto NÃO CONFIRMADO)
- **Modo percentual** (controle de 0 a 100%, passo 1; atalhos 20/30/40/50%): `investir = arredonda(receita × p ÷ 100, 2 casas)` e acompanha a receita quando ela muda.
- **Modo valor:** o valor digitado fica fixo; o percentual exibido é `valor ÷ receita × 100` com 1 casa (750 de 6.000 → 12,5%).
- A configuração é por mês: meses **anteriores** ao primeiro ajuste ficam com zero.
- **NÃO CONFIRMADO — propagação:** ajustar outubro para 30% fez novembro e dezembro mostrarem 30%; depois, mudar outubro para 20% **não** mudou novembro. A regra exata da referência não ficou clara.
  **Decisão (Checkpoint 2):** um ajuste vale "deste mês em diante" até o próximo ajuste; meses anteriores não mudam (igual às despesas fixas). *(orcamento_investir.csv)*

### 1.5 Saldo — CONFIRMADO
```
saldo = receita − despesas fixas − despesas variáveis − investir
```
Pode ficar negativo (investir 100% da receita → −2.200,00). *(orcamento_saldo.csv: 20 casos, incluindo meses sem receita e centavos)*

### 1.6 Gráfico por categoria — CONFIRMADO (corrigido na Fase 4)
Cada aba tem o seu gráfico: **Receita** (por tipo de renda; prevista só depois de recebida), **Fixa** (só despesas fixas) e **Variável** (só variáveis, com as parcelas). `% = valor da categoria ÷ total da aba × 100`, inteiro, meio para cima; cada fatia é arredondada sozinha, então a soma pode dar 99% ou 101% (out/2026: Mercado 67, Vestuário 32, Lazer 2).
*(orcamento_categorias.csv e conferencia/orcamento_categorias.csv: 1 + 11 casos)*

**Correção:** na Fase 2 este item dizia "fixas e variáveis juntas". Na Fase 4 a aba Fixa mostrou só a fixa (Moradia 100%) e o print da Fase 2 mostrou que o 68% / 32% era da aba Variável (Mercado 700 e Vestuário 333,34). Foi coincidência: 1.500 ÷ 2.200 e 700 ÷ 1.033,34 também dão 68% e 32%. O Kofra foi corrigido.

---

## 2. Patrimônio — CONFIRMADO

### 2.1 Modelo mês a mês
Cada item (liquidez, bem, dívida, investimento) guarda **um valor por mês**. O valor de um mês vale para os seguintes até ser alterado; antes do mês de criação o item não existe. Ex.: carro 30.000 em outubro, reavaliado para 29.000 em novembro → outubro continua 30.000, novembro em diante 29.000.

### 2.2 Total
```
patrimônio(mês) = Σ liquidez + Σ valor atual dos investimentos + Σ bens − Σ dívidas
```
A tela de Patrimônio mostra sem centavos (42.983); a Visão geral e o Início mostram com centavos. *(patrimonio.csv: 8 casos)*

### 2.3 Composição — CONFIRMADO
Base = liquidez + investimentos + bens (dívidas fora). Investimentos entram **agrupados por tipo**. `% = valor ÷ base × 100`, inteiro → 54 / 19 / 18 / 8 / 1. Depois vêm visões por grupo (liquidez, bens, dívidas) com "% neste tipo". *(patrimonio_composicao.csv)*

### 2.4 Moeda estrangeira — NÃO CONFIRMADO
Liquidez e dívidas aceitam dólar; o valor em reais usa a "cotação de hoje" (US$ 1 = R$ 5,34, mudou durante o teste). Fonte e horário da cotação não foram identificados.
**Decisão (Checkpoint 2):** a v1 do Kofra trabalha só em reais; moeda estrangeira com cotação automática vai para o roadmap junto com a versão na nuvem.

---

## 3. Investimentos — CONFIRMADO
- Ativo: nome, onde está, tipo (renda fixa, renda variável, fundos imobiliários, internacional, criptoativos), valor investido, valor atual. Mesmo modelo mês a mês do Patrimônio.
- `rendimento = valor atual − valor investido` · `rendimento % = rendimento ÷ investido × 100` (1 casa).
- Cards: valor atual (soma), total investido (soma), rendimento (soma e % sobre o total investido). Lista e gráfico agrupados por tipo. *(investimentos_rendimento.csv)*
- **NÃO CONFIRMADO:** percentual quando o investido é zero. **Kofra:** mostra "—".

---

## 4. Reserva de emergência

### 4.1 Meta — CONFIRMADO
`meta = custo essencial mensal × meses` · Básico = 6 meses (renda fixa) · Blindado = 12 meses (renda variável). O custo pode ser digitado ou vir da soma das despesas do mês passado que a pessoa marcar. *(reserva_meta.csv)*

### 4.2 Valor atual — CONFIRMADO
`valor atual = Σ locais`. Um local pode ser digitado (com aportes e saques) ou vinculado a um investimento (acompanha o valor atual dele). *(reserva_percentual.csv, RS07: dois locais)*

### 4.3 Percentual — CONFIRMADO
`% = arredonda(valor atual ÷ meta × 100)`, inteiro, meio para cima. Consequências observadas: 41,5% → 42%; 99,5% aparece como 100% ainda incompleta; R$ 0,01 aparece como 0%.

### 4.4 Estados — DECISÃO KOFRA
A planta pede 3 estados; o Kofra usa:

| Estado | Condição | Texto (Kofra) |
|---|---|---|
| Sem cobertura | valor atual = 0 | "Comece a abrir seu guarda-chuva: registre onde a reserva está guardada." |
| Cobertura parcial | 0 < valor atual < meta | "Faltam R$ X para cobrir tudo." |
| Cobertura total | valor atual ≥ meta | "Pode chover: sua meta foi atingida." |

A referência tem 6 faixas; os limites intermediários não foram medidos (NÃO CONFIRMADO) e **não serão usados**. A faixa que se compara com "os brasileiros" cita uma estatística sem fonte e fica fora do Kofra.

---

## 5. Metas — CONFIRMADO

### 5.1 Progresso
```
guardado  = Σ aportes − Σ retiradas   (ou valor atual dos investimentos vinculados)
falta     = total − guardado          (enquanto guardado < total)
concluída = guardado ≥ total
barra %   = mín(100, guardado ÷ total × 100)
```
*(metas_progresso.csv)*

### 5.2 Sugestão mensal ("guarde ~R$ N/mês")
```
meses = máx(1, (ano_prazo − ano_hoje) × 12 + (mês_prazo − mês_hoje))   ← o dia não conta
N     = arredonda(falta ÷ meses), em reais inteiros
oculta se: sem prazo, prazo antes de hoje, ou falta ≤ 0
```
12.000 até 31/12/2027 (14 meses) → 857 · com 10.850 já guardados em 20.000 → 654. *(metas_aporte_mensal.csv: 14 casos)*
**DECISÃO KOFRA:** a referência só mostra a sugestão no formulário de criação; o Kofra mostra também no card da meta, recalculada com o que falta (extra pedido na planta).

---

## 6. Visão geral — CONFIRMADO

### 6.1 Janela
Mês atual, 3, 6 ou 12 meses (sempre terminando no mês atual) ou personalizada (mês inicial e final, até o mês atual). A janela anterior tem o **mesmo tamanho e vem imediatamente antes** (set–out → jul–ago).

### 6.2 Fluxos (Receita e Gastos)
```
receita da janela = Σ receitas dos meses   ·   gastos = Σ despesas dos meses
saldo do período  = receita − gastos        (não desconta o investir)
variação          = valor da janela − valor da janela anterior
```
Se o valor da janela anterior for zero, o card mostra "sem período anterior" — decidido **card a card** (receita pode comparar enquanto gastos não). *(visao_geral.csv: 8 casos)*

### 6.3 Estoques (Patrimônio, Investimentos, Reserva)
Valor no **último mês da janela** comparado com o último mês da janela anterior; zero → "sem período anterior". *(visao_geral_estoques.csv)*
**NÃO CONFIRMADO:** como a referência obtém a reserva em meses passados. **Kofra:** usa os aportes e saques com data para reconstruir o valor em qualquer mês.

### 6.4 Decisões Kofra
- **Variação em R$ e em %** juntas (decisão do Checkpoint 2; a planta pede seta + percentual): `% = variação ÷ |anterior| × 100`, 1 casa; sem anterior → só o aviso.
- O gráfico mensal mostra **todos** os meses da janela (a referência pula meses vazios).

---

## 7. Início — CONFIRMADO
- O card principal é escolhido pela pessoa: patrimônio total (padrão), investimentos, despesas do mês, saldo, reserva, bens ou uma meta. Cada opção reaproveita o cálculo do módulo de origem.
- **Despesas do mês:** `% do orçamento = arredonda(despesas ÷ (receita − investir) × 100)` (2.533,34 ÷ 4.200,10 → 60%). *(inicio_indicadores.csv)*
- Reserva e metas no card: percentual limitado a 100%.
- **NÃO CONFIRMADO:** comportamento quando receita − investir ≤ 0. **Kofra:** barra cheia em vermelho e "sem orçamento livre neste mês".

---

## 8. Calculadoras — CONFIRMADO

### 8.1 Juros compostos
```
i (mensal) = taxa ÷ 100                    se a taxa for mensal
i (mensal) = (1 + taxa ÷ 100)^(1/12) − 1   se a taxa for anual (taxa equivalente)
n          = meses, ou anos × 12
mês a mês:  juros_m = saldo_(m−1) × i ;  saldo_m = saldo_(m−1) × (1 + i) + aporte mensal
valor final = saldo_n · investido = inicial + aporte × n · juros = final − investido
percentuais = parte ÷ valor final × 100 (1 casa)
```
Sem arredondar no meio do caminho (só na exibição). Taxa zero ou período zero → não simula e pede taxa e período. Tabela mês a mês e gráfico anual. *(juros_compostos.csv: 6 casos; juros_compostos_mes_a_mes.csv: 131 linhas, 393 checagens)*

### 8.2 Primeiro milhão — descobrir o tempo
```
meta fixa = 1.000.000
se inicial ≥ meta → aviso "já atingiu"
n = menor nº de meses (1 a 1.200) com saldo_n ≥ meta, com a mesma série do 8.1
se não houver n ≤ 1.200 (100 anos) → aviso "inalcançável em até 100 anos"
investido = inicial + aporte × n · juros = meta − investido   ← sobre a meta, não sobre o saldo
percentuais = parte ÷ 1.000.000 × 100 (1 casa)
texto: "19 anos e 4 meses", "1 ano", "11 meses", "20 anos"
```
Limite confirmado nos dois lados: 0,29% a.m. com R$ 100/mês → 97 anos e 11 meses; 0,28% → inalcançável. *(primeiro_milhao_tempo.csv: 10 casos)*
**DECISÃO KOFRA:** singular correto ("1 mês", "1 ano e 1 mês"), que não apareceu nos testes.

### 8.3 Primeiro milhão — descobrir o aporte
```
n = prazo em anos × 12
se inicial × (1 + i)^n ≥ meta → aviso "valor inicial já é suficiente"; investido = inicial
senão aporte = (meta − inicial × (1 + i)^n) × i ÷ ((1 + i)^n − 1)
investido = inicial + aporte × n   ← usa o aporte sem arredondar
juros = meta − investido
```
10.000 em 20 anos a 1% a.m. → 900,75/mês. *(primeiro_milhao_aporte.csv: 3 casos)*
**NÃO CONFIRMADO:** taxa zero neste modo. **Kofra:** aporte = (meta − inicial) ÷ n.

---

## 9. Lista NÃO CONFIRMADO

| # | Ponto | O que o Kofra faz por enquanto |
|---|---|---|
| 1 | Propagação do "Investir" quando se altera um mês que já foi herdado | Vale deste mês em diante até o próximo ajuste (decidido no CP2) |
| 2 | Limites das faixas intermediárias de mensagem da reserva | Não usa: 3 estados da planta |
| 3 | Valor da reserva em meses passados (Visão geral) | Reconstrói pelos aportes e saques datados |
| 4 | Fonte e horário da cotação do dólar | v1 só em reais (decidido no CP2) |
| 5 | Formatos aceitos em "Importar extrato" | Fora da v1 (decidido no CP2) |
| 6 | Tipos de notificação (o sino estava vazio) | Avisos próprios do Kofra (aprovados no CP2): receita prevista atrasada, despesa fixa vencendo em até 3 dias, meta com prazo em até 30 dias |
| 7 | Rendimento % com investido = 0 | Mostra "—" |
| 8 | Despesas do mês % com receita − investir ≤ 0 | Barra cheia e aviso |
| 9 | Primeiro milhão (aporte) com taxa 0 | (meta − inicial) ÷ n |
| 10 | Empate exato em ,5 no % inteiro da composição | Meio para cima (mesma regra do resto) |
| 11 | Juros compostos com valor inicial e aporte zerados | Mostra zeros |
| 12 | Texto "Na média do costume" na Visão geral (Fase 4): out/2026 com receita de R$ 6.000,15 contra R$ 14.000,00 em setembro não mostrou a variação; já ago/2026 mostrou "R$ 1.000,00 a menos" | Mostra sempre a variação real em R$ e % (−R$ 7.999,85, −57,1%) |
| 13 | Reserva em meses passados no Início (Fase 4): o card mostrou o valor de hoje em set/2026 (R$ 1.000, 42%), enquanto a Visão geral mostrou R$ 0,00 para setembro | Usa o histórico com data nos dois lugares (setembro = R$ 0,00) |
| 14 | Dólar em lugares diferentes (Fase 4): a Visão geral usou o valor guardado (US$ 100 = R$ 533,50) e o Início/Patrimônio a cotação do dia (R$ 535,13) | v1 só em reais (CP2) |
| 15 | Meta da reserva com novos valores (Fase 4): mudar o nível ou o custo exigia alterar a configuração real da conta, e isso foi bloqueado | Continua a fórmula confirmada na Fase 2 (3 casos) + 1 caso novo igual |

## 10. Decisões Kofra (diferenças intencionais)

1. Variação em R$ e % na Visão geral.
2. Reserva com 3 estados, textos próprios e a metáfora do guarda-chuva; nenhuma estatística sem fonte.
3. Percentuais com vírgula (pt-BR).
4. Sugestão mensal também no card da meta.
5. Gráfico da Visão geral com todos os meses da janela.
6. Singular e plural corretos nos tempos.
7. Investir vale deste mês em diante; v1 só em reais; sem importação de extrato na v1.
8. Comportamentos provisórios da lista acima, até haver confirmação.
9. Reserva acima da meta (Fase 4): o Kofra mostra o percentual real (ex.: 150%) junto do estado "Cobertura total"; a referência mostra só a mensagem de 100%.
10. Composição do patrimônio (Fase 4): rosca por grupo (liquidez, investimentos, bens) e lista com todos os itens e seus percentuais; a referência mostra uma rosca por item e outra por grupo. Os percentuais são os mesmos.
11. Textos de interface próprios (revisados na Fase 4 para não repetir frases da referência), por exemplo "Separe ~R$ N por mês até o prazo" no lugar da frase da referência.
12. Formulário de lançamento sem categoria pré-escolhida (Fase 4): pede a escolha, para nada cair sem querer na primeira categoria da lista.
