# Pila — Mapa complementar

O que a planta não detalhava, como a referência resolve (só estrutura e comportamento) e como fica no Pila. Navegado em 27/10/2026 no layout de celular da referência; o layout de computador segue a planta (barra lateral fixa).

Legenda: **v1** = entra agora · **depois** = vai para o roadmap. As decisões do Checkpoint 2 já estão aplicadas.

## 1. Estrutura geral

| Tema | Referência | Pila |
|---|---|---|
| Navegação no celular | Barra superior (logo, sino, engrenagem, mês compacto) + barra inferior com 5 itens: Início, Orçamento, Investimentos, Patrimônio, Mais. "Mais" abre uma folha com o resto + sair. | **v1** igual na estrutura, com o visual Marinho. No computador: barra lateral da planta. |
| Seletor de mês | Setas ‹ › com "Out 2026"; só aparece nas telas que dependem de mês. | **v1** em Início, Orçamento, Investimentos e Patrimônio (planta). Mês escolhido vale para todas essas telas. |
| Ocultar valores | Olho ao lado do título de cada tela. | **v1** botão global no cabeçalho; vale para o app inteiro e fica lembrado. |
| Notificações | Sino; nenhuma apareceu ("nada por aqui"). | **v1** (aprovado no CP2) avisos calculados ao abrir o app — receita prevista atrasada, despesa fixa vencendo em até 3 dias, meta com prazo em até 30 dias. Sem push. |
| Primeiro uso | Tour de 4 passos no Orçamento (receita → aba fixa → adicionar). | **v1** dicas curtas e dispensáveis no primeiro acesso a cada tela vazia, com texto próprio. |
| Estados vazios | Mensagem + botão de ação em todas as listas. | **v1** todas as telas e listas com estado vazio próprio. |
| Ajuda contextual | Botão "Ajuda?" na Reserva abre explicação. | **v1** botão de ajuda na Reserva (planta) e nas calculadoras. |

## 2. Início
- **Card principal personalizável:** um botão de editar abre a escolha do indicador: patrimônio total (padrão), investimentos, despesas do mês (com barra de % do orçamento), saldo do mês, reserva (valor, meta e barra), bens, e cada meta criada (valor, total e barra). → **v1**.
- **Atalhos:** grade com todas as seções. → **v1** como lista de atalhos da planta.

## 3. Visão geral
- Filtros: mês atual, 3, 6, 12 meses e personalizado (mês inicial–final, só até o mês atual).
- Blocos na referência: Receita, Gastos, Saldo do período (com gráfico de área mês a mês: receita, gastos, saldo), Patrimônio (com gráfico), Investimentos, Reserva — todos com comparação ao período anterior.
- **Pila v1:** grade 2×2 (Receita, Gastos, Patrimônio, Investimentos) com seta + valor + % da variação (aprovado no CP2); abaixo, gráfico do saldo do período e o card da Reserva.

## 4. Orçamento
- **Cards:** Receita (mostra "a receber" quando há receita prevista), Investir (botão de ajuste), Despesas, Saldo.
- **Abas:** Receita · Fixa · Variável. Lista com data (ordenável), nome + etiqueta da categoria, valor (despesa com sinal de menos). Marcadores de parcela "1/3".
- **Barra de ações:** ver tabela/gráfico (no celular), limpar lançamentos do mês, importar extrato, copiar lançamentos fixos de outro mês, filtro (busca por nome + categorias), adicionar.
- **Formulários:** receita (data, valor, descrição, repetir todo mês *ou* recebimento futuro, tipo de renda); despesa fixa (vencimento, valor, descrição, categoria — vale deste mês em diante); despesa variável (data, valor, parcelado → total + nº de parcelas com prévia, descrição, categoria). Edição de recorrentes vale "deste mês em diante".
- **Investir:** controle 0–100% com atalhos 20/30/40/50% ou valor digitado.
- **Categorias:** tela própria; despesa e receita; nova categoria (nome), trocar cor (~21 cores + automática), arquivar, excluir. Sem ícones.
- **Pila:**
  - **v1** cards, abas, lista, filtro, formulários, recorrência, receita prevista, parcelamento, investir, gráfico por categoria, limpar mês (com confirmação), copiar fixos de outro mês, tela de categorias **com ícone + cor** (planta).
  - Categorias iniciais genéricas: Moradia, Mercado, Transporte, Saúde, Educação, Lazer, Restaurantes, Vestuário, Contas, Trabalho, Outros; receitas: Salário, Renda extra, Outros.
  - **depois** importar extrato bancário (decidido no CP2).

