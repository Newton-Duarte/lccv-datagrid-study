import { Input } from '@sbwb-design-system/ui-core'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useGridCellEditor } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement, RefObject } from 'react'
import type { EditorRegistry } from 'sbwb-ds-v2-aggrid'
import { formatBirthDate, parseBirthDateInput, type UserRecord, type UserRole } from './model.ts'

type UserEditorProps = CustomCellEditorProps<UserRecord, string> & {
  registerEditor?: EditorRegistry['register']
}

function useEditorRegistration(
  props: UserEditorProps,
  draft: RefObject<string | null>,
  inputRef: RefObject<HTMLElement | null>,
) {
  const apiRef = useRef(props.api)
  const registerEditor = props.registerEditor

  useEffect(() => {
    apiRef.current = props.api
  }, [props.api])

  const bridge = useMemo(
    () => ({
      getDraft: () => draft.current,
      cancel: () => apiRef.current.stopEditing(true),
      ownsTarget: (target: EventTarget | null) => target === inputRef.current,
    }),
    [draft, inputRef],
  )

  const address = useMemo(() => {
    const rowId = props.node.id
    const columnId = props.column.getColId()
    return rowId === undefined || columnId === null ? null : { rowId, columnId }
  }, [props.column, props.node.id])

  useEffect(() => {
    if (registerEditor === undefined || address === null) return
    return registerEditor(address, bridge)
  }, [address, bridge, registerEditor])

  return apiRef
}

function forwardGridKey(props: UserEditorProps, event: KeyboardEvent<HTMLElement>) {
  if (event.nativeEvent.isComposing || event.nativeEvent.defaultPrevented) return
  props.onKeyDown(event.nativeEvent)
}

export function UserRoleEditor(props: UserEditorProps): ReactElement {
  const initialValue = props.value ?? props.initialValue ?? ''
  const [draft, setDraft] = useState<string>(() => String(initialValue))
  const draftRef = useRef<string | null>(String(initialValue))
  const inputRef = useRef<HTMLSelectElement | null>(null)
  useEditorRegistration(props, draftRef, inputRef)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <select
      ref={inputRef}
      className="ag-input-field-input ag-text-field-input user-role-editor"
      value={draft}
      aria-label="Perfil / Cargo"
      onChange={(event) => {
        const value = event.currentTarget.value as UserRole
        draftRef.current = value
        setDraft(value)
        props.onValueChange(value)
      }}
      onKeyDown={(event) => forwardGridKey(props, event)}
    >
      <option value="">Selecione um perfil</option>
      <option value="Administrador">Administrador</option>
      <option value="Editor">Editor</option>
      <option value="Visualizador">Visualizador</option>
    </select>
  )
}

export function UserDateEditor(props: UserEditorProps): ReactElement {
  const committedValue = props.value ?? props.initialValue ?? ''
  const initialDraft =
    props.cellStartedEdit && props.eventKey !== null && props.eventKey.length === 1
      ? props.eventKey
      : formatBirthDate(String(committedValue))
  const [draft, setDraft] = useState<string>(() => initialDraft)
  const draftRef = useRef<string | null>(initialDraft)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEditorRegistration(props, draftRef, inputRef)

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
    const parsed = parseBirthDateInput(value)
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
      inputMode="numeric"
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
