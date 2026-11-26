# Usuários refinements — design

Status: approved by the user on 2026-11-26. This document builds on the existing screen and supersedes the earlier layout and source-organization choices for this refinement round.

## Intent and scope

Polish the existing local spreadsheet into a compact ERP-style screen using the installed `@sbwb-design-system/ui-core` components and semantic theme utilities. Replace the native profile editor and hand-built date input with reusable DS-based controls, give user data meaningful names, and separate feature behavior from shared utilities and presentation.

The existing spreadsheet behaviors remain required: synchronous form ownership by stable user ID, inline editing, range selection, clipboard, fill, bulk editing, Save/Discard, accessible validation, and undo/redo. Keep everything in memory, in `pt-BR`, without an Actions column or backend.

## Decisions made with the user

- Rename `UserRecord.numericValue` to `salary` throughout the active application, bindings, schema, seed data, field paths, validation IDs, tests, and current documentation. Salary remains `number | null` while drafting and required/nonnegative on Save.
- Rename the column and editor label `Perfil / Cargo` to `Perfil`.
- Use DS semantic/brand/error/success/warning colors and DS components instead of app-authored hexadecimal colors.
- Add reusable `AppSelect` and `AppDatePicker` compositions, then use them from separate `RoleEditor` and `DateEditor` feature components.
- `RoleEditor` derives its options from `USER_ROLES` rather than duplicating literals.
- Choosing a profile or calendar date commits the cell immediately and closes the picker. Typed dates retain Enter/Tab confirmation and Escape cancellation.
- The shared `AppDatePicker` accepts an ISO calendar-date string (`YYYY-MM-DD`) or an empty string; it converts to/from DS `Date` values internally.
- Use the DS `Alert` for the validation error summary.
- Apply the exact typography, footer placement, column sizes, and alignment requested below.
- Preserve the existing execution preferences when implementation is authorized: orchestration with GPT-5.6 Luna at xhigh, no worktrees, and no TDD. Regression checks follow implementation.

## Approaches considered

1. **ISO-first shared DatePicker — selected.** Shared date utilities and the wrapper centralize calendar-date conversion and localized display, while feature editors own spreadsheet behavior. This matches the current row model and avoids repeating conversion in each feature.
2. **DS-shaped shared DatePicker — considered.** Expose `Date | undefined` and convert in feature editors. This mirrors the DS more closely, but repeats conversion and timezone handling. The user selected the ISO-first approach.

Keep the shared controls independent of users, React Hook Form, and AG Grid. The users feature supplies domain options, constraints, form state, error mapping, and editor lifecycle. Do not build a general form/grid framework for this one screen.

## Proposed source organization

