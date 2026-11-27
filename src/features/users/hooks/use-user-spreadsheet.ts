import { AG_GRID_LOCALE_BR } from '@ag-grid-community/locale'
import type { CellEditingStartedEvent, CellEditingStoppedEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import {
  createImmutableDataAdapter,
  useSpreadsheet,
} from 'sbwb-ds-v2-aggrid'
import type { DataAcknowledgment, OperationResult, SpreadsheetBinding } from 'sbwb-ds-v2-aggrid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEventHandler } from 'react'
import { useFormState, useWatch } from 'react-hook-form'
import { createUserColumns } from '../grid/user-columns.tsx'
import type { UserGridControls, UserGridProps } from '../grid/types.ts'
import { USER_BINDINGS } from '../grid/user-bindings.ts'
import type { UserField, UserRecord } from '../types.ts'
import { cloneUserRows } from '../utils/user-record.ts'
import { isVisibleUserError, userErrorId } from '../utils/validation.ts'
import { usePendingGridDraft } from './use-pending-grid-draft.ts'

export type UserGridBinding = {
  hostRef: SpreadsheetBinding<UserRecord>['hostRef']
  gridProps: SpreadsheetBinding<UserRecord>['gridProps']
  onInputCapture: FormEventHandler<HTMLDivElement>
}

const EDITABLE_COLUMNS = ['name', 'role', 'birthDate', 'salary'] as const satisfies readonly UserField[]

function isNonEmptyRecord(value: object): boolean {
  return Object.keys(value).length > 0
}

export function useUserSpreadsheet(options: UserGridProps): UserGridBinding {
  const { form, showAllErrors, onReady, onFeedback, onPendingDraftChange } = options
  const watchedUsers = useWatch({ control: form.control, name: 'users' })
  const users = useMemo(() => watchedUsers ?? [], [watchedUsers])
  const validationState = useFormState({ control: form.control })
  const showAllErrorsRef = useRef(showAllErrors)
  const onFeedbackRef = useRef(onFeedback)
  const apiRef = useRef<GridApi<UserRecord> | null>(null)
  const pendingRevealRef = useRef<string | null>(null)
  const pendingFocusRef = useRef<{ rowId: string; columnId: UserField } | null>(null)
  const spreadsheetControllerRef = useRef<ReturnType<typeof useSpreadsheet<UserRecord>>['controller'] | null>(null)
  const [acknowledgment, setAcknowledgment] = useState<DataAcknowledgment>()

  useEffect(() => {
    showAllErrorsRef.current = showAllErrors
    onFeedbackRef.current = onFeedback
  }, [onFeedback, showAllErrors])

  const getFieldError = useCallback((rowId: string | undefined, field: UserField): string | undefined => {
    if (rowId === undefined) return undefined
    const index = form.getValues('users').findIndex((row) => row.id === rowId)
    if (index < 0) return undefined
    const fieldState = form.getFieldState(`users.${index}.${field}`)
    if (!isVisibleUserError(fieldState, showAllErrorsRef.current)) return undefined
    return typeof fieldState.error?.message === 'string' ? fieldState.error.message : 'Valor inválido.'
  }, [form])

  const syncCellAccessibility = useCallback(() => {
    const host = document.querySelector<HTMLElement>('.user-grid-host')
    if (host === null || !host.isConnected) return

    for (const row of host.querySelectorAll<HTMLElement>('[role="row"][row-id]')) {
      const rowId = row.getAttribute('row-id') ?? undefined
      for (const field of EDITABLE_COLUMNS) {
        const cell = row.querySelector<HTMLElement>(`[role="gridcell"][col-id="${field}"]`)
        if (cell === null) continue
        const error = getFieldError(rowId, field)
        const errorId = userErrorId(rowId, field)
        const cellInvalid = error === undefined ? 'false' : 'true'
        if (cell.getAttribute('aria-invalid') !== cellInvalid) cell.setAttribute('aria-invalid', cellInvalid)
        if (error === undefined) {
          if (cell.getAttribute('aria-describedby') === errorId) cell.removeAttribute('aria-describedby')
        } else {
          if (cell.getAttribute('aria-describedby') !== errorId) cell.setAttribute('aria-describedby', errorId)
        }

        const editor = cell.querySelector<HTMLElement>('input, textarea, [contenteditable="true"], [role="combobox"]')
        if (editor === null) continue
        if (error === undefined) {
          if (editor.getAttribute('aria-describedby') === errorId) {
            editor.removeAttribute('aria-describedby')
            if (editor.getAttribute('aria-invalid') !== 'false') editor.setAttribute('aria-invalid', 'false')
          }
        } else {
          if (editor.getAttribute('aria-invalid') !== 'true') editor.setAttribute('aria-invalid', 'true')
          if (editor.getAttribute('aria-describedby') !== errorId) editor.setAttribute('aria-describedby', errorId)
        }
      }
    }
  }, [getFieldError])

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
          const updateOptions = { shouldDirty: true, shouldTouch: true, shouldValidate: false }
          for (const field of EDITABLE_COLUMNS) {
            if (Object.is(entry.row[field], nextRow[field])) continue
            form.setValue(`users.${entry.index}.${field}`, nextRow[field], updateOptions)
          }
        }
        version = next.version
        setAcknowledgment(ack)
        queueMicrotask(() => void form.trigger())
      },
    })
    return {
      data,
      advanceVersion: () => { version += 1 },
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

  const finishEditing = useCallback(() => new Promise<boolean>((resolve) => {
    const api = apiRef.current
    if (api === null || api.getEditingCells().length === 0) {
      resolve(true)
      return
    }
    const stopped = (event: CellEditingStoppedEvent<UserRecord>) => {
      api.removeEventListener('cellEditingStopped', stopped)
      resolve(event.valueChanged)
    }
    api.addEventListener('cellEditingStopped', stopped)
    api.stopEditing(false)
  }), [])

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

  const hasFieldError = useCallback((rowId: string | undefined, field: UserField): boolean => {
    if (rowId === undefined) return false
    const index = form.getValues('users').findIndex((row) => row.id === rowId)
    return index >= 0 && form.getFieldState(`users.${index}.${field}`).error !== undefined
  }, [form])

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

  /* eslint-disable react-hooks/refs */
  const columns = useMemo<ColDef<UserRecord>[]>(() => createUserColumns(getFieldError), [getFieldError])
  /* eslint-enable react-hooks/refs */
  const {
    onCellEditingStarted,
    onCellEditingStopped,
    onInputCapture,
  } = usePendingGridDraft(form, onPendingDraftChange)

  const handleCellEditingStarted = useCallback((event: CellEditingStartedEvent<UserRecord>) => {
    onCellEditingStarted(event)
    queueMicrotask(syncCellAccessibility)
    window.setTimeout(syncCellAccessibility, 0)
    window.setTimeout(syncCellAccessibility, 50)
  }, [onCellEditingStarted, syncCellAccessibility])

  const handleCellEditingStopped = useCallback(() => {
    onCellEditingStopped()
    queueMicrotask(syncCellAccessibility)
    window.setTimeout(syncCellAccessibility, 0)
    window.setTimeout(syncCellAccessibility, 50)
  }, [onCellEditingStopped, syncCellAccessibility])

  const gridDefaults = useMemo(() => ({
    getRowId: ({ data }: { data: UserRecord }) => data.id,
    defaultColDef: { minWidth: 140, sortable: true, filter: true, resizable: true },
    localeText: AG_GRID_LOCALE_BR,
    onGridReady: (event: GridReadyEvent<UserRecord>) => {
      apiRef.current = event.api
      tryRevealOrFocus()
    },
    onModelUpdated: () => tryRevealOrFocus(),
    onCellEditingStarted: handleCellEditingStarted,
    onCellEditingStopped: handleCellEditingStopped,
  }), [handleCellEditingStarted, handleCellEditingStopped, tryRevealOrFocus])

  const gridProps = useMemo(() => ({
    ...gridDefaults,
    rowData: cloneUserRows(users),
    columnDefs: columns,
    readOnlyEdit: true,
  }), [columns, gridDefaults, users])

  const handleResult = useCallback((result: OperationResult) => {
    if (result.rejected.length === 0) {
      if (result.changes.length > 0) onFeedbackRef.current({ kind: 'success', message: 'Operação aplicada nesta sessão.' })
      return
    }
    onFeedbackRef.current({
      kind: result.changes.length > 0 ? 'warning' : 'error',
      message: result.changes.length > 0
        ? 'Algumas células não foram atualizadas. Verifique os dados informados.'
        : result.rejected[0]?.message ?? 'Não foi possível atualizar as células selecionadas.',
    })
  }, [])

  const handleSpreadsheetError = useCallback((error: unknown) => {
    void error
    onFeedbackRef.current({ kind: 'error', message: 'A operação não foi concluída. Tente novamente.' })
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

  const controls = useMemo<UserGridControls>(() => ({
    finishEditing,
    cancelEditing,
    synchronizeExternalData,
    revealNewRow,
    focusFirstError,
  }), [cancelEditing, finishEditing, focusFirstError, revealNewRow, synchronizeExternalData])

  useEffect(() => {
    onReady(controls)
    return () => onReady(null)
  }, [controls, onReady])

  const validationErrorsKey = JSON.stringify(validationState.errors)
  const validationTouchedKey = JSON.stringify(validationState.touchedFields)
  useEffect(() => {
    const host = document.querySelector<HTMLElement>('.user-grid-host')
    if (host === null) return
    const observer = new MutationObserver(() => syncCellAccessibility())
    observer.observe(host, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [syncCellAccessibility])

  useEffect(() => {
    apiRef.current?.refreshCells({ force: true })
    queueMicrotask(syncCellAccessibility)
  }, [validationErrorsKey, validationTouchedKey, showAllErrors, syncCellAccessibility, users])

  return {
    hostRef: spreadsheet.hostRef,
    gridProps: spreadsheet.gridProps,
    onInputCapture,
  }
}
