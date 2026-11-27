import type { UseFormReturn } from 'react-hook-form'
import type { UsersFormValues } from '../types.ts'

export type UserGridControls = {
  /** Returns false when the active editor rejected its value on stop. */
  finishEditing(): Promise<boolean>
  cancelEditing(): void
  synchronizeExternalData(): void
  revealNewRow(rowId: string): boolean
  focusFirstError(): void
}

export type UserFeedback = {
  kind: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export type UserGridProps = {
  form: UseFormReturn<UsersFormValues>
  showAllErrors: boolean
  onReady(controls: UserGridControls | null): void
  onFeedback(feedback: UserFeedback): void
  onPendingDraftChange(changed: boolean): void
}
