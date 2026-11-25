# Cadastro de Usuários — final fix report

## Scope

This fix wave addresses every Important finding in `final-review.md` and the three related minors. The implementation remains local-only, keeps React Hook Form as the form owner, uses the public `sbwb-ds-v2-aggrid` boundary, and does not modify `node_modules` or private APIs.

## Implementation evidence

- Discard now increments a keyed `UserGrid` instance on every reset, including an equal-valued reset, and explicitly clears the external editing state. The saved RHF baseline remains outside the keyed grid, so Save does not clear Spreadsheet history while Discard always starts a fresh Spreadsheet history.
- The error summary follows the same touched/show-all policy as cell presentation. Save enables `showAllErrors`; normal cell edits expose only touched field errors.
- Error-summary entries use `user.id` plus field as stable DOM/React IDs. Blank names use `Novo usuário (linha N)` and duplicate names include their row number.
- Each editable cell uses documented `cellRendererParams.renderContent` and public AG Grid `eGridCell` to synchronize `aria-invalid` and `aria-describedby` with the visible summary entry. No private grid bridge is used.
- Accepted Spreadsheet operations now announce `Operação aplicada nesta sessão.`; rejected and mixed operations retain their rejection messages. New-row insertion publishes the filter/sort reset in the same announcement when applicable.
- The name column has increased flex weight; the narrow action buttons stay on one line; the date editor requests a text keyboard so separators remain available; and `UserGrid.tsx` no longer has a trailing blank line.
- Browser coverage now captures clipboard range copying with Ctrl+C, fills active editors without Enter before Save, verifies invalid Save preserves the saved baseline, verifies undo/redo after Discard, checks summary visibility and row-specific errors for two blank drafts, checks accessible invalid cells and cleanup, checks rejected-to-accepted feedback, and waits for a genuinely empty filtered view before insertion.

## Verification commands and results

- `npm test` — PASS (1 test file, 1 test passed).
- `npm run lint` — PASS (`ESLint: No issues found`).
- `npm run build` — PASS (`tsc -b && vite build`). Vite emitted only its existing informational warning about the minified chunk exceeding 500 kB.
- `playwright-cli -s=spreadsheet-final run-code --filename=scripts/verify-users-browser.js` — PASS. The callback collected `console` error and `pageerror` events and ended with zero browser errors and zero external requests.
- `git diff --check` before commit — PASS for the working tree.
- `git diff --check 17ba36a..HEAD` — PASS after the scoped commit; the complete implementation range has no whitespace errors.

## Browser evidence

The local Vite server was available at `http://127.0.0.1:5187/`; Playwright session: `spreadsheet-final`.

- Desktop screenshot: `/tmp/cadastro-usuarios-desktop.png` (1440×1000 viewport; grid host fits within the card and salary remains visible).
- Narrow screenshot: `/tmp/cadastro-usuarios-narrow.png` (390×844 viewport; no document-level horizontal overflow, grid-local horizontal scrolling remains available, and action labels do not wrap).

The callback passed the initial screen, Save/Discard baseline behavior, active name/salary/date Save, sorting, true empty filtered insertion and combined reset feedback, invalid Save focus and baseline preservation, two-draft summary/accessibility cleanup, Ctrl+C range copy and paste, mixed paste rejection followed by accepted paste, fill, Delete/undo/redo, keyboard editors, narrow geometry, reload reset, storage isolation, and console/request assertions.

## Concerns and limitations

No known functional concerns remain from the final review. The build-size warning is informational and outside the approved scope. Browser verification is against the local Vite server and in-memory data, as required; it does not claim backend persistence.