## 5. Assistente
- Referência: chat que responde e **cadastra** lançamentos, despesas fixas, parcelas, investimentos, patrimônio, reserva e metas por texto, foto ou áudio; "desfazer"; integração com WhatsApp.
- **Pila v1:** chat com Claude (quando aberto no claude.ai): perguntas sobre seus números e sugestões de lançamento que só entram depois que você confirma. Fora do claude.ai, mostra "em breve". **depois:** foto/áudio e WhatsApp.

## 6. Reserva de emergência
- Configuração: nível Básico (6 meses) ou Blindado (12); custo essencial digitado ou somado a partir das despesas do mês passado marcadas numa lista.
- Locais: nome + valor, ou vínculo com um investimento (valor acompanha). Editar local: aporte (+), saque (−), excluir.
- **Pila v1:** modal em 3 passos (nível → custo → onde está), guarda-chuva com 3 estados, lista de locais com aporte/saque **datados** (para a Visão geral saber o valor em meses passados), botão de ajuda.

## 7. Metas
- Criar: cor, nome, valor total, prazo opcional, onde vai guardar (texto) **ou** vincular investimentos (vários; o valor acompanha). Prévia "guarde ~R$ N/mês".
- Card: nome, prazo, guardado, quanto falta, barra, local, botão movimentar; ao atingir, "concluída".
- Movimentar: guardar ou retirar, com data e valor; histórico, mais recente primeiro.
- **Pila v1:** tudo isso + emoji/ícone (planta) + sugestão mensal também no card.

## 8. Investimentos
- Cards: valor atual, total investido, rendimento (R$ e %). Lista agrupada por tipo; gráfico por tipo.
- Novo ativo: nome, onde está, tipo (renda fixa, renda variável, fundos imobiliários, internacional, criptoativos), investido, atual, prévia do rendimento. Valor por mês com herança.
- **Pila v1:** igual na estrutura; 3 cards + lista + rosca por tipo (planta).

## 9. Patrimônio
- Cards: Liquidez, Investimentos, Bens, Dívidas (sem centavos) + composição em carrossel (total e por grupo) com escolha de cores.
- Formulários por grupo; bens com tipo (imóvel, veículo, outros) e busca na tabela FIPE para veículos; moeda real ou dólar.
- **Pila v1:** 5 cards (planta: total + 4 grupos), rosca da composição, listas por grupo, valor por mês com herança, só em reais. **depois:** busca FIPE e dólar (decidido no CP2).

## 10. Aprender
- Referência: aulas em vídeo numeradas, marcar como assistida, lista de aulas, próxima aula, curtidas, e-book, comentários.
- **Pila v1:** 3 aulas em texto editáveis (uma sobre reserva), marcar como lida, próxima aula. Sem vídeo, comentários ou curtidas.

## 11. Calculadoras
- Lista de calculadoras → tela de cada uma. Formulário recolhível ("dados da simulação") depois de calcular; limpar e calcular.
- Juros compostos: valor inicial, mensal, taxa (mensal/anual), período (meses/anos); resultado com 3 valores, rosca, abas gráfico anual / tabela mês a mês.
- Primeiro milhão: modo "descobrir o tempo" (inicial, mensal, taxa) e "descobrir o aporte" (inicial, prazo, taxa); tempo ou aporte em destaque + composição investido × juros.
- **Pila v1:** as duas, com as fórmulas confirmadas.

## 12. Suporte
- Referência: vídeo de apresentação, botão de WhatsApp e e-mail. Sem perguntas frequentes.
- **Pila v1:** perguntas frequentes (planta) + WhatsApp e e-mail como campos a preencher.

## 13. Configurações
- Referência: aparência (claro/escuro/sistema), moeda de exibição (lista pesquisável), compartilhar (convites), documentos legais, central de ajuda, conta, excluir conta.
- **Pila v1:** aparência, moeda (BRL padrão), compartilhar desativado com aviso, documentos, ajuda, conta, **dados: exportar e importar backup (JSON)**, zona de perigo "apagar todos os dados" com confirmação digitada.

## 14. Fica para depois (roadmap)
Importar extrato bancário · moeda estrangeira com cotação automática · WhatsApp · busca FIPE · compartilhamento real · login e sincronização na nuvem · aulas em vídeo.
