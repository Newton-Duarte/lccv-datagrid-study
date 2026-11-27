import type { SpreadsheetCellRendererParams } from 'sbwb-ds-v2-aggrid'
import type { ReactElement } from 'react'
import type { UserRecord } from '../types.ts'

export type UserCellRendererParams = Pick<
  SpreadsheetCellRendererParams<UserRecord, unknown>,
  'eGridCell' | 'value' | 'valueFormatted'
>

export function UserCellContent({
  params,
}: {
  params: UserCellRendererParams
  error: string | undefined
  errorId: string
}): ReactElement {
  const value = params.valueFormatted ?? params.value ?? ''
  return <span>{String(value)}</span>
}
