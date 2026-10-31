# Pila — Roadmap

Sem login, o Pila roda inteiro no navegador. Com login, os dados também ficam guardados no Supabase, num servidor em São Paulo, e só a sua conta acessa. Este é o caminho a partir daqui e o que ficou de fora de propósito. A ordem sugere dependências: cada etapa usa a anterior.

## Etapa 1 — Conta e nuvem (feita)

**Objetivo:** usar o Pila em qualquer aparelho, com os mesmos dados, sem depender do claude.ai.

- **Feito:** Supabase no plano Free, em São Paulo. Um documento `jsonb` por usuário com o objeto `Dados` inteiro, protegido por RLS.
- **Feito:** login por e-mail e senha, redefinição de senha pelo fluxo PKCE.
- **Feito:** sincronização por revisão, com o IndexedDB como cópia local para funcionar sem internet. O conflito entre aparelhos é resolvido no documento inteiro: a pessoa escolhe a versão, e a descartada pode virar backup.
- **Feito:** na primeira entrada, o app oferece enviar os dados do navegador para a conta.
- **Falta:** fechar o cadastro de novas contas, apagar a própria conta pelo app e e-mail próprio (o e-mail grátis do Supabase só envia para o dono da conta, 2 por hora, e a redefinição de senha depende dele).
- **Depois:** separar o documento em tabelas (lançamentos, recorrentes, patrimônio…) quando houver relatórios no servidor ou muitos dados; login social, se fizer sentido.

## Etapa 2 — Compartilhar

- Convidar outra pessoa para dividir as finanças (casal, família), com papéis: editar tudo ou só ver. O botão já existe em Configurações com "Em breve".
- Histórico de quem lançou o quê.

## Etapa 3 — Dados que chegam sozinhos

- **Importar extrato bancário** (decidido no CP2): começar por OFX e CSV, com prévia, sugestão de categoria e detecção de duplicados. Open Finance depois, se fizer sentido.
- **Moeda estrangeira com cotação automática** (decidido no CP2): itens de patrimônio e investimentos em dólar ou euro, convertidos pela cotação do dia, guardando a cotação de cada mês. Ponto da referência a confirmar antes: ela usa o valor guardado na Visão geral e a cotação do dia no Início (ver `docs/nao-confirmado.md`).
- **Busca FIPE** para carros e motos no Patrimônio, com atualização mensal sugerida.

## Etapa 4 — Assistente fora do claude.ai

- Hoje o Assistente funciona dentro do claude.ai, com a conta da própria pessoa. Na nuvem, ele passa a chamar a API do Claude pelo servidor do Pila (a chave nunca vai para o navegador), com limite de uso por pessoa.
- Foto de nota fiscal e áudio para registrar gastos.
- WhatsApp: registrar um gasto mandando mensagem e receber o resumo do mês.

## Etapa 5 — Conteúdo

- Aulas em vídeo curtas, ao lado dos textos de "Aprender".
- Notificações por e-mail ou celular para os avisos do sino (receita prevista atrasada, despesa vencendo, meta perto do prazo).

## Pendências de confirmação (antes de copiar comportamentos da referência)

Os 15 pontos de `docs/nao-confirmado.md`. Os que mais mexem no produto: a regra do texto "Na média do costume" na Visão geral, a propagação do "Investir" quando se altera um mês já herdado e como a referência guarda a reserva em meses passados.

## Melhorias pequenas anotadas na Fase 4

- Lembrar a última categoria usada em cada aba do formulário (hoje o formulário pede a escolha, de propósito, para nada cair na primeira da lista).
- Opção de mostrar a composição do patrimônio por item na rosca, além da visão por grupo.
