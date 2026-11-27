import type { ReactElement } from 'react'
import { UserGrid } from './user-grid.tsx'
import { UsersErrorSummary } from './users-error-summary.tsx'
import { UsersFooter } from './users-footer.tsx'
import { UsersHeader } from './users-header.tsx'
import { useUsersForm } from '../hooks/use-users-form.ts'

export function UsersPage(): ReactElement {
  const controller = useUsersForm()
  return (
    <main className="sw:container user-page">
      <section className="user-card" aria-label="Cadastro de usuários">
        <UsersHeader count={controller.users.length} onAdd={controller.addUser} disabled={controller.busy} />
        <UsersErrorSummary errors={controller.errors} />
        <UserGrid
          key={controller.gridInstanceKey}
          form={controller.form}
          showAllErrors={controller.showAllErrors}
          onReady={controller.onReady}
          onFeedback={controller.onFeedback}
          onPendingDraftChange={controller.onPendingDraftChange}
        />
        <UsersFooter
          isDirty={controller.isDirty}
          hasPendingWork={controller.hasPendingWork}
          busy={controller.busy}
          feedback={controller.feedback}
          onSave={controller.save}
          onDiscard={controller.discard}
        />
      </section>
    </main>
  )
}
