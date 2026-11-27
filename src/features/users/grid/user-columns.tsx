import type { ColDef } from 'ag-grid-community'
import {
  SpreadsheetNumberEditor,
} from 'sbwb-ds-v2-aggrid'
import type { SpreadsheetCellRendererParams } from 'sbwb-ds-v2-aggrid'
import { BRL_FORMAT } from '../../../utils/currency.ts'
import { formatDateBR } from '../../../utils/date.ts'
import { DateEditor } from '../components/editors/date-editor.tsx'
import { RoleEditor } from '../components/editors/role-editor.tsx'
import { UserCellContent } from '../components/user-cell-content.tsx'
import { FirstKeyTextEditor } from '../components/editors/first-key-text-editor.tsx'
import type { UserField, UserRecord } from '../types.ts'

type UserCellRendererParams = Pick<
  SpreadsheetCellRendererParams<UserRecord, unknown>,
  'eGridCell' | 'value' | 'valueFormatted'
>

export function createUserColumns(
  getFieldError: (rowId: string | undefined, field: UserField) => string | undefined,
): ColDef<UserRecord>[] {
  const renderCell = () => (params: SpreadsheetCellRendererParams<UserRecord, unknown>) => (
    <UserCellContent
      params={params as UserCellRendererParams}
    />
  )

  const invalidRules = (field: UserField) => ({
    'user-grid-cell--invalid': ({ data }: { data: UserRecord | undefined }) =>
      getFieldError(data?.id, field) !== undefined,
  })

  return [
    {
      field: 'name',
      colId: 'name',
      headerName: 'Nome',
      editable: true,
      flex: 1,
      minWidth: 260,
      cellEditor: FirstKeyTextEditor<UserRecord>,
      cellEditorParams: { inputAriaLabel: 'Nome do usuário' },
      cellRendererParams: { renderContent: renderCell() },
      cellClassRules: invalidRules('name'),
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'name'),
    },
    {
      field: 'role',
      colId: 'role',
      headerName: 'Perfil',
      editable: true,
      width: 190,
      minWidth: 160,
      maxWidth: 220,
      cellEditor: RoleEditor,
      cellEditorParams: { inputAriaLabel: 'Perfil' },
      cellRendererParams: { renderContent: renderCell() },
      cellClassRules: invalidRules('role'),
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'role'),
    },
    {
      field: 'birthDate',
      colId: 'birthDate',
      headerName: 'Data de nascimento',
      editable: true,
      width: 170,
      minWidth: 150,
      maxWidth: 190,
      cellEditor: DateEditor,
      cellEditorParams: { inputAriaLabel: 'Data de nascimento' },
      suppressKeyboardEvent: ({ event, editing }) => editing
        && event.key === 'Enter'
        && !event.ctrlKey
        && !event.metaKey
        && !event.altKey
        && !event.shiftKey,
      cellRendererParams: { renderContent: renderCell() },
      valueFormatter: ({ value }) => formatDateBR(typeof value === 'string' ? value : ''),
      cellClassRules: invalidRules('birthDate'),
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'birthDate'),
    },
    {
      field: 'salary',
      colId: 'salary',
      headerName: 'Salário mensal (R$)',
      editable: true,
      width: 180,
      minWidth: 160,
      maxWidth: 210,
      type: 'numericColumn',
      cellDataType: 'number',
      cellEditor: SpreadsheetNumberEditor<UserRecord>,
      cellEditorParams: { inputAriaLabel: 'Salário mensal em reais' },
      cellRendererParams: { renderContent: renderCell() },
      valueFormatter: ({ value }) => typeof value === 'number' && Number.isFinite(value) ? BRL_FORMAT.format(value) : '',
      cellClass: 'ag-right-aligned-cell',
      cellClassRules: invalidRules('salary'),
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'salary'),
    },
  ] as ColDef<UserRecord>[]
}