Use `src/features/users` (assistant choice from the user's permitted `features`/`modules` alternatives). Organize by responsibilities rather than moving the current large files unchanged:

```text
src/
  app.tsx                         # Mount UsersPage
  components/
    app-select.tsx                # Reusable DS Select composition
    app-datepicker.tsx            # Reusable ISO-first DS DatePicker composition
  utils/
    date.ts                       # Calendar validation, pt-BR parsing/formatting, ISO↔Date conversion
    currency.ts                   # Shared BRL display formatting
  features/users/
    types.ts                      # UserRecord, UserRole, UsersFormValues
    constants.ts                  # USER_ROLES and user-field metadata
    schema.ts                     # Zod validation
    data/mock-users.ts            # Typed fictional seed records
    grid/user-bindings.ts          # Stable immutable bindings and salary parser
    grid/user-columns.tsx          # Stable column configuration
    hooks/                        # Form/baseline, Spreadsheet adapter, editor draft integration
    utils/                        # User validation/identity helpers only where useful
    components/
      users-page.tsx
      user-grid.tsx
      users-header.tsx
      users-footer.tsx
      users-error-summary.tsx
      user-cell-content.tsx
      editors/role-editor.tsx
      editors/date-editor.tsx
```

Exact hook/helper filenames remain a builder choice. Avoid empty directories, one-file layers with no useful boundary, duplicate metadata, circular imports, and blanket barrel exports. Generic date/currency code must not depend on the users feature or UI packages. Preserve idiomatic component exports while using the requested reusable app-component filenames.

## Shared controls and editor behavior

`AppSelect` composes the public DS Select primitives, accepts controlled string values and reusable options, and forwards the refs, accessibility attributes, open-state events, and keyboard hooks its consumers need. Options are supplied by the feature; the shared control has no knowledge of `USER_ROLES` or grid APIs.

`AppDatePicker` composes public DatePicker input/calendar primitives. It accepts `YYYY-MM-DD | ''`, emits ISO/empty values, exposes raw-input and calendar-selection signals where needed, and supports min/max constraints without embedding a birth-date rule. The feature DateEditor supplies the existing nonfuture-date constraint. Keep typed Brazilian dates, calendar selection, clearing, and external reset consistent; verify value→empty→value sequences rather than assuming `undefined` always remains controlled inside the DS. Convert calendar dates without UTC day shifts. Preserve stored date and salary precision rules.

Both controls have an app-owned cell-density presentation that fits the existing grid row height and column bounds. Adjust control padding, borders, radii, dimensions, and popup positioning through public DS props/classes and app-scoped styles. Do not change DataGrid font sizes or override AG Grid classes. Reusable default presentation remains suitable outside a grid.

Popup content must remain visible outside the grid/card clipping boundary and count as belonging to the active editor for focus, clipboard, keyboard, and draft registration. Use public portal/container/ref APIs and documented grid popup integration. Both pickers close on committed selection. Escape inside a picker must cancel the appropriate active draft without publishing a partially chosen value. Ensure the selected value reaches the reactive editor before stopping it; portalled content must not accidentally terminate editing early or steal unrelated shortcuts.

Preserve Ctrl+Enter raw-draft bulk behavior and native text clipboard ownership. The shared components remain unaware of the Spreadsheet registry; thin feature editors connect it. DatePicker input handles Enter internally, so the adapter must coordinate its commit rather than blindly reusing the old key-forwarding helper. The installed DatePicker defaults to a `pt-BR` locale, but its default placeholder and calendar-trigger label are English; override those and localize calendar navigation, month/year controls, and other accessibility text. Birth-date navigation should make past years practical to select.

## Typography and theme

| Element | Required result |
| --- | --- |
| Page title | 24px / 1.5rem, weight 600, tight line-height, semantic h1 |
| Subtitle | 14px / 0.875rem |
| Record count | DS Badge size `md`, 12px |
| Grid | Library default 14px; no application font-size override inside the DataGrid |
| Footer, shortcut keys/badges, session note | Minimum 12px / 0.75rem |

The installed DS offers `Text variant="title-md"` for the title scale, `body-md` for the subtitle, and `body-sm` for 12px supporting text; verify computed sizes during implementation. Use `sw:` spacing, typography, semantic background/text/border, brand, and status utilities. Use DS component variants where available. In the installed theme, Alert's `error`/`success`/`warning` variants use the exported red/green/amber palette; choose actual available utility/token names rather than assuming an `error-*` utility namespace exists. Replace hardcoded shell/icon/error/shortcut colors; app-owned invalid-cell classes may use DS tokens without overriding AG Grid classes. Preserve library-owned default typography and theme behavior.

## Footer, pending state, and feedback

Remove the always-visible status banner above the grid. The header retains the icon, compact title/subtitle/count, and `Novo usuário`.

The grid footer puts the four keyboard hints on the left (`F2 Editar`, `Tab Próxima célula`, `Ctrl+C / V Copiar e colar`, `Ctrl+Z Desfazer`) and `Descartar` / `Salvar alterações` on the right. Remove the old selection legend. On narrow screens, wrap the groups and stack action buttons when needed; keep labels legible and grid scrolling local.

When `isDirty` is true, show a DS `BadgeDot` with a warning color scheme on or beside Save, with accessible pending-change text. Both actions are disabled when there is no pending work and during guarded transitions.

Assistant interpretation preserving the existing last-cell Save requirement: an actually changed active editor draft also counts as pending work before RHF receives its committed value. Merely opening an unchanged editor should not enable actions. The dot follows form dirty state; first-edit Save still finishes and validates the draft. Detect draft activity through public editor/input contracts rather than mutating authoritative form values on every raw keystroke or reading private grid internals.

Keep operation feedback in a compact footer-associated `aria-live` region using DS semantic text styles, without reintroducing an always-visible top banner. Accepted operations replace stale rejection messages; insertion feedback includes filter/sort resets when applicable. Save remains session-only; keep a 12px explanatory note.

## DS Alert validation summary

Replace the hand-built error container with `Alert variant="error"`, `AlertIcon`, `AlertContent`, and `AlertTitle`. A title such as `Corrija os campos abaixo para salvar` introduces a semantic error list inside AlertContent. `AlertDescription` is a paragraph component: do not nest a `ul` inside it.

The Alert appears only when visible validation errors exist. Before Save, show touched-field errors; a Save attempt exposes all current errors. Preserve stable domain-ID-plus-field keys and IDs and labels that distinguish blank users and duplicate names. Keep grid-cell `aria-invalid` and `aria-describedby` synchronized with the corresponding visible error item, including removal after correction. Preserve focus/reveal of the first invalid cell after Save. Do not add dismissal while the Alert owns active error descriptions.

## Columns and alignment

| Column | Field / ID | Width configuration | Alignment |
| --- | --- | --- | --- |
| Nome | `name` | `flex: 1`, `minWidth: 260` | Left |
| Perfil | `role` | `width: 190`, `minWidth: 160`, `maxWidth: 220` | Left |
| Data de nascimento | `birthDate` | `width: 170`, `minWidth: 150`, `maxWidth: 190` | Left |
| Salário mensal (R$) | `salary` | `width: 180`, `minWidth: 160`, `maxWidth: 210` | Header and values right |

Do not let a shared default `flex` override the bounded columns. Use the inherited public `type: 'numericColumn'` for salary, alongside `cellDataType: 'number'` and the existing localized numeric editor/parser. AG Grid documents that this type aligns both header and cell contents; DataGrid supplies Community modules. Keep custom error classes/renderContent from replacing the alignment classes. The installed wrapper adds no separate predefined column-type API; use its public peer pass-through rather than the illustrative `@your-org/datagrid` package path in the request.

## Refactor and compatibility constraints

Preserve stable adapters/bindings/column IDs during edits, synchronous accepted publication and acknowledgments, and one RHF/Zod/resolver owner. Save captures the last active edit and updates the in-memory baseline. Discard cancels drafts, restores the complete saved row set, and starts fresh history even for equal-valued resets; the existing keyed lifecycle reset may remain outside the form owner. Undo after Save may make the form dirty again.

The salary rename is end-to-end; do not keep a compatibility `numericValue` alias. No durable data migration is necessary because the application is in-memory. Update active context docs, README, unit/browser imports/selectors/assertions, and public-boundary guidance as needed. Preserve historical design/plan documents as history and clearly point to this refinement when older names/layout conflict.

## Verification and completion

After implementation, run `npm run build`, `npm run lint`, Node regression checks, and full-range whitespace validation. Use meaningful post-implementation regression checks rather than TDD. Verify the real screen in desktop and 390px layouts, with computed typography, exact column bounds, header/value alignment, semantic theme colors, and unclipped footer/actions.

Exercise DS popup selection, Enter/Tab/Escape, typed date parsing, clear/reset cycles, focus restoration, and immediate selection commit. Retain active-editor Save, untouched/duplicate-draft Alert behavior, accessible cell errors and cleanup, true empty-filter insertion, raw clipboard/fill/bulk operations, lossless salary copying, and no storage/backend requests. Add the previously manual populated-history case: save a name, type another active draft, Discard, then Ctrl+Z and redo must preserve the saved name and clean state. Check browser console errors and popup clipping. Verify that merely opening an editor keeps clean actions disabled while changing an active draft makes confirmation available.

## Builder choices and references

The builder chooses exact focused hook names, internal wrapper prop names, public popup/focus mechanics, and utility test organization. Any DS limitation affecting the required behavior should be reported with evidence before widening scope or editing dependencies.

Sources inspected: installed `@sbwb-design-system/ui-core` README/public declarations and runtime, theme Tailwind entry, bundled Spreadsheet/RHF/renderer/column/locale/API guides, and current [AG Grid provided column types](https://www.ag-grid.com/react-data-grid/column-definitions/). Context7 did not index the internal DS package; its installed public contracts are authoritative here.
