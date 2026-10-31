# Pila

App pessoal de finanças, em português do Brasil: orçamento do mês, patrimônio, investimentos, reserva de emergência, metas, visão geral, calculadoras, aulas curtas e um assistente que conversa sobre os seus números.

Sem login, tudo fica neste navegador (IndexedDB), e os dados só saem quando você exporta um backup ou usa o Assistente dentro do claude.ai. Com login, os dados também ficam guardados no Supabase, num servidor em São Paulo, e só a sua conta acessa: eles ficam iguais em todos os aparelhos, e o app continua funcionando sem internet. Dentro do claude.ai não há login.

> **Nome novo.** Até 29/10/2026 o app se chamava Kofra. No mesmo endereço, os dados guardados com o nome antigo passam sozinhos para o Pila na primeira abertura, e os backups antigos (`kofra-backup-….json`) continuam sendo aceitos. Os registros de teste criados na plataforma de referência mantêm o prefixo "TESTE KOFRA", porque é assim que eles existem lá.

## O que tem

| Tela | O que faz |
|---|---|
| Início | Card de destaque que você escolhe (patrimônio, investimentos, despesas do mês, saldo, reserva, bens ou uma meta), primeiros passos e atalhos |
| Visão geral | Receita, gastos, patrimônio, investimentos e reserva no mês atual, em 3, 6 ou 12 meses ou num período escolhido, com variação em R$ e % contra o período anterior |
| Orçamento | Receitas (avulsas, recorrentes ou previstas), despesas fixas e variáveis, compras parceladas, quanto investir, gráfico por aba, filtro, copiar de outro mês e limpar o mês |
| Categorias | Categorias de despesa e fontes de renda com ícone e cor; arquivar e excluir movendo os lançamentos |
| Patrimônio | Liquidez, investimentos, bens e dívidas mês a mês (cada valor vale até ser atualizado), composição e lista por grupo |
| Investimentos | Ativos por tipo, valor investido e atual por mês, rendimento em R$ e % |
| Reserva de emergência | Assistente em 3 passos (nível, custo essencial, onde fica), meta, progresso e locais com aportes e saques |
| Metas | Valor, prazo, onde o dinheiro fica (texto ou investimentos vinculados), guardar ou tirar, sugestão de quanto separar por mês |
| Calculadoras | Juros compostos (com tabela mês a mês) e primeiro milhão (tempo ou valor por mês) |
| Aprender e Suporte | Aulas editáveis, perguntas frequentes e contatos de suporte |
| Assistente | Usa o Claude da sua conta quando o Pila está aberto no claude.ai; sugere lançamentos que só entram depois que você confirma |
| Configurações | Nome, conta e sincronização, tema claro/escuro/sistema, backup (exportar, importar ou colar), dados de exemplo e apagar tudo |

Em todas as telas, o ícone de olho esconde os valores (útil em público). Os cálculos seguem as regras observadas e testadas na plataforma de referência: `docs/especificacao-calculos.md`.

## Como rodar

Precisa de Node.js 18 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # 226 testes (cálculos, backup e sincronização)
npm run build      # gera dist/index.html (arquivo único) e dist/pila-artifact.html
```

- `dist/index.html` é o app inteiro num arquivo só. Dá para abrir direto no navegador (Chrome, Edge ou Firefox) ou hospedar em qualquer servidor estático.
- `dist/pila-artifact.html` é a mesma coisa no formato de página do claude.ai (é a versão publicada).
- `python3 ferramentas/verificar_formulas.py` recalcula as 630 checagens da Fase 2 a partir dos CSVs de `testes/`.
- `node ferramentas/nuvem/testar-seguranca.mjs` confere no Supabase de verdade o isolamento entre contas e a gravação por revisão. Cria 2 contas temporárias e apaga no fim; precisa de `SUPABASE_SECRET_KEY` em `.segredos.env`, que fica fora do git.

## Como o código está organizado

```
src/
  engine/     cálculos puros e tipados (dinheiro em centavos inteiros, arredondamento meio para cima) + testes
  storage/    tipos dos dados, cópia local (IndexedDB, com recurso de memória), backup em JSON, dados de exemplo
  nuvem/      login e sincronização com o Supabase; as decisões ficam em decisoes.ts, sem rede nem IndexedDB
  estado/     loja única (immer), ações de cada módulo, navegação e avisos, arquivos e Assistente
  ui/         sistema visual: tokens de cor (claro/escuro), componentes, ícones, gráficos
  layout/     barra lateral, navegação do celular, seletor de mês, sino de avisos
  paginas/    uma pasta ou arquivo por tela
testes/       CSVs com os casos observados na referência (Fase 2) e a prova cruzada (Fase 4, em conferencia/)
docs/         especificação dos cálculos, mapa complementar, relatório da Fase 4, NÃO CONFIRMADO e roadmap
ferramentas/  verificador das fórmulas (Python), scripts de verificação da interface (Fase 4) e teste de segurança da nuvem
supabase/     migrações do banco e configuração do projeto
scripts/      conversão do build para o formato de página do claude.ai
```

A cópia local é sempre a fonte do app: a interface `Armazenamento` em `src/storage/armazenamento.ts` grava os dados e, na mesma transação, o estado da sincronização. A nuvem guarda um documento por usuário com o objeto `Dados` inteiro; toda gravação só vale se a revisão no banco ainda for a que o aparelho conhece, senão vira conflito e a pessoa escolhe. Não confunda `Dados.versao` (formato dos dados) com a coluna `versao` da tabela, que no código se chama revisão.

## Documentos

- `docs/especificacao-calculos.md` — todas as fórmulas, com status CONFIRMADO, NÃO CONFIRMADO ou DECISÃO PILA
- `docs/nao-confirmado.md` — o que não deu para confirmar e o que o Pila faz por enquanto
- `docs/relatorio-fase4.md` — verificação final (testes, prova cruzada, uso real, celular, originalidade, acessibilidade)
- `docs/roadmap.md` — o que já foi feito na nuvem e os próximos passos
- `docs/mapa-complementar.md` — o que a planta não detalhava e como ficou

## Créditos

- Ícones: [Phosphor Icons](https://phosphoricons.com), peso Bold, licença MIT (texto em `LICENCAS-TERCEIROS.md`).
- Fonte: Archivo (Google Fonts), licença SIL Open Font License 1.1.
- Bibliotecas: React, Recharts, Immer e decimal.js (MIT); Vite, Tailwind CSS, TypeScript e Vitest no desenvolvimento.

Os valores e as calculadoras servem para organização e estudo; não são recomendação de investimento.
