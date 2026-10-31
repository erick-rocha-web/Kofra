# Pila — Relatório da Fase 4 (verificação)

28/10/2026 · tudo rodado sobre o build final (`dist/`), na interface real do app, sem atalhos no código.

## Resumo

| Verificação | Resultado |
|---|---|
| Testes automáticos do engine (Vitest) | **161 de 161** (135 das Fases 2–3 + 26 casos novos da Fase 4) |
| Verificador das fórmulas da Fase 2 (Python) | **630 de 630** checagens |
| Prova cruzada referência × Pila | **17 cálculos · 105 casos novos · 235 de 237 checagens iguais**; as 2 diferenças estão explicadas na seção 2.3 |
| Uso real (do zero, só pela interface) | **22 de 22 passos** sem erro e sem mensagem de erro no console (3 rodadas seguidas) |
| Largura de celular (320, 360 e 390 px) | **228 telas e diálogos** sem rolagem lateral e sem nada saindo da tela |
| Originalidade | nome, logo, imagens e código da referência: **nenhum**; textos: **78 trechos de texto reescritos**, sobraram só termos genéricos |
| Acessibilidade (extra, axe-core WCAG 2.1 AA) | **0 violações** em 64 telas (claro/escuro, computador/celular) depois de 2 correções |

### O que mudou no app por causa da Fase 4

1. **Gráfico por categoria (correção de cálculo).** Cada aba do Orçamento agora tem o seu gráfico: Receita, Fixa ou Variável. Na Fase 2 eu tinha registrado "fixas e variáveis juntas"; a Fase 4 mostrou que estava errado (detalhes na seção 2.3). Engine, interface, CSV da Fase 2 e testes foram corrigidos.
2. **Composição do patrimônio:** a lista "O que mais pesa" mostrava só os 5 maiores itens; agora mostra todos (até 8, depois agrupa o resto). Na conferência, o 6º item (Dólar, 1%) não aparecia.
3. **Formulário de lançamento sem categoria pré-escolhida:** no uso real, uma TV caiu sozinha em "Moradia" (a primeira da lista). Agora o app pede a escolha.
4. **Contraste no tema claro:** verde, azul e vermelho de texto ficaram um pouco mais escuros para passar 4,5:1 sobre os fundos suaves.
5. **Gráfico de rosca acessível:** o desenho fica escondido do leitor de tela (o resumo em texto continua no contêiner), as fatias não recebem foco e não repetem `id` no HTML.
6. **Textos próprios:** 78 trechos de texto (rótulos, botões, títulos, placeholders e frases de ajuda) que coincidiam ou se pareciam com a referência foram reescritos (seção 5).

---

## 1. Testes automáticos

- `npm test` → 8 arquivos, **161 testes**, todos verdes. Os 26 novos estão em `src/engine/conferencia.test.ts` e leem `testes/conferencia/*.csv` (calculadoras e gráfico por aba, com os valores vistos hoje na referência).
- `python3 ferramentas/verificar_formulas.py` → **630 de 630** (relatório em `testes/relatorio-verificacao.md`). O arquivo `orcamento_categorias.csv` da Fase 2 foi corrigido (seção 2.3) e continua passando.
- `npm run build` faz a checagem de tipos do TypeScript antes de gerar o app: sem erros.

## 2. Prova cruzada (referência × Pila)

### 2.1 Como foi feita

1. **Referência:** naveguei como usuário comum, em ritmo normal, sem chamar a API, e anotei o que cada tela mostrou. Calculadoras, prévias de formulário e filtros foram só lidos. Para ter casos novos de verdade, editei e criei **apenas dados de teste "TESTE KOFRA"** (lista na seção 2.5). Uma alteração na configuração real da reserva foi bloqueada pelo próprio ambiente; cancelei e nada mudou (seção 2.4).
2. **Pila:** montei réplicas dos mesmos dados usando as próprias ações do app (`ferramentas/fase4/montar_sementes.ts`), carreguei no app servido localmente e li os números **na tela** com o Playwright (`ferramentas/fase4/conferencia.cjs`). Calculadoras e prévias foram preenchidas campo a campo, como uma pessoa faria.
3. **Comparação:** igualdade exata em centavos e nos percentuais exibidos. Onde a referência mostra reais inteiros (tela de Patrimônio, lista de Investimentos, card da meta), comparei o valor do Pila arredondado para reais.

