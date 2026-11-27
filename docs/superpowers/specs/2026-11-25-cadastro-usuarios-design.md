# Cadastro de Usuários — design

Status: approved by the user on 2026-11-25. Layout A and the form stack were selected in conversation.

> Historical baseline. The active refinement specification is [`2026-11-26-users-refinements-design.md`](2026-11-26-users-refinements-design.md), which supersedes the earlier layout and source-organization choices while preserving the spreadsheet behavior.

## Intent

Create a clean, copy-pasteable React reference screen for editing fictional Brazilian users as a spreadsheet. Demonstrate the public `sbwb-ds-v2-aggrid` integration with the existing Design System, React Hook Form, Zod, and `zodResolver`, including batch confirmation and validation.

The current app is a Vite starter screen. The browser mockup is a disposable visual aid, not production code or an implementation of the Spreadsheet integration.

## Decisions made with the user

- The numeric field represents gross monthly salary, displayed in BRL.
- Confirm the whole sheet with `Salvar alterações`; restore the saved version with `Descartar`.
- React Hook Form owns rows, with Zod and the resolver from `@hookform/resolvers/zod`.
- Follow bundled library examples for public AG Grid peer imports, while rendering the `DataGrid` wrapper.
- Use layout A: show pending-change status and Save/Discard immediately above the grid.

## Goals, non-goals, and constraints

- Execution constraint added by the user: work in the current checkout, without worktrees or TDD. Write implementation before regression checks; retain build, lint, and browser verification.
- All labels, statuses, validation, accessibility text, dates, and numeric display use `pt-BR`.
- Edit inline; provide range selection, keyboard navigation, clipboard operations, fill, and local cell undo/redo through `useSpreadsheet`.
- Use only Community features. There is no per-row Actions column, modal editing flow, backend, network persistence, browser storage, payroll calculation, or Excel export.
- Keep changes in browser memory. Refreshing reloads the seed data. Never imply that Save writes to durable storage.
- Render `DataGrid`, import the required theme CSS once, and give the grid a nonzero parent height. Use Design System components and `sw:` utilities for the application shell; do not override AG Grid classes or use legacy themes.
- Import library APIs from `sbwb-ds-v2-aggrid`; public peer grid/editor types and documented theme APIs may come from their owning packages. No private imports or Enterprise modules.
- Failure conditions include losing the final active edit on Save, letting sorting misroute a form update to a different user, partial resets on Discard, formatting corrupting stored dates or salaries, and leaving new rows invisible under active filters.

## Approaches

### Form and data ownership

1. **React Hook Form, Zod, and `zodResolver` — selected.** One form owns rows, errors, and pending changes; a stable synchronous adapter connects Spreadsheet operations to form leaf fields. This follows the bundled RHF example and demonstrates the dependencies already installed. The additional integration work is explicit ID mapping, acknowledgment publication, and external reset synchronization.
2. **Plain React state and saved snapshots — considered.** Fewer form concepts, but requires custom dirty tracking and error management and does not demonstrate the requested form stack. The user chose the first approach.

### Placement of confirmation controls

1. **A: above the grid — selected.** Status and Save/Discard are grouped near the header and remain visible while the grid's rows scroll internally.
2. **B: below the grid — considered.** Leaves more room above the grid but puts confirmation farther from the page heading. The user selected A after viewing both.

## Screen and states

The page header shows a section icon, `Usuários`, a live `X registros` counter, and `Novo usuário`. Use the existing Design System rather than reproducing the mockup's CSS. The counter represents all current draft rows, including unsaved additions; filtering does not redefine the total.

Immediately below the header, a compact status area shows pending changes or validation feedback, with `Descartar` and `Salvar alterações` on the right. Keep both actions visible and disabled when the form is clean and no cell editor is active. While an editor is active, allow Save/Discard to finish or cancel its draft even if no form change has been committed yet; this avoids requiring a separate blur before the first Save. Editing is available immediately, without a separate Edit mode. Save validates and stays on this screen; no artificial loading delay or network-success state.

