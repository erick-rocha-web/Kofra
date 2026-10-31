# Ferramentas da Fase 4 (verificação)

Scripts que dirigem o Pila de verdade, pela interface, num navegador sem janela (Playwright).

| Arquivo | O que faz |
|---|---|
| `montar_sementes.ts` | Monta, com as próprias ações do app, as réplicas dos dados de teste vistos na referência e grava em `sementes/` |
| `harness.cjs` | Funções comuns: abrir o app, gravar uma semente no IndexedDB, trocar de tela e de mês, ler a tela |
| `conferencia.cjs` | Prova cruzada: refaz no Pila os 105 casos observados na referência e compara (saída em `saida/conferencia.json`) |
| `uso-real.cjs` | Um mês de uso começando do zero, só pela interface, conferindo os números |
| `celular.cjs` | Todas as telas em 320, 360 e 390 px, claro e escuro: procura rolagem lateral e elementos fora da tela |
| `a11y.cjs` | axe-core (WCAG 2.0/2.1 A e AA) em todas as telas |
| `textos-pila.cjs` | Junta todos os textos que o app mostra, para a checagem de originalidade |

## Como rodar

```bash
npm install
npm run build
cd dist && python3 -m http.server 4173      # em outro terminal; o endereço pode mudar com PILA_URL
npm i -D playwright && npx playwright install chromium
npx vite-node ferramentas/fase4/montar_sementes.ts
node ferramentas/fase4/conferencia.cjs
node ferramentas/fase4/uso-real.cjs
node ferramentas/fase4/celular.cjs
npm i -D axe-core@4.10.2 && node ferramentas/fase4/a11y.cjs
```

Os casos da referência ficam em `testes/conferencia/` e o resultado linha a linha em `testes/conferencia/resultado.csv`. O relatório está em `docs/relatorio-fase4.md`.
