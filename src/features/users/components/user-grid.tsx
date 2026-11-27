import { DataGrid } from 'sbwb-ds-v2-aggrid'
import type { ReactElement } from 'react'
import type { UserGridProps } from '../grid/types.ts'
import { useUserSpreadsheet } from '../hooks/use-user-spreadsheet.ts'

export function UserGrid(props: UserGridProps): ReactElement {
  const binding = useUserSpreadsheet(props)
  const { gridProps, onInputCapture } = binding

  return (
    <div
      // eslint-disable-next-line react-hooks/refs
      ref={binding.hostRef}
      className="user-grid-host"
      onInputCapture={onInputCapture}
      aria-label="Tabela de usuários"
    >
      <DataGrid {...gridProps} />
    </div>
  )
}
