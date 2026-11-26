import type { CustomCellEditorProps } from 'ag-grid-react'
import type { EditorRegistry } from 'sbwb-ds-v2-aggrid'
import type { UserRecord } from '../types.ts'

export type UserCellEditorProps = CustomCellEditorProps<UserRecord, string> & {
  registerEditor?: EditorRegistry['register']
}