The grid contains the four domain columns: Nome, Perfil, Data de nascimento, and Salário mensal (R$). A narrow noneditable row-number gutter is acceptable, as shown in the chosen mockup. Column headers support Community sorting/filtering and resizing. Show a restrained selection border and fill handle using the library's renderer and theme.

Names receive the most width, dates are readable as `DD/MM/YYYY`, and salaries align right with two display decimal places. Constrain height so rows scroll inside the grid. On narrow viewports, wrap header/actions and let the grid scroll horizontally instead of crushing cells or hiding fields.

Show an `aria-live` status for accepted/rejected operations and Save/Discard results. Validation highlights affected cells with accessible explanations and a compact summary identifying the user and field. Display a clear empty state in Portuguese. Brief keyboard hints may appear below the grid; they must describe supported behavior.

## Data model and mock records

Keep a stable domain `id: string` for each user, independent of row positions and any RHF-generated field keys. Retain the project field names `name`, `role`, `birthDate`, and `numericValue`; `numericValue` is salary.

- `name`: string; blank and whitespace-only drafts are allowed while editing but fail Save.
- `role`: one of `Administrador`, `Editor`, or `Visualizador`; an empty draft is allowed after clearing but fails Save. Using these Portuguese strings directly as stored enum values is an assistant choice to keep this reference compact.
- `birthDate`: ISO `YYYY-MM-DD` string, or an empty draft. Dates must be real calendar dates and must not be in the future when saving. There is no minimum-age rule.
- `numericValue`: finite number or `null` while drafting. Save requires a nonnegative value; zero is valid. The display has two decimal places, and formatting never silently rounds the stored value. Do not add an unrequested precision restriction beyond the documented parser behavior.

Seed 18 fictional records in `src/data/mockUsers.ts`, with accented and compound Brazilian names, all three profiles, varied adult birth dates, and salaries roughly between R$ 3.280,75 and R$ 14.800,00. Include whole and fractional amounts. Seed records must pass validation. Names and values are invented rather than data about real people.

## Spreadsheet and form integration

Use a single form in the screen owner, with `shouldUnregister: false` and a Zod resolver. Keep draft-compatible field types and use refinements for Save requirements rather than silently coercing empty values or transforming the form's stored data.

Follow the bundled `react-hook-form.md` pattern: the adapter reads current form rows synchronously; `useWatch` supplies the rendered projection. Accepted operations find current form indexes by domain row ID and write changed leaf fields with dirty tracking. Publish the data version and acknowledgment synchronously; schedule validation outside the commit. Never use displayed indexes as form indexes.

Keep the adapter, binding array, parser functions, column schema, and row-ID configuration stable. Supply matching `colId` and binding `columnId` values. Attach the hook's host ref, pass the composed grid props intact, and preserve `readOnlyEdit: true`.

Use `SpreadsheetTextEditor` for names and `SpreadsheetNumberEditor` with a stable `createSpreadsheetNumberParser({ locale: 'pt-BR' })` for salary. Empty salary input becomes `null`; malformed numeric text is rejected, preserving the old value. Do not accept currency symbols in numeric input unless an explicitly documented parser customization is later chosen; the cell displays currency separately from editing.

Provide Community-compatible select and date editors through the public grid integration. The package has no supplied select/date editor or column presets. Editors must emit stored enum/ISO values, validate conversion before committing, and preserve normal focus, Enter/Tab, Escape, and clipboard behavior. Register raw editor drafts through the public editor bridge where needed for Ctrl+Enter bulk editing.

Binding parsers handle pasted, filled, cleared, and bulk inputs. Date parsing accepts an unambiguous Brazilian date or ISO date and stores ISO; reject impossible or ambiguous input. Role parsing accepts only the configured labels, with empty input reserved for an invalid-but-editable draft. Writers also enforce stored-value types because ordinary inline edit requests can bypass binding parsing. Use Zod for required-field/domain feedback; parse rejection and form validation are separate.

