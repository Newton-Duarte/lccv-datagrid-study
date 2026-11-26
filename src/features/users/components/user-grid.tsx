import { AG_GRID_LOCALE_BR } from '@ag-grid-community/locale'
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import {
  DataGrid,
  SpreadsheetNumberEditor,
  SpreadsheetTextEditor,
  createImmutableDataAdapter,
  useSpreadsheet,
} from 'sbwb-ds-v2-aggrid'
import type { DataAcknowledgment, OperationResult, SpreadsheetCellRendererParams } from 'sbwb-ds-v2-aggrid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useFormState, useWatch } from 'react-hook-form'
import type { UserField, UserRecord } from '../types.ts'
import type { UserGridControls, UserGridProps } from '../grid/types.ts'
import { USER_BINDINGS } from '../grid/user-bindings.ts'
import { cloneUserRows } from '../utils/user-record.ts'
import { formatDateBR } from '../../../utils/date.ts'
import { BRL_FORMAT } from '../../../utils/currency.ts'
import { DateEditor } from './editors/date-editor.tsx'
import { RoleEditor } from './editors/role-editor.tsx'
import { UserCellContent } from './user-cell-content.tsx'
import { isVisibleUserError, userErrorId } from '../utils/validation.ts'

type PendingFocus = { rowId: string; columnId: UserField }
type UserCellRendererParams = Pick<
  SpreadsheetCellRendererParams<UserRecord, unknown>,
  'eGridCell' | 'value' | 'valueFormatted'
>

const EDITABLE_COLUMNS = ['name', 'role', 'birthDate', 'salary'] as const satisfies readonly UserField[]

function isNonEmptyRecord(value: object): boolean {
  return Object.keys(value).length > 0
}

