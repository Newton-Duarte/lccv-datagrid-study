import type { UseFormReturn } from 'react-hook-form'
import { USER_FIELDS, USER_FIELD_LABELS } from '../constants.ts'
import type { UserField, UsersFormValues } from '../types.ts'

export type UserValidationError = {
  id: string
  rowId: string
  field: UserField
  text: string
}

export function isVisibleUserError(
  state: { error?: unknown; isTouched: boolean },
  showAllErrors: boolean,
): boolean {
  return state.error !== undefined && (showAllErrors || state.isTouched)
}

export function userErrorId(rowId: string | undefined, field: UserField): string {
  return `user-error-${rowId ?? 'unknown'}-${field}`
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) return undefined
  const message = error.message
  return typeof message === 'string' ? message : undefined
}

export function getVisibleUserErrors(
  form: UseFormReturn<UsersFormValues>,
  showAllErrors: boolean,
): UserValidationError[] {
  const users = form.getValues('users') ?? []
  const formState = form.formState
  const nameCounts = new Map<string, number>()
  users.forEach((user) => {
    const normalizedName = user.name.trim()
    nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1)
  })

  const errors: UserValidationError[] = []
  users.forEach((user, index) => {
    USER_FIELDS.forEach((field) => {
      const fieldState = form.getFieldState(`users.${index}.${field}`, formState)
      if (!isVisibleUserError(fieldState, showAllErrors)) return
      const normalizedName = user.name.trim()
      const baseLabel = normalizedName || 'Novo usuário'
      const rowLabel = !normalizedName || (nameCounts.get(normalizedName) ?? 0) > 1
        ? `${baseLabel} (linha ${index + 1})`
        : baseLabel
      errors.push({
        id: userErrorId(user.id, field),
        rowId: user.id,
        field,
        text: `${rowLabel} · ${USER_FIELD_LABELS[field]}: ${getErrorMessage(fieldState.error) ?? 'Valor inválido.'}`,
      })
    })
  })
  return errors
}
