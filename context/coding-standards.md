# Coding Standards

- **Stack:** React, TypeScript (strict mode), Vite.
- **Localization (`pt-BR`):**
  - Configure `sbwb-ds-v2-aggrid` with `pt-BR` locale settings as documented in `node_modules/sbwb-ds-v2-aggrid/docs/consumer/`.
  - Format dates using `DD/MM/YYYY` (`Intl.DateTimeFormat('pt-BR')` or the library's built-in date column type).
  - Format numbers using `Intl.NumberFormat('pt-BR')` or the library's numeric column helper.
- **Spreadsheet & Form Integration:** Follow the exact patterns in `spreadsheet-mode.md` (and `react-hook-form.md` if binding the spreadsheet rows to a form).
- **File Organization:**
  - `src/data/mockUsers.ts` — Typed seed data (`UserRecord`) with realistic `pt-BR` names, roles, ISO dates (`YYYY-MM-DD`), and numbers.
  - `src/components/UserGrid.tsx` — Excel-like DataGrid configuration, `pt-BR` column definitions, and cell editors.
  - `src/app.tsx` — Page header shell (`Usuários (X registros)` + `Novo usuário` button) + `UserGrid`.
- **Styling:** Use our configured Design System (`@sbwb-design-system/ui-core` & `sbwb-icons`) and components for layout, spacing, icons, and buttons. Do not write custom CSS overrides for AG Grid classes. Our design system tailwind uses `sw:` prefix.
