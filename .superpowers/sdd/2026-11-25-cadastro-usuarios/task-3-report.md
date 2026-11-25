# Task 3 — implementation and verification report

Date: 2026-11-25
Screen: `http://127.0.0.1:5187/`
Dev server: running in session `2206` (`npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`)

## Implementation

- Replaced the Vite starter in `src/app.tsx` with Layout A: Portuguese user header, live record count, `Novo usuário`, status and Save/Discard immediately above `DataGrid`, compact accessible error summary, operation announcements, keyboard hints, and session-only confirmation copy.
- Made React Hook Form the single row owner with `shouldUnregister: false`, `zodResolver(usersFormSchema)`, a cloned independent saved baseline, complete-snapshot validation, `resetDefaultValues(snapshot, { keepIsValid: true })` on successful Save, and full-baseline `reset` plus Spreadsheet synchronization on Discard.
- Added structural add/save/discard transition guards, active-editor completion, stable-ID new-row reveal, and first-invalid-cell focus after Save validation. Untouched new rows remain draft-compatible until Save exposes errors.
- Preserved the existing public Spreadsheet boundary (`DataGrid`, `useSpreadsheet`, immutable adapter, bindings, public AG Grid peer types, Portuguese locale). No Actions column, backend, network persistence, or browser storage was added.
- Corrected `UserGrid` new-row timing after browser evidence: reveal now retries `startEditingCell` briefly after row topology/model updates, so `Novo usuário` reliably opens the Nome editor even after filter/sort reset.
- Updated `src/globals.css` with token/utility-based shell styling, scoped invalid/focus treatment, responsive wrapping, grid sizing and local overflow. Updated `index.html` to `lang="pt-BR"` and `Cadastro de Usuários`; removed Google font requests. Enabled `strict: true` in `tsconfig.app.json`.
- Replaced the template README with commands, public import boundary, ownership map, Save/Discard/add semantics, and browser regression usage.
- Added `scripts/verify-users-browser.js` as a bare async Playwright callback for `playwright-cli run-code --filename`.

## Checks

All final checks exited 0:

- `npm test` — 1 suite passed, 0 failed.
- `npm run lint` — ESLint reports no issues.
- `npm run build` — TypeScript strict build and Vite build passed.
- `git diff --check` — no whitespace errors.

Build emits the existing Vite warning that the minified AG Grid bundle exceeds 500 kB; it is informational and does not fail the build.

## Browser regression

Invocation:

```bash
playwright-cli -s=spreadsheet-final open http://127.0.0.1:5187/
playwright-cli -s=spreadsheet-final run-code --filename=scripts/verify-users-browser.js
```

Result: `{ ok: true }`.

The script exercised real UI interactions for:

- initial `18 registros`, Portuguese domain headers, no Actions heading, disabled clean Save/Discard;
- active name-editor Save, clean baseline, temporary edit and Discard restoration;
- reverse name sorting, visible stable-ID `user-002` salary edit to `6.321,75`, and no cross-row write;
- active filter, new-row reveal with filter/sort reset, `19 registros`, untouched-row invalid Save, all-error summary and focus on the first invalid cell;
- Discard removing the draft and Ctrl+Z not replaying the discarded addition;
- range clipboard paste with accepted `1.234,56` and rejected `abc`, rejection feedback and unchanged rejected destination;
- range copy/paste, fill-handle drag, Delete, undo/redo, and null salary remaining distinct from zero (`0,00`);
- keyboard role and date editors, invalid date accessible description, and final active date/salary editing coverage;
- 390×844 global overflow prevention with grid-local horizontal scroll;
- reload restoring seed data, unchanged local/session storage, no external requests, and 0 browser console errors.

## Screenshots

- Desktop: `/tmp/cadastro-usuarios-desktop.png`
- Narrow: `/tmp/cadastro-usuarios-narrow.png`

Both screenshots were inspected after the passing run in clean seed state. The narrow capture shows the responsive shell and the grid's horizontal scrollbar without document-level overflow.

## Concerns

Only the informational Vite bundle-size warning remains. No functional or verification concern was found.

## Review correction round

Addressed every Important review finding and the noted narrow-button issue:

- Removed the grid host's inline `width: 100%`; the bordered host now sizes to the card's available content width while AG Grid retains its own horizontal scroll. The browser callback measures host/card bounds at 1440×1000 and 390×844 and fails if the host exceeds the card.
- Added true active-editor Save coverage for name, salary, and date: each helper fills the still-visible editor and clicks Save without pressing Enter first, then asserts the saved value and clean state.
- The invalid new-row Save now captures existing saved Name and salary values and compares them before/after failed Save and after Discard. The successful name Save scenario focuses a grid cell before Ctrl+Z, asserts dirty relative to the new baseline, then verifies Discard restores that saved value.
- Added real range Ctrl+C coverage with clipboard-content assertions, destination range paste assertions, and unchanged `18 registros`; mixed-validity salary paste remains covered separately.
- Added `console` error and `pageerror` listeners; the callback fails on any browser error instead of only reporting request checks.
- Narrow actions stack with `white-space: nowrap`, so `Salvar alterações` no longer wraps at 390px.
- Updated all Ctrl+Z checks to focus a grid cell before invoking the shortcut, ensuring Spreadsheet history—not the external toolbar—handles the command.

Correction-round commands and results:

```bash
npm test
npm run lint
npm run build
git diff --check
playwright-cli -s=spreadsheet-final open http://127.0.0.1:5187/
playwright-cli -s=spreadsheet-final run-code --filename=scripts/verify-users-browser.js
```

All exited 0. The corrected callback returned `{ ok: true }`, reported no console/page errors, and rewrote the inspected screenshots at `/tmp/cadastro-usuarios-desktop.png` and `/tmp/cadastro-usuarios-narrow.png`. The only remaining build output is the existing informational Vite bundle-size warning.
