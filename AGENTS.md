# AI Agent Instructions — DataGrid Showcase App

This repository is a reference React + Vite + TypeScript application demonstrating `sbwb-ds-v2-aggrid` in a local-only, Excel-like `pt-BR` screen.

## Mandatory Reading Before Coding
1. **Library Documentation:** Read `node_modules/sbwb-ds-v2-aggrid/docs/llms.txt` and `node_modules/sbwb-ds-v2-aggrid/docs/consumer/AGENTS.md` before building or modifying any table components. Specifically check `spreadsheet-mode.md` and `react-hook-form.md` (if applicable).
2. **Project Context:** Read `context/project-overview.md`, `context/coding-standards.md`, and `context/ai-interaction.md` in this repo.

## Core Guardrails
- **Locale (`pt-BR`):** All UI labels, grid localization (filters, pagination, empty states), dates (`DD/MM/YYYY`), and numeric formatting (`1.234,56`) must be in Brazilian Portuguese (`pt-BR`).
- **Excel-Like Interaction:** Do **not** add an "Actions" column with edit/delete buttons per row. All editing happens inline directly inside the cells (spreadsheet behavior).
- **No Backend / API Calls:** Keep all state, row additions, and edits purely in-memory.
- **Public Boundary Only:** Never import directly from `ag-grid-react` or `ag-grid-community`. Always use `sbwb-ds-v2-aggrid` and our internal Design System components.
