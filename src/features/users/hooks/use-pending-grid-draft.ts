import type { CellEditingStartedEvent } from 'ag-grid-community'
import { useCallback, useEffect, useRef } from 'react'
import type { FormEventHandler } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { USER_BINDINGS } from '../grid/user-bindings.ts'
import type { UserField, UserRecord, UsersFormValues } from '../types.ts'

export type PendingGridDraftHandlers = {
  onCellEditingStarted(event: CellEditingStartedEvent<UserRecord>): void
  onCellEditingStopped(): void
  onInputCapture: FormEventHandler<HTMLDivElement>
}

type ActiveEdit = {
  rowId: string
  field: UserField
  initialValue: unknown
}

const isEditableField = (value: string): value is UserField =>
  USER_BINDINGS.some((binding) => binding.columnId === value)

function isIgnoredInput(target: HTMLElement): boolean {
  return target.closest(
    '.ag-header, .ag-floating-filter, .ag-filter, [role="dialog"], [aria-label="Abrir calendário"], [data-radix-popper-content-wrapper]',
  ) !== null
}

export function usePendingGridDraft(
  form: UseFormReturn<UsersFormValues>,
  onChanged: (changed: boolean) => void,
): PendingGridDraftHandlers {
  const activeEditRef = useRef<ActiveEdit | null>(null)
  const lastInputRef = useRef<{ rowId: string; field: UserField; changed: boolean } | null>(null)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const publishChanged = useCallback((changed: boolean) => {
    if (mountedRef.current) onChanged(changed)
  }, [onChanged])

  const onCellEditingStarted = useCallback((event: CellEditingStartedEvent<UserRecord>) => {
    const rowId = event.data?.id
    const field = event.column.getColId()
    generationRef.current += 1
    activeEditRef.current = rowId !== undefined && isEditableField(field)
      ? { rowId, field, initialValue: event.value }
      : null
    const inputBeforeStart = lastInputRef.current
    const preservesInput = inputBeforeStart !== null
      && inputBeforeStart.rowId === rowId
      && inputBeforeStart.field === field
    publishChanged(
      preservesInput
        ? inputBeforeStart.changed
        : false,
    )
  }, [publishChanged])

  const onCellEditingStopped = useCallback(() => {
    generationRef.current += 1
    activeEditRef.current = null
    lastInputRef.current = null
    publishChanged(false)
  }, [publishChanged])

  const onInputCapture = useCallback<FormEventHandler<HTMLDivElement>>((event) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || isIgnoredInput(target)) return
    const cell = target.closest<HTMLElement>('[role="gridcell"], .ag-cell')
    if (cell === null || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) return

    if (!cell.classList.contains('ag-cell-inline-editing')) return
    const activeEdit = activeEditRef.current ?? (() => {
      const rowId = cell.closest<HTMLElement>('.ag-row')?.getAttribute('row-id')
      const field = cell.getAttribute('col-id')
      return rowId !== null && rowId !== undefined && field !== null && isEditableField(field)
        ? { rowId, field, initialValue: undefined }
        : null
    })()
    if (activeEdit === null) return
    const generation = generationRef.current
    const raw = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.value
      : target.textContent ?? ''

    const report = (value: string): void => {
      const row = form.getValues('users').find((candidate) => candidate.id === activeEdit.rowId)
      const binding = USER_BINDINGS.find((candidate) => candidate.columnId === activeEdit.field)
      if (row === undefined || binding === undefined) return
      const parsed = binding.parse?.({
        input: value,
        row,
        address: { rowId: activeEdit.rowId, columnId: activeEdit.field },
        source: 'edit',
      })
      if (parsed?.ok) {
        const changed =
          !Object.is(binding.read(row), parsed.value)
          || (activeEdit.initialValue !== undefined && !Object.is(activeEdit.initialValue, parsed.value))
        lastInputRef.current = { rowId: activeEdit.rowId, field: activeEdit.field, changed }
        publishChanged(changed)
        return
      }
      const changed = value.length > 0
      lastInputRef.current = { rowId: activeEdit.rowId, field: activeEdit.field, changed }
      publishChanged(changed)
    }

    // Publish an eager conservative state so a Save/Discard click immediately
    // following native input sees the draft; the queued read below lets DS
    // masks finish normalizing before deciding whether it actually changed.
    report(raw)

    queueMicrotask(() => {
      if (
        generation !== generationRef.current
        || (activeEditRef.current !== null && activeEditRef.current !== activeEdit)
      ) return
      const normalizedRaw = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        ? target.value
        : target.textContent ?? ''
      report(normalizedRaw)
    })
  }, [form, publishChanged])

  return { onCellEditingStarted, onCellEditingStopped, onInputCapture }
}
