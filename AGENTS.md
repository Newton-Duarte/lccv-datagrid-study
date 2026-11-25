# AI Agent Instructions — DataGrid Showcase App

This repository is a reference React + Vite + TypeScript application demonstrating `sbwb-ds-v2-aggrid` in a local-only, Excel-like `pt-BR` screen.

## Mandatory Reading Before Coding
1. **Library Documentation:** Read `node_modules/sbwb-ds-v2-aggrid/docs/llms.txt` and `node_modules/sbwb-ds-v2-aggrid/docs/consumer/AGENTS.md` before building or modifying any table components. Specifically check `spreadsheet-mode.md` and `react-hook-form.md` (if applicable).
2. **Project Context:** Read `context/project-overview.md`, `context/coding-standards.md`, and `context/ai-interaction.md` in this repo.

## Core Guardrails
- **Locale (`pt-BR`):** All UI labels, grid localization (filters, pagination, empty states), dates (`DD/MM/YYYY`), and numeric formatting (`1.234,56`) must be in Brazilian Portuguese (`pt-BR`).
- **Excel-Like Interaction:** Do **not** add an "Actions" column with edit/delete buttons per row. All editing happens inline directly inside the cells (spreadsheet behavior).
- **No Backend / API Calls:** Keep all state, row additions, and edits purely in-memory.
- **Public Boundary Only:** Import the grid wrapper and Spreadsheet APIs from `sbwb-ds-v2-aggrid`. Public peer imports from `ag-grid-community` and `ag-grid-react` are allowed when used by the library's documented integration patterns (for example, `ColDef`, `GridApi`, and reactive editor types). Import locale maps from `@ag-grid-community/locale`. Always render `DataGrid`; do not replace it with `AgGridReact` or import private package paths. Use our internal Design System components for the application UI.
- **Form Ownership:** Use React Hook Form with Zod and `zodResolver` from `@hookform/resolvers/zod`. The form owns the editable rows; `Salvar alterações` validates the whole sheet and updates an in-memory saved baseline, while `Descartar` restores that baseline.
