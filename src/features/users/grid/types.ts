import type { OperationResult } from 'sbwb-ds-v2-aggrid'
import type { UseFormReturn } from 'react-hook-form'
import type { UsersFormValues } from '../types.ts'

export type UserGridControls = {
  finishEditing(): Promise<void>
  cancelEditing(): void
  synchronizeExternalData(): void
  revealNewRow(rowId: string): boolean
  focusFirstError(): void
}

export type UserGridProps = {
  form: UseFormReturn<UsersFormValues>
  showAllErrors: boolean
  onReady(controls: UserGridControls): void
  onStatus(message: string): void
  onEditingChange(active: boolean): void
  onCommit?(result: OperationResult): void
}