Resultado linha a linha: `testes/conferencia/resultado.csv`. Anotações da referência: `docs/observacoes-referencia-fase4.md`.

### 2.2 Resultado por cálculo

| Cálculo | Casos | Checagens iguais |
|---|---:|---:|
| Saldo do mês | 7 | 14 de 14 |
| Investir | 7 | 7 de 7 |
| Receita prevista | 7 | 14 de 14 |
| Gráfico por categoria | 11 | 11 de 11 |
| Parcelamento | 8 | 8 de 8 |
| Patrimônio | 5 | 5 de 5 |
| Composição do patrimônio | 6 | 6 de 6 |
| Rendimento | 8 | 16 de 16 |
| Visão geral | 7 | 56 de 57 |
| Despesas do mês (Início) | 5 | 5 de 5 |
| Progresso da reserva | 5 | 14 de 15 |
| Meta da reserva | 3 | 3 de 3 |
| Progresso da meta | 5 | 10 de 10 |
| Sugestão mensal da meta | 6 | 6 de 6 |
| Juros compostos | 5 | 20 de 20 |
| Primeiro milhão — tempo | 5 | 20 de 20 |
| Primeiro milhão — aporte | 5 | 20 de 20 |
| **Total** | **105** | **235 de 237** |

Casos que valem destacar, todos iguais nos dois lados:

- **Empates em ,5:** 2.050,00 em 4 meses → "~R$ 513" (512,5 sobe); 0,05 em 2× → parcela de R$ 0,03; 26,45% e 73,55% → 26,5% e 73,6% no primeiro milhão.
- **Arredondamento do investir:** 30% de 1.333,33 = 399,999 → R$ 400,00.
- **Parcela que absorve para baixo:** 99,99 em 4× → 1ª parcela R$ 24,99, demais R$ 25,00, todas no dia 1º.
- **Despesas do mês acima de 100%:** 188%, 281% e 178% com a barra cheia.
- **Percentuais que somam 101%:** Mercado 67, Vestuário 32, Lazer 2.
- **Tempo sem meses:** "16 anos".

### 2.3 Diferenças encontradas

| Onde | Referência | Pila | O que foi feito |
|---|---|---|---|
| Gráfico por categoria (achado da Fase 4) | cada aba só com os seus itens | juntava fixas e variáveis | **Corrigido.** O "68% / 32%" da Fase 2 era da aba Variável (Mercado 700 e Vestuário 333,34), não "Aluguel + Mercado"; os dois pares dão 68/32 por coincidência. Conferi no print da Fase 2. |
| Visão geral, receita de out/2026 | "Na média do costume", sem número | −R$ 7.999,85 (−57,1%) | **NÃO CONFIRMADO.** A mesma tela mostrou "R$ 1.000,00 a menos" em ago/2026, então não é "toda queda". O Pila mantém a variação real (decisão do CP2: R$ e % juntos). |
| Reserva acima da meta (R$ 3.600,00 de R$ 2.400,00) | "100% protegido", sem número | "Cobertura total" + 150% | **DECISÃO PILA**, mantida: mostra quanto passou da meta. |

### 2.4 Limitação: meta da reserva

Para medir a meta com outros valores, era preciso mudar o nível e o custo da **sua** configuração de reserva (não é dado de teste). O ambiente bloqueou a gravação; cancelei o diálogo e conferi que tudo ficou como antes (Blindado, R$ 200,00, meta R$ 2.400,00). Por isso a meta da reserva tem 1 caso novo (R$ 2.400,00) e 2 casos da Fase 2 (R$ 6.000,00 e R$ 15.000,00), todos iguais no Pila. A fórmula (custo × 6 ou × 12) segue confirmada.

### 2.5 Dados de teste criados ou alterados na referência hoje

