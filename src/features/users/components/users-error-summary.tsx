import { Alert, AlertContent, AlertIcon, AlertTitle } from '@sbwb-design-system/ui-core'
import type { ReactElement } from 'react'
import type { UserValidationError } from '../utils/validation.ts'

export type UsersErrorSummaryProps = {
  errors: readonly UserValidationError[]
}

export function UsersErrorSummary({ errors }: UsersErrorSummaryProps): ReactElement | null {
  if (errors.length === 0) return null
  return (
    <Alert variant="error" size="sm" aria-label="Resumo dos erros" role="alert" className="users-error-summary">
      <AlertIcon />
      <AlertContent>
        <AlertTitle>Corrija os campos abaixo para salvar:</AlertTitle>
        <ul>
          {errors.map((error) => <li id={error.id} key={error.id}>{error.text}</li>)}
        </ul>
      </AlertContent>
    </Alert>
  )
}
