# Cadastro de Usuários — Spreadsheet Showcase

Aplicação local em React + Vite + TypeScript que demonstra uma planilha editável em `pt-BR` com `sbwb-ds-v2-aggrid`. Os 18 usuários são fictícios e vivem somente na memória do navegador.

## Comandos

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
npm test
npm run lint
npm run build
git diff --check
```

Para a regressão de navegador, mantenha o servidor acima em execução e use a sessão Playwright nomeada:

```bash
playwright-cli -s=users-refinements open http://127.0.0.1:5187/
playwright-cli -s=users-refinements run-code --filename=scripts/verify-users-browser.js
```

O script usa a UI real e IDs de domínio estáveis; ele não depende de uma API de depuração da aplicação.

## Limite público de integração

O app importa `DataGrid`, `useSpreadsheet`, `createImmutableDataAdapter`, editores, parser numérico e tipos apenas da entrada pública de `sbwb-ds-v2-aggrid`. Tipos `ColDef`, `GridApi` e editores reativos vêm dos peers públicos `ag-grid-community`/`ag-grid-react`; a tradução vem de `@ag-grid-community/locale`. O app sempre renderiza `DataGrid` e importa `sbwb-ds-v2-aggrid/styles/theme.css` uma vez em `src/main.tsx`.

## Propriedade dos dados

- `src/app.tsx` permanece um mount fino; `useUsersForm` é o único dono do formulário, baseline salvo, validação, feedback e transições.
- `src/features/users/types.ts`, `constants.ts`, `utils/user-record.ts` e `schema.ts` definem o domínio, IDs estáveis, drafts, clones e validação da planilha completa no Save.
- `src/utils/date.ts` e `src/utils/currency.ts` concentram conversões de calendário local, parsing `pt-BR` e formatação BRL.
- `src/features/users/grid/user-bindings.ts` conecta os IDs `name`, `role`, `birthDate` e `salary` a leitura, parsing e escrita imutável. O adaptador publica operações de Spreadsheet sincronamente pelo ID, nunca pelo índice visual.
- `useUserSpreadsheet` concentra o adapter, projeção, colunas, ciclo de vida público e foco; `usePendingGridDraft` detecta rascunhos ativos sem escrever texto bruto no formulário. `UserGrid` só renderiza o host e `DataGrid`.
- `users-header`, `users-footer` e `users-error-summary` compõem o shell ERP com componentes DS; o footer abriga atalhos, feedback de sessão e `Descartar`/`Salvar alterações`, e o Alert lista erros visíveis com IDs acessíveis.

## Edição e confirmação

Editar uma célula publica o valor aceito diretamente no formulário e mantém histórico local de seleção, copiar/colar, preenchimento, limpar, desfazer e refazer. Um rascunho alterado ainda em edição habilita as ações, mas abrir uma célula sem alterar não habilita nada. `Novo usuário` cria uma linha com ID novo, `Visualizador` e salário nulo; limpa filtros/ordenação para revelá-la e abre o editor de Nome.

`Salvar alterações` termina o editor ativo, captura e valida um clone completo da planilha e, se válido, avança o baseline em memória com `resetDefaultValues`. `Descartar` cancela o editor, restaura todas as linhas do último baseline salvo e sincroniza o histórico externo. Ambos ficam desabilitados quando não há alteração nem rascunho alterado; abrir um editor sem modificar seu valor não habilita as ações. Salvar confirma somente nesta sessão: recarregar a página restaura os dados de exemplo e não há chamadas de API ou escrita em `localStorage`.

Todos os textos, mensagens de validação, datas (`DD/MM/AAAA`), filtros e valores monetários usam português brasileiro. No celular, o shell se reorganiza e a grade mantém rolagem horizontal própria.

A especificação ativa é [`2026-11-26-users-refinements-design.md`](docs/superpowers/specs/2026-11-26-users-refinements-design.md). Os documentos de 2026-11-25 permanecem como histórico da primeira implementação e apontam para essa revisão.

Limitação conhecida: `Date` local não consegue representar o dia civil que foi pulado em fusos com mudanças históricas de calendário, como `Pacific/Apia` em `30/12/2011`. A conversão de datas da tela permanece baseada no calendário local e não lança durante a renderização do seletor.
