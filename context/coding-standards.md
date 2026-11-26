# Coding Standards

- **Stack:** React, TypeScript (strict mode), Vite.
- **Public Imports:** Use `DataGrid` and Spreadsheet exports from `sbwb-ds-v2-aggrid`. Follow its bundled examples for public peer imports from `ag-grid-community` and `ag-grid-react`, including grid and reactive editor types. Import locale maps from `@ag-grid-community/locale`. Render the `DataGrid` wrapper rather than `AgGridReact`, and avoid private package paths.
- **Localization (`pt-BR`):**
  - Configure `sbwb-ds-v2-aggrid` with `pt-BR` locale settings as documented in `node_modules/sbwb-ds-v2-aggrid/docs/consumer/`.
  - Store dates as ISO strings (`YYYY-MM-DD`) and format them as `DD/MM/YYYY` without timezone day shifts. The library does not provide a date column preset or date editor.
  - Format salaries using `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Use `SpreadsheetNumberEditor` with `createSpreadsheetNumberParser({ locale: 'pt-BR' })` for numeric input; display formatting is independent of parsing.
- **Spreadsheet & Form Integration:** Follow the exact patterns in `spreadsheet-mode.md` and `react-hook-form.md`. Use one React Hook Form owner with Zod validation and `zodResolver` from `@hookform/resolvers/zod`. Publish accepted changes synchronously by stable row ID, validate outside the Spreadsheet commit, finish active editing before Save, and synchronize the adapter after Discard or structural row changes. Save updates an in-memory baseline; Discard restores it.
- **File Organization:**
  - `src/features/users/data/mock-users.ts` — Typed seed data (`UserRecord`) with realistic `pt-BR` names, roles, ISO dates (`YYYY-MM-DD`), and salaries.
  - `src/features/users/components/user-grid.tsx` — Excel-like DataGrid configuration, `pt-BR` column definitions, and cell editors.
  - `src/features/users/components/users-page.tsx` — Page shell (`Usuários (X registros)` + `Novo usuário` button) + `UserGrid`.
- **Styling:** Use our configured Design System (`@sbwb-design-system/ui-core` & `sbwb-icons`) and components for layout, spacing, icons, and buttons. Do not write custom CSS overrides for AG Grid classes. Our design system tailwind uses `sw:` prefix.
