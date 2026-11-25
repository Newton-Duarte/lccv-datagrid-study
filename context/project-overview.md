# Project Overview

## Goal
Provide a clean, copy-pasteable reference implementation in `pt-BR` demonstrating `sbwb-ds-v2-aggrid` configured as an Excel-like editable grid alongside our internal Design System.

## Screen Specification: Cadastro de Usuários
Build a single main screen matching our standard list layout:

1. **Page Header:**
   - **Left:** Section icon, title (`Usuários`), and live record counter (`X registros`).
   - **Right:** Primary action button (`Novo usuário`) that appends a new blank/default row directly to the grid and focuses its first cell for immediate typing.
   - *(Optional)* Secondary button (`Salvar alterações` / `Descartar`) if managing dirty form state via React Hook Form.

2. **Excel-Like DataGrid Columns (No Actions Column):**
   - **Nome (`name`):** Editable text cell (required).
   - **Perfil / Cargo (`role`):** Editable select dropdown cell (`Administrador`, `Editor`, `Visualizador`).
   - **Data de nascimento (`birthDate`):** Editable date cell formatted as `DD/MM/YYYY` (`pt-BR`).
   - **Carga horária / Pontuação (`numericValue`):** Editable numeric cell formatted with `pt-BR` separators (e.g., `160` or `1.250,00`).

3. **Spreadsheet Behavior:**
   - Enable the library's Spreadsheet module (cell range selection, keyboard navigation with Arrow/Enter/Tab keys, copy/paste, and direct cell editing).
   - No per-row "Ações" column—keep the table clean and spreadsheet-focused.

## Data & Persistence
- Seed the grid with 15–20 realistic Brazilian user records in `src/data/mockUsers.ts`.
- All additions and inline cell edits persist locally in browser memory.
