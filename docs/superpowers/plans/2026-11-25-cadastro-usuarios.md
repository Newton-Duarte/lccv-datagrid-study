# Cadastro de Usuários Implementation Plan

> Historical implementation plan. The current screen is governed by [`2026-11-26-users-refinements-design.md`](../specs/2026-11-26-users-refinements-design.md) and [`2026-11-26-users-refinements.md`](../plans/2026-11-26-users-refinements.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user chooses delegation, to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The user explicitly forbids TDD and worktrees; these preferences override skill defaults.

**Goal:** Replace the starter screen with the approved Brazilian user spreadsheet, including monthly salary and whole-sheet Save/Discard.

**Architecture:** React Hook Form is the sole draft-data owner, with Zod and `zodResolver` for validation. A stable synchronous immutable adapter maps Spreadsheet operations to form leaf fields by domain ID; React receives projections and acknowledgments. The page owns a cloned in-memory saved baseline, while `UserGrid` owns grid controls, focus, and Spreadsheet selection/history.

**Tech Stack:** Installed React 19, TypeScript, Vite, React Hook Form 7.92+, Zod 4, `@hookform/resolvers/zod`, `sbwb-ds-v2-aggrid` 0.1.0, AG Grid Community peers, existing Design System and `sbwb-icons`. No dependency installation expected.

**Spec:** `docs/superpowers/specs/2026-11-25-cadastro-usuarios-design.md` (approved).

## Global Constraints

- Work in the current checkout, without worktrees or TDD. Implement first, then add consequential regression checks.
- All labels, statuses, validation, accessibility text, dates, and numeric display use `pt-BR`.
- Use layout A: show pending-change status and Save/Discard immediately above the grid.
- Render `DataGrid`; public peer grid/editor types and documented theme APIs may come from their owning packages. No private imports or Enterprise modules.
- No per-row Actions column, modal editing flow, backend, network persistence, browser storage, payroll calculation, or Excel export.
- Keep changes in browser memory. Refreshing reloads the seed data. Never imply that Save writes to durable storage.
- Use Design System components and `sw:` utilities for the application shell; do not override AG Grid classes or use legacy themes.
- Read bundled `llms.txt`, consumer `AGENTS.md`, and the guides named in the spec before grid changes. Verify installed public signatures; refresh library-specific guidance through Context7 when needed, following repository rules.
- Use existing Node 22.23.3 built-in tests for pure TypeScript domain checks and the available `playwright-cli` for browser checks. No test framework installation or failing-test-first cycle.

## Review Focus

- Save while the final cell editor still owns focus: the confirmed baseline must contain the just-entered value (Task 3 browser check).
- Sorting/filtering changes displayed indexes: writing a cell must update only its domain user, and adding a filtered-out draft must reveal its name editor (Task 3 browser check).
- Discard after several edits and new rows: restore the exact saved row set and make stale cell history unavailable (Task 3 browser check).
- Brazilian leap dates, malformed dates, and blank numeric input: preserve ISO dates without timezone shifts and distinguish null drafts from zero (Task 1 regression checks).
- A mixed-validity range paste: retain accepted destinations, preserve rejected cells, and report rejection in Portuguese without inventing rows (Task 3 browser check).

## File responsibilities and interfaces

- Create `src/users/model.ts`: `UserRole`, `UserRecord`, `UsersFormValues`, role options, draft cloning/creation, date parsing/formatting, and salary display formatter.
- Create `src/users/schema.ts`: draft-compatible Zod schema with Save refinements and Portuguese messages.
- Create `src/data/mockUsers.ts`: `createMockUsers(): UserRecord[]`, returning 18 independently owned valid fictional records with IDs `user-001` through `user-018`.
- Create `src/users/bindings.ts`: stable Spreadsheet bindings and localized numeric parser; no React state.
- Create `src/users/editors.tsx`: public reactive role/date editors and optional raw-draft registrations.
- Create `src/components/UserGrid.tsx`: form projection, synchronous adapter, column configuration, composed Spreadsheet props, validation decorations, and imperative page controls.
- Modify `src/app.tsx`: form owner, saved baseline, Save/Discard/add handlers, layout A, counter, status, and error summary.
- Modify `src/globals.css`, `index.html`, and `tsconfig.app.json`: required grid CSS/layout, Portuguese document metadata, removal of external starter-font requests, and `strict: true`.
- Create `tests/users.test.ts` and `scripts/verify-users-browser.js`: regression checks after implementation; add a Node test command to `package.json`.
- Modify `README.md`: actual startup/check commands, integration/file map, keyboard behavior, draft handling, and session-only Save semantics.

Shared model contracts:

```ts
type UserRole = 'Administrador' | 'Editor' | 'Visualizador'
type UserRecord = { id: string; name: string; role: UserRole | ''; birthDate: string; numericValue: number | null }
type UsersFormValues = { users: UserRecord[] }
type DateInputResult = { ok: true; value: string } | { ok: false; message: string }
```

Keep input and output schema types equal: no coercions, transforms, or defaults that change the form's stored shape. Import types from their owning modules using `import type`.

---

### Task 1: Define the domain, seed data, validation, and binding semantics

**Files:** Create `src/users/model.ts`, `src/users/schema.ts`, `src/data/mockUsers.ts`, `src/users/bindings.ts`, `tests/users.test.ts`; modify `package.json`.

**Interfaces:**
- Produces model types above and `USER_ROLES: readonly UserRole[]`.
- Produces `createUserDraft(): UserRecord`, `cloneUsers(values: UsersFormValues): UsersFormValues`, `parseBirthDateInput(input: unknown): DateInputResult`, `formatBirthDate(iso: string): string`, and `salaryFormat: Intl.NumberFormat`.
- Produces `createMockUsers(): UserRecord[]`, `usersFormSchema: z.ZodType<UsersFormValues, UsersFormValues>`, `USER_BINDINGS: readonly ColumnBinding<UserRecord>[]`, and `SALARY_PARSER: SpreadsheetNumberParser<UserRecord>`.

- [x] **Step 1: Implement the model, parser, and seed records.** Generate new domain IDs with `crypto.randomUUID()`. New drafts have empty name/date, `Visualizador`, and null salary. Accept only exact `DD/MM/YYYY`, exact ISO calendar dates, or empty date drafts; reject rollover dates and arbitrary text. Keep date conversion independent of timezone. Seed the named examples from the spec/mockup plus varied Brazilian records; all 18 IDs are unique and repeated factory calls return independent rows.
- [x] **Step 2: Implement Save validation in `schema.ts`.** Require nonblank names, a configured role, a real nonfuture ISO date, and finite nonnegative salary. Draft types still permit empty/null values, but Save rejects them. Use current local calendar date at validation time, without a minimum-age or salary-precision rule; zero remains valid. Use Zod refinements without transforming values.
- [x] **Step 3: Implement the stable binding array.** Use exact column IDs `name`, `role`, `birthDate`, `numericValue`. Provide authoritative reads, immutable typed writers, raw parsing, and the factory `SALARY_PARSER` with locale `pt-BR`. Preserve raw names; validate roles and normalize valid date input to ISO. Clear produces empty text/role/date or null salary. Writers reject unsupported types even on already-parsed inline paths. Numeric display uses BRL/two decimals, independently of lossless clipboard serialization.
- [x] **Step 4: Add regression checks after the implementation.** Use `node:test` and `node:assert/strict` in `tests/users.test.ts`; add `"test": "node --test tests/users.test.ts"` to package scripts. Assert the following exact cases:

```ts
assert.equal(parseBirthDateInput('29/02/2000').ok, true)
assert.deepEqual(parseBirthDateInput('14/03/1988'), { ok: true, value: '1988-03-14' })
assert.equal(parseBirthDateInput('29/02/2001').ok, false)
assert.equal(parseBirthDateInput('31/04/1994').ok, false)
assert.equal(formatBirthDate('1988-03-14'), '14/03/1988')
assert.equal(createMockUsers().length, 18)
assert.equal(usersFormSchema.safeParse({ users: createMockUsers() }).success, true)
```

Also exercise `SALARY_PARSER` through its full row/address/source context: `5.420,50` becomes `5420.5`, empty input becomes null, `abc` is rejected, and formatted currency text is rejected by the default parser. Check schema acceptance of zero, rejection of null/negative/future values and blank roles/names, source-row immutability, independent seed cloning, and no loss of salary precision.
- [x] **Step 5: Verify and commit the domain deliverable.** Run `npm test` and `npm run build`; expect passing tests and exit 0. Commit only this task's files as `feat: define Brazilian user data and validation`.

### Task 2: Connect inline editors and Spreadsheet operations to the form

**Files:** Create `src/users/editors.tsx`, `src/components/UserGrid.tsx`; import the documented grid stylesheet once in `src/main.tsx`.

**Interfaces:**
- Consumes Task 1 model, bindings, formatters, and `UseFormReturn<UsersFormValues>` supplied by the screen.
- Produces `UserRoleEditor` and `UserDateEditor`, each accepting `CustomCellEditorProps<UserRecord, string>` plus optional `registerEditor: EditorRegistry['register']`, and returning `ReactElement`.
- Produces `UserGrid({ form, showAllErrors, onReady, onStatus, onEditingChange }: UserGridProps): ReactElement`, where `onReady(controls: UserGridControls): void`, `onStatus(message: string): void`, and `onEditingChange(active: boolean): void` are stable callbacks.
- `UserGridControls` exposes `finishEditing(): Promise<void>`, `cancelEditing(): void`, `synchronizeExternalData(): void`, `revealNewRow(rowId: string): void`, and `focusFirstError(): void`.

- [x] **Step 1: Implement the role/date editors using installed public reactive editor contracts.** The dropdown stores Portuguese enum values; the date input displays Brazilian text and emits normalized ISO or an empty draft. Invalid conversion preserves the prior committed value. Preserve Enter/Tab commit, Escape cancellation, and native input clipboard. Register raw drafts by stable cell address for bulk editing; do not fabricate private bridge properties. Prefer existing Design System inputs with supported refs; retain semantic keyboard behavior.
- [x] **Step 2: Build the grid's stable synchronous adapter and form projection.** Read form values synchronously, map accepted changes by domain ID to current form indexes, publish changed leaf values and version/acknowledgment before returning, then schedule validation. Use `useWatch` for projected rows and stable schema/binding ownership. Attach `hostRef`, spread composed props intact, keep `readOnlyEdit: true`, and avoid re-registering bindings on edits or status changes.
- [x] **Step 3: Configure the columns and Spreadsheet behavior.** Use the supplied text/number editors and Task 2 select/date editors; Portuguese headings, labels, filters, resize/sort, right-aligned salary, date formatting, and nonzero host height. Preserve pt-BR locale defaults, default fill/history, and `copySelectedRows: false`. Do not override lossless numeric clipboard output with the rounded display. Report partial batch rejection in Portuguese through `onStatus`. A noneditable row-number gutter may be added; no Actions column.
- [x] **Step 4: Implement page controls with public grid APIs.** `finishEditing` waits for the documented stopped-edit event/accepted update before resolving; `cancelEditing` discards the active draft. Report editor start/stop through `onEditingChange` so the first active draft can be saved or discarded before it has marked the form dirty. External synchronization advances the data version and removes stale acknowledgments/history. `revealNewRow` clears filters/sort, announces resets when applicable, queues the requested ID until its row projection arrives, scrolls to Nome, focuses it, and starts editing. `focusFirstError` finds errors by domain ID, makes the first invalid cell visible, and focuses it.
- [x] **Step 5: Add validation decorations and accessible cell feedback.** Refresh cell rules after validation; derive current form indexes by row ID. Show touched errors or all errors after an attempted Save, without flooding a fresh untouched row. Use app-owned classes/tokens, accessible descriptions, and the library renderer's `renderContent` when needed; no private renderer connection or CSS overrides of AG Grid classes.
- [x] **Step 6: Verify and commit the integration deliverable.** Run `npm test`, `npm run build`, and `npm run lint`; expect all to exit 0. Review the compiled public editor/grid contracts against the bundled RHF example. Commit as `feat: integrate user spreadsheet with React Hook Form`. Integrated browser regression coverage follows Task 3, once the real screen exists.

### Task 3: Deliver layout A, Save/Discard, and integrated browser verification

**Files:** Modify `src/app.tsx`, `src/globals.css`, `index.html`, `tsconfig.app.json`, `README.md`; create `scripts/verify-users-browser.js`.

**Interfaces:**
- Consumes `createMockUsers`, `createUserDraft`, `cloneUsers`, `usersFormSchema`, `UserGrid`, and `UserGridControls`.
- Produces the existing exported `App(): ReactElement`, a layout-A screen at `/`, and an async Playwright callback in `scripts/verify-users-browser.js` executable with `playwright-cli run-code --filename`.

- [x] **Step 1: Implement the single form owner and saved baseline in `app.tsx`.** Initialize 18 rows once, configure `useForm<UsersFormValues>` with `shouldUnregister: false` and `zodResolver(usersFormSchema)`, and keep an independent saved clone. Derive pending changes from the complete form. Store grid controls through a stable `onReady` callback. Prevent overlapping Save/Discard/add transitions while finishing an active edit.
- [x] **Step 2: Implement addition and Save/Discard handlers.** Finish current editing before adding a form-owned row, mark the form dirty, synchronize structural changes, and queue focus via `revealNewRow`. Save finishes editing, captures a clone, validates the form and captured snapshot, reveals errors on failure, and preserves the old baseline. Success advances the baseline with `resetDefaultValues(snapshot, { keepIsValid: true })`, preserves current values and owned cell history, and announces `Alterações salvas nesta sessão`. Discard cancels editing, resets the entire baseline row set, clears errors, synchronizes external data/history, and announces `Alterações descartadas`. Undo after Save can make the form dirty relative to the newly saved baseline.
- [x] **Step 3: Replace the starter UI with layout A.** Use the installed Design System for the section icon/title, live total count, `Novo usuário`, status, `Descartar`, and `Salvar alterações`. Keep confirmation above the grid; disable Save/Discard when clean and no editor is active, and allow them to finish/cancel the very first uncommitted edit. Wire touched/all-error visibility, a compact error summary, `aria-live` operation feedback, Portuguese empty state, and accurate keyboard hints. Explain session-only confirmation in concise UI copy.
- [x] **Step 4: Finish styling and page configuration.** Use existing `sw:` utilities and scoped app styles for responsive wrapping, grid height/horizontal overflow, and accessible error/focus treatment. Preserve token-based theme integration. Set document `lang="pt-BR"` and Portuguese title; remove external Google font links so this local screen needs no external font request. Enable `strict: true` in `tsconfig.app.json` and resolve resulting errors without weakening types.
- [x] **Step 5: Add and run browser regression checks after implementation.** Start `npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`; open `http://127.0.0.1:5187/` with a named `playwright-cli` session. The browser script exercises the real grid using DOM/UI interactions and stable domain row IDs, without adding an application debug API. Assert:
  - Initial count is `18 registros`, four domain headings are Portuguese, no `Ações` heading exists, and Save/Discard are disabled.
  - Edit `user-001` with the name `Ana Luísa Ferreira Revisada`, click Save while its editor still owns focus, and observe the new value plus a clean baseline. A subsequent temporary name edit and Discard restores the revised saved name.
  - Reverse name sorting, edit the visible `user-002` salary to `6.321,75`, and verify only that user's stored/displayed salary changes. Under an active filter excluding blank names, adding a draft reveals its Nome editor, resets sort/filter, and changes the count to `19 registros`.
  - An incomplete new row fails Save, reveals errors, and keeps the old baseline. Discard removes the row, restores the count to 18 and saved values, and Ctrl+Z cannot replay discarded operations.
  - A mixed-validity two-row paste into salary accepts `1.234,56`, rejects `abc` without changing that destination, reports rejection, and keeps the row count unchanged. Exercise range copy/paste, fill, Delete, and undo/redo; null salary remains distinct from zero.
  - The dropdown and date editor work by keyboard; error feedback has an accessible description/summary; `390 × 844` has no document-level horizontal overflow and the grid remains horizontally scrollable. The final active edit must also be covered for salary/date, not only name.
  - Reloading restores seed data, with no network persistence or browser-storage writes. Capture a final desktop screenshot and check browser console errors.
- [x] **Step 6: Update the README and run final checks.** Document real commands, the public import boundary, the form/adapter/binding ownership map, Save/Discard and row-addition semantics, and browser regression invocation. Run `npm test`, `npm run build`, `npm run lint`, and `git diff --check`; expect exit 0. Review final diff against the approved spec and inspect the desktop/narrow screenshots. Commit as `feat: deliver user registration spreadsheet screen`.

## Execution notes

No worktree creation, TDD skill, failing-first tests, new framework installation, or dependency version upgrade belongs in this plan. If a verification failure occurs, diagnose it using actual evidence and rerun only affected checks after the fix. Do not broaden scope to unrelated starter refactors.

Execution selected by the user: subagent-driven orchestration, with implementation delegated to GPT-5.6 Luna at xhigh. Preserve the current-checkout, no-worktrees, and no-TDD constraints.

## Documentation checked during planning

- Installed bundled Spreadsheet/RHF consumer docs and `react-hook-form/dist/types/form.d.ts` confirm the baseline API and synchronous ownership requirements.
- [React Hook Form: resetDefaultValues](https://react-hook-form.com/docs/useform/resetdefaultvalues): baseline changes preserve current values and recompute dirty state.
- [React Hook Form Resolvers: Zod integration](https://github.com/react-hook-form/resolvers#zod): use `zodResolver` with aligned schema input/output types.

## Final verification outcome

Implementation and correction agents used GPT-5.6 Luna at xhigh. Task reviews and the final whole-change review resolved all Critical/Important findings; final code commit: `07970d7`.

Node checks, strict TypeScript/Vite build, lint, browser regression, and `git diff --check 17ba36a..HEAD` passed. The final reviewer also separately verified that Discard after canceling an active edit clears populated undo/redo history while preserving the saved value and clean state. The automated callback covers the empty-history variant; adding the populated-history variant remains a Minor coverage improvement.

Discard remounts the Spreadsheet integration to guarantee a fresh history even for equal-valued resets; the form and saved baseline remain outside that lifecycle. Selection and grid view state may reset as a result. Save remains session-only. Vite's bundle-size advisory remains non-blocking; no bundle-splitting work was added.