- Variável **TESTE KOFRA Parcelado 4x** — R$ 99,99 em 4×, compra em 20/01/2027, Lazer (parcelas de jan a abr/2027).
- Receitas previstas **TESTE KOFRA Prevista Jan** (R$ 333,33, 15/01/2027, já marcada como recebida) e **TESTE KOFRA Prevista Fev** (R$ 250,50, 20/02/2027).
- Investimentos: **TESTE KOFRA CDB** com valor atual de R$ 11.111,11 em jan/2027 e R$ 9.876,54 em fev/2027; **TESTE KOFRA Acoes** com R$ 4.321,09 em jan/2027.
- Reserva: **TESTE KOFRA Reserva 2** ganhou 4 aportes e 1 saque em 28/10 (saldo final igual ao de antes, R$ 1.000,00).
- Meta **TESTE KOFRA Viagem**: 2 movimentações novas (−R$ 1.234,56 e +R$ 8.934,56); o total voltou para R$ 12.000,00.

Nada foi apagado. A lista de limpeza foi atualizada com esses itens.

## 3. Uso real

Um mês de uso começando com o app vazio, só pela interface (`ferramentas/fase4/uso-real.cjs`). Cada passo confere os números esperados.

| # | Passo | Resultado |
|---:|---|---|
| 1 | Início vazio | OK |
| 2 | Configurações: nome e tema escuro → claro | OK |
| 3 | Categoria nova "Pets" | OK |
| 4 | Receita recorrente R$ 5.000,00 no dia 5 | OK |
| 5 | Receita prevista R$ 800,00 (o app pede de onde vem a receita antes de salvar) | OK |
| 6 | Despesa fixa R$ 1.800,00 | OK |
| 7 | Mercado R$ 432,10 e TV R$ 2.399,90 em 10× (prévia "10× de R$ 239,99") | OK |
| 8 | Investir 15% → R$ 750,00; saldo R$ 1.777,91 | OK |
| 9 | Novembro herda recorrentes, parcela e investir; "Previsto R$ 800,00"; saldo R$ 2.210,01 | OK |
| 10 | Marcar a prevista como recebida → receita R$ 5.800,00, investir R$ 870,00, saldo R$ 2.890,01 | OK |
| 11 | Copiar o mercado de outubro para dezembro | OK |
| 12 | Patrimônio: 12.500 + 42.000 − 18.000 = R$ 36.500 | OK |
| 13 | Investimento R$ 3.000,00 → R$ 3.041,27: +R$ 41,27 (+1,4%) | OK |
| 14 | Assistente da reserva: Básico, custo R$ 3.000,00, R$ 4.500,00 guardados → meta R$ 18.000,00, 25% | OK |
| 15 | Meta de R$ 6.000,00 até 30/06/2027: "~R$ 750"; depois de guardar R$ 1.000,00: falta R$ 5.000,00, "~R$ 625" | OK |
| 16 | Visão geral: 3 meses e período escolhido | OK |
| 17 | Ocultar valores: nenhum número aparece em 7 telas | OK |
| 18 | Sino com avisos | OK |
| 19 | Aula marcada como lida (1 de 3) | OK |
| 20 | Assistente fora do claude.ai mostra "em breve" | OK |
| 21 | Exportar backup, apagar tudo e importar: dados idênticos | OK |
| 22 | Dados continuam depois de recarregar | OK |

## 4. Largura de celular

`ferramentas/fase4/celular.cjs` abriu as 16 telas em 320, 360 e 390 px, no claro e no escuro, vazias e com dados, mais as abas Fixa e Variável e 4 diálogos: **228 telas, nenhuma com rolagem lateral ou elemento fora da tela.** Os seletores longos (período da Visão geral e grupos do Patrimônio) rolam dentro do próprio controle, de propósito. Fotos em 360 px ficam em `ferramentas/fase4/saida/celular/` quando o script roda.

## 5. Originalidade

**Nome, logo, imagens e código.** Busquei o nome da plataforma de referência em todo o projeto (código, testes, documentos e build): nenhuma ocorrência. O build não tem imagens embutidas; os ícones são Phosphor (licença MIT) e o logo é desenho próprio. O app não acessa nenhum endereço da referência. A estatística sem fonte ("melhor que 80% dos brasileiros") não aparece no Pila.

