import { Add, Person } from 'sbwb-icons'
import { Badge, Button, Text } from '@sbwb-design-system/ui-core'
import type { ReactElement } from 'react'

export type UsersHeaderProps = {
  count: number
  onAdd(): Promise<void>
  disabled: boolean
}

export function UsersHeader({ count, onAdd, disabled }: UsersHeaderProps): ReactElement {
  return (
    <header className="users-header">
      <div className="users-title-group">
        <div className="users-title-icon" aria-hidden="true"><Person size={24} /></div>
        <div>
          <div className="users-title-line">
            <Text as="h1" variant="title-md" className="users-title sw:text-[24px] sw:leading-tight">Usuários</Text>
            <Badge variant="fill" colorScheme="gray" size="md">{count} registros</Badge>
          </div>
          <Text variant="body-md" colorScheme="muted">Cadastre e atualize os dados diretamente nas células.</Text>
        </div>
      </div>
      <Button type="button" disabled={disabled} onClick={() => void onAdd()}>
        <Add size={18} aria-hidden="true" />
        Novo usuário
      </Button>
    </header>
  )
}