export function UserGrid({
  form,
  showAllErrors,
  onReady,
  onStatus,
  onEditingChange,
}: UserGridProps): ReactElement {
  const watchedUsers = useWatch({ control: form.control, name: 'users' })
  const users = useMemo(() => watchedUsers ?? [], [watchedUsers])
  // Keep a dedicated RHF subscription: nested errors/touched objects may retain
  // identity while their contents change between validation notifications.
  const validationState = useFormState({ control: form.control })
  const validationErrors = validationState.errors
  const validationTouchedFields = validationState.touchedFields
  const apiRef = useRef<GridApi<UserRecord> | null>(null)
  const pendingRevealRef = useRef<string | null>(null)
  const pendingFocusRef = useRef<PendingFocus | null>(null)
  const onStatusRef = useRef(onStatus)
  const onEditingChangeRef = useRef(onEditingChange)
  const showAllErrorsRef = useRef(showAllErrors)
  const spreadsheetControllerRef = useRef<ReturnType<typeof useSpreadsheet<UserRecord>>['controller'] | null>(null)
  const [acknowledgment, setAcknowledgment] = useState<DataAcknowledgment>()

  useEffect(() => {
    onStatusRef.current = onStatus
    onEditingChangeRef.current = onEditingChange
    showAllErrorsRef.current = showAllErrors
  }, [onEditingChange, onStatus, showAllErrors])

  const getFieldError = useCallback(
    (rowId: string | undefined, field: UserField): string | undefined => {
      if (rowId === undefined) return undefined
      const index = form.getValues('users').findIndex((row) => row.id === rowId)
      if (index < 0) return undefined
      const state = form.getFieldState(`users.${index}.${field}`)
      if (!isVisibleUserError(state, showAllErrorsRef.current)) return undefined
      if (state.error === undefined) return undefined
      return typeof state.error.message === 'string' ? state.error.message : 'Valor inválido.'
    },
    [form],
  )

  const hasFieldError = useCallback(
    (rowId: string | undefined, field: UserField): boolean => {
      if (rowId === undefined) return false
      const index = form.getValues('users').findIndex((row) => row.id === rowId)
      return index >= 0 && Boolean(form.getFieldState(`users.${index}.${field}`).error)
    },
    [form],
  )

  const [dataState] = useState(() => {
    let version = 0
    const data = createImmutableDataAdapter<UserRecord>({
      getSnapshot: () => ({ version, rows: cloneUserRows(form.getValues('users')) }),
      getRowId: (row) => row.id,
      bindings: USER_BINDINGS,
      publish: (next, ack) => {
        const current = form.getValues('users')
        const currentById = new Map(current.map((row, index) => [row.id, { index, row }]))

        for (const nextRow of next.rows) {
          const entry = currentById.get(nextRow.id)
          if (entry === undefined) continue
          const options = { shouldDirty: true, shouldTouch: true, shouldValidate: false }
          for (const field of EDITABLE_COLUMNS) {
            if (Object.is(entry.row[field], nextRow[field])) continue
            form.setValue(`users.${entry.index}.${field}`, nextRow[field], options)
          }
        }

        version = next.version
        setAcknowledgment(ack)
        queueMicrotask(() => void form.trigger())
      },
    })
    return {
      data,
      advanceVersion: () => {
        version += 1
      },
    }
  })

  const tryRevealOrFocus = useCallback(() => {
    const api = apiRef.current
    if (api === null) return

    const pendingFocus = pendingFocusRef.current
    if (pendingFocus !== null) {
      const rowNode = api.getRowNode(pendingFocus.rowId)
      if (rowNode?.rowIndex != null) {
        pendingFocusRef.current = null
        api.ensureNodeVisible(rowNode, 'middle')
        api.ensureColumnVisible(pendingFocus.columnId)
        api.setFocusedCell(rowNode.rowIndex, pendingFocus.columnId)
      }
    }

    const rowId = pendingRevealRef.current
    if (rowId === null) return
    const rowNode = api.getRowNode(rowId)
    if (rowNode?.rowIndex == null) return

    pendingRevealRef.current = null
    api.ensureNodeVisible(rowNode, 'middle')
    api.ensureColumnVisible('name')
    api.setFocusedCell(rowNode.rowIndex, 'name')
    const startEditing = (attempt: number) => {
      const currentNode = api.getRowNode(rowId)
      if (currentNode?.rowIndex == null) {
        if (attempt < 8) window.setTimeout(() => startEditing(attempt + 1), 30)
        return
      }
      api.setFocusedCell(currentNode.rowIndex, 'name')
      api.startEditingCell({ rowIndex: currentNode.rowIndex, colKey: 'name' })
      if (api.getEditingCells().length === 0 && attempt < 8) window.setTimeout(() => startEditing(attempt + 1), 30)
    }
    window.setTimeout(() => startEditing(0), 0)
  }, [])

  useEffect(() => {
    queueMicrotask(tryRevealOrFocus)
  }, [tryRevealOrFocus, users])

  const finishEditing = useCallback(
    () => new Promise<void>((resolve) => {
      const api = apiRef.current
      if (api === null || api.getEditingCells().length === 0) {
        resolve()
        return
      }
      const stopped = () => {
        api.removeEventListener('cellEditingStopped', stopped)
        resolve()
      }
      api.addEventListener('cellEditingStopped', stopped)
      api.stopEditing(false)
    }),
    [],
  )

  const cancelEditing = useCallback(() => apiRef.current?.stopEditing(true), [])

  const synchronizeExternalData = useCallback(() => {
    dataState.advanceVersion()
    setAcknowledgment(undefined)
    spreadsheetControllerRef.current?.synchronize()
  }, [dataState])

  const revealNewRow = useCallback((rowId: string) => {
    const api = apiRef.current
    pendingRevealRef.current = rowId
    if (api === null) return false
    const hasFilter = isNonEmptyRecord(api.getFilterModel())
    const hasSort = api.getColumnState().some((column) => column.sort !== null)
    if (hasFilter) api.setFilterModel(null)
    if (hasSort) api.applyColumnState({ defaultState: { sort: null } })
    queueMicrotask(tryRevealOrFocus)
    return hasFilter || hasSort
  }, [tryRevealOrFocus])

  const focusFirstError = useCallback(() => {
    const current = form.getValues('users')
    for (const row of current) {
      for (const field of EDITABLE_COLUMNS) {
        if (!hasFieldError(row.id, field)) continue
        pendingFocusRef.current = { rowId: row.id, columnId: field }
        const api = apiRef.current
        const node = api?.getRowNode(row.id)
        if (api === null || node?.rowIndex == null) {
          api?.setFilterModel(null)
          queueMicrotask(tryRevealOrFocus)
          return
        }
        tryRevealOrFocus()
        return
      }
    }
  }, [form, hasFieldError, tryRevealOrFocus])

  const columns = useMemo<ColDef<UserRecord>[]>(() => [
    {
      field: 'name', colId: 'name', headerName: 'Nome', editable: true,
      cellEditor: SpreadsheetTextEditor<UserRecord>, cellEditorParams: { inputAriaLabel: 'Nome do usuário' },
      cellRendererParams: { renderContent: (params: SpreadsheetCellRendererParams<UserRecord, string>) => {
        const error = getFieldError(params.data?.id, 'name')
        return <UserCellContent params={params as UserCellRendererParams} error={error} errorId={userErrorId(params.data?.id, 'name')} />
      } },
      flex: 1.5,
      cellClassRules: { 'user-grid-cell--invalid': ({ data }) => getFieldError(data?.id, 'name') !== undefined },
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'name'),
    },
    {
      field: 'role', colId: 'role', headerName: 'Perfil', editable: true,
      cellEditor: RoleEditor, cellEditorParams: { inputAriaLabel: 'Perfil' },
      cellRendererParams: { renderContent: (params: SpreadsheetCellRendererParams<UserRecord, string>) => {
        const error = getFieldError(params.data?.id, 'role')
        return <UserCellContent params={params as UserCellRendererParams} error={error} errorId={userErrorId(params.data?.id, 'role')} />
      } },
      cellClassRules: { 'user-grid-cell--invalid': ({ data }) => getFieldError(data?.id, 'role') !== undefined },
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'role'),
    },
    {
      field: 'birthDate', colId: 'birthDate', headerName: 'Data de nascimento', editable: true,
      cellEditor: DateEditor, cellEditorParams: { inputAriaLabel: 'Data de nascimento' },
      cellRendererParams: { renderContent: (params: SpreadsheetCellRendererParams<UserRecord, string>) => {
        const error = getFieldError(params.data?.id, 'birthDate')
        return <UserCellContent params={params as UserCellRendererParams} error={error} errorId={userErrorId(params.data?.id, 'birthDate')} />
      } },
      valueFormatter: ({ value }) => formatDateBR(typeof value === 'string' ? value : ''),
      cellClassRules: { 'user-grid-cell--invalid': ({ data }) => getFieldError(data?.id, 'birthDate') !== undefined },
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'birthDate'),
    },
    {
      field: 'salary', colId: 'salary', headerName: 'Salário mensal (R$)', editable: true, cellDataType: 'number',
      cellEditor: SpreadsheetNumberEditor<UserRecord>, cellEditorParams: { inputAriaLabel: 'Salário mensal em reais' },
      cellRendererParams: { renderContent: (params: SpreadsheetCellRendererParams<UserRecord, number | null>) => {
        const error = getFieldError(params.data?.id, 'salary')
        return <UserCellContent params={params as UserCellRendererParams} error={error} errorId={userErrorId(params.data?.id, 'salary')} />
      } },
      valueFormatter: ({ value }) => typeof value === 'number' && Number.isFinite(value) ? BRL_FORMAT.format(value) : '',
      cellStyle: { textAlign: 'right' },
      cellClassRules: { 'user-grid-cell--invalid': ({ data }) => getFieldError(data?.id, 'salary') !== undefined },
      tooltipValueGetter: ({ data }) => getFieldError(data?.id, 'salary'),
    },
  ] as ColDef<UserRecord>[], [getFieldError])

  const gridDefaults = useMemo(() => ({
    getRowId: ({ data }: { data: UserRecord }) => data.id,
    defaultColDef: { flex: 1, minWidth: 150, sortable: true, filter: true, resizable: true },
    localeText: AG_GRID_LOCALE_BR,
    onGridReady: (event: GridReadyEvent<UserRecord>) => {
      apiRef.current = event.api
      tryRevealOrFocus()
    },
    onModelUpdated: () => tryRevealOrFocus(),
    onCellEditingStarted: () => onEditingChangeRef.current(true),
    onCellEditingStopped: () => onEditingChangeRef.current(false),
  }), [tryRevealOrFocus])

  const gridProps = useMemo(() => ({ ...gridDefaults, rowData: cloneUserRows(users), columnDefs: columns, readOnlyEdit: true }), [columns, gridDefaults, users])

  const handleResult = useCallback((result: OperationResult) => {
    if (result.rejected.length === 0) {
      if (result.changes.length > 0) onStatusRef.current('Operação aplicada nesta sessão.')
      return
    }
    onStatusRef.current(result.changes.length > 0
      ? 'Algumas células não foram atualizadas. Verifique os dados informados.'
      : result.rejected[0]?.message ?? 'Não foi possível atualizar as células selecionadas.')
  }, [])

  const handleSpreadsheetError = useCallback((error: unknown) => {
    void error
    onStatusRef.current('A operação não foi concluída. Tente novamente.')
  }, [])

  const spreadsheet = useSpreadsheet({
    gridProps,
    data: dataState.data,
    bindings: USER_BINDINGS,
    acknowledgment,
    copySelectedRows: false,
    onResult: handleResult,
    onError: handleSpreadsheetError,
  })
  useEffect(() => {
    spreadsheetControllerRef.current = spreadsheet.controller
  }, [spreadsheet.controller])

  const controls = useMemo<UserGridControls>(() => ({ finishEditing, cancelEditing, synchronizeExternalData, revealNewRow, focusFirstError }), [cancelEditing, finishEditing, focusFirstError, revealNewRow, synchronizeExternalData])
  useEffect(() => onReady(controls), [controls, onReady])

  useEffect(() => {
    apiRef.current?.refreshCells({ force: true })
  }, [validationState, validationErrors, validationTouchedFields, showAllErrors, users])

  /* eslint-disable react-hooks/immutability */
  const attachSpreadsheetHost = useCallback((element: HTMLDivElement | null) => {
    spreadsheet.hostRef.current = element
  }, [spreadsheet.hostRef])
  /* eslint-enable react-hooks/immutability */

  return (
    <div ref={attachSpreadsheetHost} className="user-grid-host" style={{ height: '30rem', minHeight: '20rem' }} aria-label="Tabela de usuários">
      <DataGrid<UserRecord> {...spreadsheet.gridProps} />
    </div>
  )
}
