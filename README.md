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
playwright-cli -s=spreadsheet-final open http://127.0.0.1:5187/
playwright-cli -s=spreadsheet-final run-code --filename=scripts/verify-users-browser.js
```

O script usa a UI real e IDs de domínio estáveis; ele não depende de uma API de depuração da aplicação.

## Limite público de integração

O app importa `DataGrid`, `useSpreadsheet`, `createImmutableDataAdapter`, editores, parser numérico e tipos apenas da entrada pública de `sbwb-ds-v2-aggrid`. Tipos `ColDef`, `GridApi` e editores reativos vêm dos peers públicos `ag-grid-community`/`ag-grid-react`; a tradução vem de `@ag-grid-community/locale`. O app sempre renderiza `DataGrid` e importa `sbwb-ds-v2-aggrid/styles/theme.css` uma vez em `src/main.tsx`.

## Propriedade dos dados

- `src/app.tsx` é o único dono do formulário: `useForm<UsersFormValues>` com `shouldUnregister: false`, Zod e `zodResolver`.
- `src/users/model.ts` define `UserRecord`, IDs de domínio, drafts, clones, datas ISO e formatação BRL.
- `src/users/schema.ts` valida a planilha completa no Save: nome, perfil, data não futura e salário finito não negativo (zero é válido).
- `src/users/bindings.ts` conecta IDs de coluna a leitura, parsing e escrita imutável. O adaptador publica operações de Spreadsheet sincronamente pelo ID, nunca pelo índice visual.
- `src/components/UserGrid.tsx` é o adaptador visual: `useWatch` projeta o formulário, fornece as colunas/editoras e expõe controles para terminar/cancelar edição, sincronizar topologia, revelar a nova linha e focar o primeiro erro.

## Edição e confirmação

Editar uma célula publica o valor aceito diretamente no formulário e mantém histórico local de seleção, copiar/colar, preenchimento, limpar, desfazer e refazer. `Novo usuário` cria uma linha com ID novo, `Visualizador` e salário nulo; limpa filtros/ordenação para revelá-la e abre o editor de Nome.

`Salvar alterações` termina o editor ativo, captura e valida um clone completo da planilha e, se válido, avança o baseline em memória com `resetDefaultValues`. `Descartar` cancela o editor, restaura todas as linhas do último baseline salvo e sincroniza o histórico externo. Ambos ficam desabilitados quando não há alteração nem edição ativa. Salvar confirma somente nesta sessão: recarregar a página restaura os dados de exemplo e não há chamadas de API ou escrita em `localStorage`.

Todos os textos, mensagens de validação, datas (`DD/MM/AAAA`), filtros e valores monetários usam português brasileiro. No celular, o shell se reorganiza e a grade mantém rolagem horizontal própria.
