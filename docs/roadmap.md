# Kofra — Roadmap

A v1 roda inteira no navegador, sem servidor ("local agora"). Este é o caminho para a versão na nuvem ("nuvem depois") e para o que ficou de fora de propósito. A ordem sugere dependências: cada etapa usa a anterior.

## Etapa 1 — Conta e nuvem (base de tudo o que vem depois)

**Objetivo:** usar o Kofra em qualquer aparelho, com os mesmos dados, sem depender do claude.ai.

- **Backend com API** que guarda o objeto `Dados` por usuário. O app já fala com uma interface única (`src/storage/armazenamento.ts`: `carregar`, `salvar`, `apagarTudo`); basta criar a versão `ArmazenamentoApi` e escolher qual usar.
- **Banco de dados:** começar guardando o documento inteiro por usuário (simples e igual ao formato do backup); separar em tabelas (lançamentos, recorrentes, patrimônio…) quando houver relatórios no servidor ou muitos dados.
- **Login:** e-mail com link mágico ou Google/Apple; nada de senha guardada pelo Kofra. Sessão curta no navegador e renovação automática.
- **Sincronização:** salvar alterações com versão (número ou data) e resolver conflito de dois aparelhos pela mais recente por item; manter o IndexedDB como cópia local para funcionar sem internet.
- **Migração da v1:** na primeira entrada, oferecer "enviar os dados deste navegador para a sua conta" (usa o mesmo formato do backup JSON).
- **Privacidade e segurança:** criptografia em trânsito e em repouso, exportar e apagar a conta a qualquer momento, registro de acessos.
- **Hospedagem:** o front continua sendo um arquivo estático (CDN); a API num serviço gerenciado com backups diários.

## Etapa 2 — Compartilhar

- Convidar outra pessoa para dividir as finanças (casal, família), com papéis: editar tudo ou só ver. O botão já existe em Configurações com "Em breve".
- Histórico de quem lançou o quê.

## Etapa 3 — Dados que chegam sozinhos

- **Importar extrato bancário** (decidido no CP2): começar por OFX e CSV, com prévia, sugestão de categoria e detecção de duplicados. Open Finance depois, se fizer sentido.
- **Moeda estrangeira com cotação automática** (decidido no CP2): itens de patrimônio e investimentos em dólar ou euro, convertidos pela cotação do dia, guardando a cotação de cada mês. Ponto da referência a confirmar antes: ela usa o valor guardado na Visão geral e a cotação do dia no Início (ver `docs/nao-confirmado.md`).
- **Busca FIPE** para carros e motos no Patrimônio, com atualização mensal sugerida.

## Etapa 4 — Assistente fora do claude.ai

- Hoje o Assistente funciona dentro do claude.ai, com a conta da própria pessoa. Na nuvem, ele passa a chamar a API do Claude pelo servidor do Kofra (a chave nunca vai para o navegador), com limite de uso por pessoa.
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
