# Project Overview

## Goal
Provide a clean, copy-pasteable reference implementation in `pt-BR` demonstrating `sbwb-ds-v2-aggrid` configured as an Excel-like editable grid alongside our internal Design System.

## Screen Specification: Cadastro de Usuários
Build a single main screen matching our standard list layout:

1. **Page Header:**
   - **Left:** Section icon, title (`Usuários`), and live record counter (`X registros`).
   - **Right:** Primary action button (`Novo usuário`) that appends a new blank/default row directly to the grid and focuses its first cell for immediate typing.
   - **Save/Discard:** `Salvar alterações` validates the whole sheet and updates the saved baseline; `Descartar` restores the last saved version. Manage pending changes with React Hook Form, Zod, and `zodResolver`.

2. **Excel-Like DataGrid Columns (No Actions Column):**
   - **Nome (`name`):** Editable text cell (required).
   - **Perfil (`role`):** Editable select dropdown cell (`Administrador`, `Editor`, `Visualizador`).
   - **Data de nascimento (`birthDate`):** Editable date cell formatted as `DD/MM/YYYY` (`pt-BR`).
   - **Salário mensal (R$) (`salary`):** Editable gross monthly salary, stored as a number and displayed as BRL with `pt-BR` separators and two decimal places (e.g., `R$ 5.420,50`). Reject negative salaries and malformed input; permit an empty draft while completing a new row, but require a salary when saving.

3. **Spreadsheet Behavior:**
   - Connect the library's `useSpreadsheet` hook (cell range selection, keyboard navigation with Arrow/Enter/Tab keys, copy/paste, and direct cell editing).
   - No per-row "Ações" column—keep the table clean and spreadsheet-focused.

## Data & Persistence
- Seed the grid with 15–20 realistic Brazilian user records in `src/features/users/data/mock-users.ts`.
- React Hook Form owns all additions and inline cell edits in browser memory.
- Saving validates required names, valid profiles and dates, and nonnegative salaries, then updates an in-memory saved baseline. Discarding restores that baseline, including undoing unsaved row additions.
- Refreshing the page reloads the mock data; Save does not write to a backend or browser storage.