Grid translations default to Brazilian Portuguese; preserve that map when customizing labels. Numeric parser locale, display formatters, and date-editor localization are separate concerns. Format ISO dates without timezone day shifts and salaries with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Preserve the factory parser's lossless default numeric clipboard serialization; do not copy rounded display text as authoritative numeric data.

Use cell-range copy/cut behavior (`copySelectedRows: false`) and the default fill handle. Paste never appends rows. Delete/Backspace clears editable values rather than deleting records. Normal multi-cell operations may partially succeed, so report rejected destinations without claiming the whole batch failed or rolling back accepted changes. The library owns cell-operation history; use its default limits.

## New user

`Novo usuário` adds one draft to the form with a new stable ID, empty name/date, `Visualizador`, and a null salary. It immediately marks the sheet dirty, updates the counter, brings the row into view, focuses Nome, and opens its editor. Allow multiple draft rows.

Assistant choice: clear active filters and sorting when adding a user so the appended row is visible at the bottom and focus is reliable. Announce this reset when applicable. Treat row addition as an external structural change: advance the adapter version, discard stale acknowledgments, and synchronize Spreadsheet topology/history. Cell undo does not remove added rows; Discard restores the full saved row set.

## Save, Discard, and validation

Initialize the saved baseline from a clone of the seed records. Dirty state compares the whole current form, including structural changes, with that baseline. Validate edited/touched cells after accepted changes; do not flood a freshly added untouched row with errors before the user edits it or attempts Save. A Save attempt exposes all remaining errors.

Save first finishes active editing and waits for the edit request to reach the form before reading values. Capture and validate a complete cloned snapshot. Invalid final numeric drafts are canceled by the numeric editor according to its documented behavior; form-invalid accepted drafts remain available for correction. If Zod validation fails, preserve the current rows and old baseline, show errors, and focus/reveal the first invalid cell as appropriate.

On success, update only the in-memory saved baseline and form defaults using the installed RHF version's supported pattern. Preserve current values, clear pending-change status, and announce `Alterações salvas nesta sessão`. There is no asynchronous persistence request. Saving does not erase cell undo history; an undo after Save may make the form dirty again relative to the new baseline.

Discard cancels active editing without committing, restores a clone of the saved baseline including its row set, clears errors and pending changes, advances the adapter version, and synchronizes external data to invalidate stale cell history. Announce `Alterações descartadas`. No confirmation dialog is required for this local reference screen.

## Implementation boundaries left to the builder

- Exact component decomposition, hook names, layout utilities, and Design System icon choice, following the repo's established organization.
- Whether structural form operations use `useFieldArray` or form-owned array updates; domain IDs must remain independent and stable.
- Exact public Community or Design System primitives for select/date editors, after checking installed APIs and current docs. No new dependencies are expected.
- The mechanism for waiting for accepted active edits, refreshing validation decorations, and revealing an invalid row under filters.
- Accessible error presentation details and precise spacing/column widths, preserving layout A and the selected behavior.

## Validation before completion

Run `npm run build` and `npm run lint` after implementation. Verify the integrated screen in the browser with real Spreadsheet interactions, not just the mockup.

Focus automated checks on consequential behavior: parsers reject malformed dates/numbers/roles, stable-ID writes remain correct after sorting/filtering, Save includes the final active edit, successful Save resets dirty state without losing values, and Discard restores edits and unsaved row additions. Check range paste/fill/undo, null salary drafts, a new user's focus, filtered insertion, Brazilian formatting, keyboard access, error announcements, and narrow-screen overflow. Use the existing test tooling if available; do not introduce a large test stack for this reference screen.

## Reference material

- `AGENTS.md` and `context/{project-overview,coding-standards,ai-interaction}.md`.
- Bundled `node_modules/sbwb-ds-v2-aggrid/docs/llms.txt` and `docs/consumer/AGENTS.md`.
- Bundled consumer guides: `spreadsheet-mode.md`, `column-bindings.md`, `column-definitions.md`, `react-hook-form.md`, `spreadsheet-number-editor.md`, `locale.md`, and `api-reference.md`.
- Layout A in the local visual companion; session artifacts and keys are intentionally ignored by Git.
