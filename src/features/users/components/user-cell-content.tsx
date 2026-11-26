import type { SpreadsheetCellRendererParams } from 'sbwb-ds-v2-aggrid'
import { useEffect } from 'react'
import type { ReactElement } from 'react'
import type { UserRecord } from '../types.ts'

export type UserCellRendererParams = Pick<
  SpreadsheetCellRendererParams<UserRecord, unknown>,
  'eGridCell' | 'value' | 'valueFormatted'
>

export function UserCellContent({
  params,
  error,
  errorId,
}: {
  params: UserCellRendererParams
  error: string | undefined
  errorId: string
}): ReactElement {
  useEffect(() => {
    const cell = params.eGridCell
    cell.setAttribute('aria-invalid', error === undefined ? 'false' : 'true')
    if (error === undefined) cell.removeAttribute('aria-describedby')
    else cell.setAttribute('aria-describedby', errorId)
    return () => {
      cell.removeAttribute('aria-invalid')
      cell.removeAttribute('aria-describedby')
    }
  }, [error, errorId, params.eGridCell])

  const value = params.valueFormatted ?? params.value ?? ''
  return <span>{String(value)}</span>
}
