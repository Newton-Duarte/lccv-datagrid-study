import { useGridCellEditor } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { AppSelect } from '../../../../components/app-select.tsx'
import { USER_ROLES } from '../../constants.ts'
import type { UserCellEditorProps } from '../../grid/editor-types.ts'
import { useEditorDraft } from '../../hooks/use-editor-draft.ts'

export function RoleEditor(props: UserCellEditorProps): ReactElement {
  const initialValue = props.value ?? props.initialValue ?? ''
  const [draft, setDraft] = useState<string>(() => String(initialValue))
  const draftRef = useRef<string | null>(String(initialValue))
  const editorRootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const cancelCloseRef = useRef(false)
  const cancelEditRef = useRef(false)
  const valueCommitRef = useRef(false)
  const [open, setOpen] = useState(true)
  const options = useMemo(
    () => USER_ROLES.map((role) => ({ value: role, label: role })),
    [],
  )
  const ownedRoots = useMemo(() => [editorRootRef, contentRef] as const, [])
  useEditorDraft(props, draftRef, ownedRoots)
  useGridCellEditor({
    isCancelAfterEnd: () => cancelEditRef.current,
  })

  const restoreGridFocus = (): void => {
    queueMicrotask(() => props.eGridCell.focus({ preventScroll: true }))
  }

  useEffect(() => {
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const commit = (value: string): void => {
    valueCommitRef.current = true
    draftRef.current = value
    setDraft(value)
    props.onValueChange(value)
    setOpen(false)
    props.stopEditing(false)
    restoreGridFocus()
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen)
    if (nextOpen) return

    const canceled = cancelCloseRef.current
    cancelCloseRef.current = false
    const committed = valueCommitRef.current
    valueCommitRef.current = false
    if (canceled || committed) return

    // Radix does not emit onValueChange when the already-selected item is
    // chosen. Closing the picker is still an explicit profile confirmation.
    props.onValueChange(draftRef.current ?? '')
    props.stopEditing(false)
    restoreGridFocus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelCloseRef.current = true
      cancelEditRef.current = true
      setOpen(false)
      props.stopEditing()
      restoreGridFocus()
      return
    }

    if (event.key === 'Tab' && !event.nativeEvent.defaultPrevented) {
      props.onKeyDown(event.nativeEvent)
    }
  }

  return (
    <div ref={editorRootRef} className="user-role-editor">
      <AppSelect
        ref={triggerRef}
        value={draft}
        options={options}
        ariaLabel="Perfil"
        placeholder="Selecione um perfil"
        density="cell"
        open={open}
      onOpenChange={handleOpenChange}
        contentRef={contentRef}
        onValueChange={commit}
        triggerProps={{ onKeyDown: handleKeyDown }}
        contentProps={{ className: 'ag-custom-component-popup user-role-editor__content' }}
      />
    </div>
  )
}
