import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { USER_ROLES } from '../../constants.ts'
import type { UserRole } from '../../types.ts'
import type { UserCellEditorProps } from '../../grid/editor-types.ts'
import { useEditorDraft } from '../../hooks/use-editor-draft.ts'

function forwardGridKey(props: UserCellEditorProps, event: KeyboardEvent<HTMLElement>) {
  if (event.nativeEvent.isComposing || event.nativeEvent.defaultPrevented) return
  props.onKeyDown(event.nativeEvent)
}

export function RoleEditor(props: UserCellEditorProps): ReactElement {
  const initialValue = props.value ?? props.initialValue ?? ''
  const [draft, setDraft] = useState<string>(() => String(initialValue))
  const draftRef = useRef<string | null>(String(initialValue))
  const inputRef = useRef<HTMLSelectElement | null>(null)
  const ownedRoots = useMemo(() => [inputRef] as const, [])
  useEditorDraft(props, draftRef, ownedRoots)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <select
      ref={inputRef}
      className="ag-input-field-input ag-text-field-input user-role-editor"
      value={draft}
      aria-label="Perfil"
      onChange={(event) => {
        const value = event.currentTarget.value as UserRole
        draftRef.current = value
        setDraft(value)
        props.onValueChange(value)
      }}
      onKeyDown={(event) => forwardGridKey(props, event)}
    >
      <option value="">Selecione um perfil</option>
      {USER_ROLES.map((role) => <option value={role} key={role}>{role}</option>)}
    </select>
  )
}
