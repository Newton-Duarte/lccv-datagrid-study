import { Input } from '@sbwb-design-system/ui-core'
import { useGridCellEditor } from 'ag-grid-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { formatDateBR, parseDateInput } from '../../../../utils/date.ts'
import type { UserCellEditorProps } from '../../grid/editor-types.ts'
import { useEditorDraft } from '../../hooks/use-editor-draft.ts'

function forwardGridKey(props: UserCellEditorProps, event: KeyboardEvent<HTMLElement>) {
  if (event.nativeEvent.isComposing || event.nativeEvent.defaultPrevented) return
  props.onKeyDown(event.nativeEvent)
}

export function DateEditor(props: UserCellEditorProps): ReactElement {
  const committedValue = props.value ?? props.initialValue ?? ''
  const initialDraft =
    props.cellStartedEdit && props.eventKey !== null && props.eventKey.length === 1
      ? props.eventKey
      : formatDateBR(String(committedValue))
  const [draft, setDraft] = useState<string>(() => initialDraft)
  const draftRef = useRef<string | null>(initialDraft)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEditorDraft(props, draftRef, [inputRef])

  useGridCellEditor({
    isCancelAfterEnd: () => error !== null,
    getValidationErrors: () => (error === null ? null : [error]),
  })

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  const handleChange = (value: string) => {
    draftRef.current = value
    setDraft(value)
    const parsed = parseDateInput(value)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }

    setError(null)
    props.onValueChange(parsed.value)
  }

  return (
    <Input
      ref={inputRef}
      className="user-date-editor"
      type="text"
      inputMode="text"
      value={draft}
      aria-label="Data de nascimento"
      aria-invalid={error !== null}
      aria-describedby={error === null ? undefined : 'user-date-editor-error'}
      onChange={(event) => handleChange(event.currentTarget.value)}
      onKeyDown={(event) => forwardGridKey(props, event)}
      helperText={error === null ? undefined : <span id="user-date-editor-error">{error}</span>}
      isError={error !== null}
    />
  )
}
