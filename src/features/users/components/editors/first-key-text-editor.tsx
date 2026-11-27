import {
  SpreadsheetTextEditor,
} from 'sbwb-ds-v2-aggrid'
import type {
  SpreadsheetTextEditorProps,
} from 'sbwb-ds-v2-aggrid'
import type { ReactElement } from 'react'

/**
 * AG Grid starts a text editor after the printable keydown that opened it.
 * Keep that public event-key seed in the DS editor's initial value so the key
 * is not lost before a native input event can be emitted.
 */
export function FirstKeyTextEditor<TData>(props: SpreadsheetTextEditorProps<TData>): ReactElement {
  const initialValue = props.cellStartedEdit && props.eventKey?.length === 1
    ? props.eventKey
    : props.value

  return <SpreadsheetTextEditor {...props} value={initialValue} />
}
