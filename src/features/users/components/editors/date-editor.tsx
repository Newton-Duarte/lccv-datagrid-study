import { useGridCellEditor } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { AppDatePicker } from '../../../../components/app-datepicker.tsx'
import { formatDateBR, getTodayIsoDate, parseDateInput } from '../../../../utils/date.ts'
import type { UserCellEditorProps } from '../../grid/editor-types.ts'
import { useEditorDraft } from '../../hooks/use-editor-draft.ts'

export function DateEditor(props: UserCellEditorProps): ReactElement {
  const committedValue = props.value ?? props.initialValue ?? ''
  const initialDraft =
    props.eventKey !== null && props.eventKey.length === 1
      ? props.eventKey
      : formatDateBR(String(committedValue))
  const [publishedValue, setPublishedValue] = useState(committedValue)
  const draftRef = useRef<string | null>(initialDraft)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<string | null>(null)
  const editorRootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const ownedRoots = useMemo(() => [editorRootRef, contentRef] as const, [])
  useEditorDraft(props, draftRef, ownedRoots)

  useGridCellEditor({
    isCancelAfterEnd: () => errorRef.current !== null,
    getValidationErrors: () => (errorRef.current === null ? null : [errorRef.current]),
  })

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    if (initialDraft === '' || initialDraft === formatDateBR(committedValue)) return

    // AG Grid may start an edit with the first typed character. The DS input
    // owns its masked draft, so seed that character through its public input
    // event after the control mounts instead of replacing its controlled value.
    const input = inputRef.current
    if (input === null) return
    const seedInput = window.setTimeout(() => {
      input.value = initialDraft
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, 0)
    return () => window.clearTimeout(seedInput)
  }, [committedValue, initialDraft])

  const publish = (value: string, raw: string): void => {
    draftRef.current = raw
    setPublishedValue(value)
    setError(null)
    errorRef.current = null
    props.onValueChange(value)
  }

  const handleDraftChange = (raw: string, parsed: ReturnType<typeof parseDateInput>): void => {
    draftRef.current = raw
    if (parsed.ok) {
      publish(parsed.value, raw)
      return
    }

    const nextError = raw === '' ? null : parsed.message
    setError(nextError)
    errorRef.current = nextError
  }

  const handleCalendarSelect = (value: string): void => {
    publish(value, formatDateBR(value))
    setOpen(false)
    props.stopEditing(false)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      props.stopEditing(true, event.nativeEvent)
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      const parsed = parseDateInput(event.currentTarget.value)
      if (parsed.ok) publish(parsed.value, event.currentTarget.value)
      if (event.key === 'Enter') {
        // DatePickerInput prevents Enter internally after parsing its draft;
        // call the grid's public stop path explicitly so the newest value is
        // committed before AG Grid reads it.
        props.stopEditing(false, event.nativeEvent)
      } else if (!event.nativeEvent.defaultPrevented) {
        props.onKeyDown(event.nativeEvent)
      }
    }
  }

  return (
    <div ref={editorRootRef} className="user-date-editor-root">
      <AppDatePicker
        ref={inputRef}
        value={publishedValue}
        onValueChange={(value) => publish(value, formatDateBR(value))}
        maxDate={getTodayIsoDate()}
        ariaLabel="Data de nascimento"
        density="cell"
        open={open}
        onOpenChange={setOpen}
        contentRef={contentRef}
        onDraftChange={handleDraftChange}
        onCalendarSelect={handleCalendarSelect}
        inputProps={{
          className: 'user-date-editor',
          'aria-invalid': error !== null,
          'aria-describedby': error === null ? undefined : 'user-date-editor-error',
          onKeyDown: handleInputKeyDown,
        }}
        contentProps={{ className: 'ag-custom-component-popup user-date-editor__content' }}
      />
      {error === null ? null : (
        <span id="user-date-editor-error" className="sw:sr-only">
          {error}
        </span>
      )}
    </div>
  )
}