**Textos.** Comparei os 900 textos que o Pila mostra (telas, diálogos, rótulos de acessibilidade e placeholders) e o código-fonte com o texto lido (OCR) de 453 prints da referência, procurando linhas e sequências de 3 a 5 palavras iguais. Reescrevi 78 trechos (rótulos, botões, títulos, placeholders e frases de ajuda) que coincidiam ou se pareciam com a referência, por exemplo:

| Antes (igual à referência) | Agora |
|---|---|
| Descobrir o tempo / Descobrir o aporte | Em quanto tempo / Quanto por mês |
| Aporte mensal necessário | Guardar por mês |
| Composição do primeiro milhão | Do que o milhão é feito |
| Valor investido / Total em juros (calculadoras) | Sai do seu bolso / Juros ganhos |
| Repetir todos os meses / Recebimento futuro | Repete todo mês / Ainda vou receber |
| Tipo de renda / Tipos de renda | De onde vem / Fontes de renda |
| Recebimento previsto · Ainda não recebi · Nova data prevista | Receita prevista · Adiar a data · Nova data |
| A receber R$ X | Previsto R$ X |
| Nome da meta · Onde vai guardar · Prazo (opcional) | Nome · Guardar em · Prazo (se tiver) |
| Movimentar · Meta concluída · Faltam R$ X | Guardar ou tirar · Meta alcançada · Falta juntar R$ X |
| Guarde ~R$ N por mês para chegar lá | Separe ~R$ N por mês até o prazo |
| Nível de proteção · Valor guardado hoje · Onde está | Nível da reserva · Quanto tem lá hoje · Nome do local |
| a mais / a menos que no período anterior | acima / abaixo do período anterior |
| Saldo do período · Personalizar · Mês inicial / Mês final | Resultado do período · Escolher período · De / Até |
| Pergunte ou peça para registrar… | Escreva uma pergunta ou peça um lançamento… |
| Ex.: Tesouro Direto, CDB, Poupança / Ex.: Conta corrente, Poupança | Ex.: CDB do banco, conta separada / Ex.: conta do banco, carteira |

Sobraram só termos genéricos ou que são a própria estrutura da planta: nomes das telas e da navegação (Início, Orçamento, Investimentos, Patrimônio, Reserva de emergência, Despesas do mês), abas Receita/Fixa/Variável, "Renda fixa", "Renda variável", "Taxa de juros", "Valor inicial", "Valor mensal", "Valor total", "Valor atual", "Tipo de bem", "Nova meta", "Nova receita", "Nova despesa fixa/variável" e "Claro/Escuro/Sistema".

## 6. Acessibilidade (extra)

`ferramentas/fase4/a11y.cjs` roda o axe-core (regras WCAG 2.0/2.1 A e AA) nas 16 telas, nos temas claro e escuro, em computador e celular. Antes: contraste insuficiente em 4 textos do tema claro (4,3–4,4 : 1) e o gráfico de rosca sem nome no SVG. Depois das correções do resumo: **0 violações**.

## 7. Como repetir

```bash
npm install
npm test                                   # 161 testes do engine
python3 ferramentas/verificar_formulas.py  # 630 checagens da Fase 2
npm run build
cd dist && python3 -m http.server 4173     # deixe rodando em outro terminal
# precisa do Playwright: npm i -D playwright && npx playwright install chromium
npx vite-node ferramentas/fase4/montar_sementes.ts   # gera as réplicas dos dados de teste
node ferramentas/fase4/conferencia.cjs     # prova cruzada → ferramentas/fase4/saida/conferencia.json
node ferramentas/fase4/uso-real.cjs        # uso real
node ferramentas/fase4/celular.cjs         # larguras de celular
npm i -D axe-core@4.10.2 && node ferramentas/fase4/a11y.cjs   # acessibilidade
```

## 8. Fica para a Fase 5

- O Assistente só pode ser testado de verdade dentro do claude.ai: testei com uma simulação da conexão; a primeira pergunta pede a sua permissão.
- A lista de dados de teste para apagar na referência foi atualizada com os itens da seção 2.5.
