import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { UserCellEditorProps } from '../grid/editor-types.ts'

export function useEditorDraft(
  props: UserCellEditorProps,
  draftRef: RefObject<string | null>,
  ownedRoots: readonly RefObject<HTMLElement | null>[],
): void {
  const apiRef = useRef(props.api)
  const registerEditor = props.registerEditor

  useEffect(() => {
    apiRef.current = props.api
  }, [props.api])

  const bridge = useMemo(
    () => ({
      getDraft: () => draftRef.current,
      cancel: () => apiRef.current.stopEditing(true),
      ownsTarget: (target: EventTarget | null) =>
        ownedRoots.some((root) => {
          const element = root.current
          return element !== null && (target === element || (typeof Node !== 'undefined' && target instanceof Node && element.contains(target)))
        }),
    }),
    [draftRef, ownedRoots],
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
}
