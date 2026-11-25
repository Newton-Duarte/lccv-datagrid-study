# Task 2 implementation report

## Implementation

- Added `src/users/editors.tsx` with public AG Grid reactive editors:
  - `UserRoleEditor` stores the Portuguese role enum values and registers raw drafts by stable row/column address.
  - `UserDateEditor` edits Brazilian `DD/MM/YYYY` text, emits normalized ISO strings or empty drafts, preserves the committed value on invalid conversion, exposes Portuguese validation feedback, and preserves native keyboard/clipboard behavior.
- Added `src/components/UserGrid.tsx` with:
  - A stable `createImmutableDataAdapter` backed by the supplied `UseFormReturn<UsersFormValues>`.
  - Synchronous ID-based leaf publication into RHF, version/acknowledgment publication before return, and deferred validation.
  - Stable Spreadsheet bindings/configuration, `useWatch` row projection, `readOnlyEdit: true`, pt-BR locale, the four required columns, supplied text/number editors, custom role/date editors, BRL/date display formatting, error classes/tooltips, partial-batch status reporting, and nonzero host height.
  - Public grid controls for finishing/canceling edits, external synchronization/history invalidation, revealing/focusing a newly added row, and focusing the first validation error.
- Imported `sbwb-ds-v2-aggrid/styles/theme.css` once from `src/main.tsx`.

## Verification commands

- `npm test` — passed: 1 test file, 1 test, 0 failures.
- `npm run build` — passed: `tsc -b` and Vite build completed successfully. Vite reports the existing non-fatal warning that the main minified chunk is larger than 500 kB.
- `npm run lint` — passed: ESLint reported no issues.
- `git diff --check` — passed with no whitespace errors.

Task 3 owns the real screen and integrated browser checks, so no browser regression was run for the unmounted grid component in this task.

## Files changed

- `src/users/editors.tsx`
- `src/components/UserGrid.tsx`
- `src/main.tsx`
- `.superpowers/sdd/2026-11-25-cadastro-usuarios/task-2-report.md`

## Concerns

- Browser interaction coverage is intentionally deferred to Task 3, where the real form owner, controls, and layout are mounted.
- Vite retains the pre-existing large-chunk warning; no code-splitting change was made because it is outside this integration task.
- Context7 was attempted as required, but the local package was not indexed (the lookup returned unrelated Streamlit AgGrid results); bundled `sbwb-ds-v2-aggrid` docs and installed public type/runtime signatures were used as the authority.

## Round 1 review correction

The imperative `focusFirstError()` path no longer depends on the passive-effect timing of `showAllErrorsRef`. It now uses `hasFieldError()` to inspect raw RHF field errors by domain ID, while `getFieldError()` retains the touched/all-errors gate for visual cell decoration. This means an untouched invalid new row can be located immediately after the screen requests all-error visibility, even before React flushes that visibility effect.

Verification after the correction:

- `npm run build` — passed; the existing Vite large-chunk warning remains non-fatal.
- `npm run lint` — passed with no issues.
- `npm test` — passed: 1 test file, 1 test, 0 failures.
- `git diff --check` — passed.
- Source-path self-review (`rg` over `hasFieldError`, `focusFirstError`, and `showAllErrorsRef`) confirmed the imperative path uses raw errors and the presentation path retains visibility filtering.

The integrated browser regression for an untouched invalid new row remains deferred to Task 3, where the real Save flow mounts the form, toggles all-error visibility, and invokes `focusFirstError()`.
