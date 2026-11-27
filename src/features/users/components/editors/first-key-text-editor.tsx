import {
  SpreadsheetTextEditor,
} from 'sbwb-ds-v2-aggrid'
import type {
  SpreadsheetTextEditorProps,
} from 'sbwb-ds-v2-aggrid'
import { useLayoutEffect, useRef } from 'react'
import type { ReactElement } from 'react'

/**
 * AG Grid starts a text editor after the printable keydown that opened it.
 * Keep that public event-key seed in the DS editor's initial value so the key
 * is not lost before a native input event can be emitted.
 */
export function FirstKeyTextEditor<TData>(props: SpreadsheetTextEditorProps<TData>): ReactElement {
  const { cellStartedEdit, eventKey, onValueChange } = props
  const eventKeySeed = cellStartedEdit && eventKey?.length === 1
    ? eventKey
    : null
  const initialValue = eventKeySeed ?? props.value
  const publishedSeedRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    if (
      !cellStartedEdit
      || eventKey?.length !== 1
      || publishedSeedRef.current === initialValue
    ) return
    publishedSeedRef.current = eventKeySeed
    onValueChange(eventKeySeed)
  }, [initialValue, cellStartedEdit, eventKey, eventKeySeed, onValueChange])

  return <SpreadsheetTextEditor {...props} value={initialValue} />
}
