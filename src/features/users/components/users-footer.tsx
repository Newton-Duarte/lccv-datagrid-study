import { Save, Undo } from 'sbwb-icons'
import { BadgeDot, Button, Text } from '@sbwb-design-system/ui-core'
import type { ReactElement } from 'react'
import type { UserFeedback } from '../grid/types.ts'

export type UsersFooterProps = {
  isDirty: boolean
  hasPendingWork: boolean
  busy: boolean
  feedback: UserFeedback | null
  onSave(): Promise<void>
  onDiscard(): void
}

const feedbackClass = (kind: UserFeedback['kind'] | undefined): string => {
  if (kind === 'success') return 'sw:text-green-700'
  if (kind === 'warning') return 'sw:text-amber-700'
  if (kind === 'error') return 'sw:text-red-600'
  return 'sw:text-brand-default'
}

export function UsersFooter({
  isDirty,
  hasPendingWork,
  busy,
  feedback,
  onSave,
  onDiscard,
}: UsersFooterProps): ReactElement {
  const disabled = !hasPendingWork || busy
  const saveDescriptionId = 'users-save-description'
  return (
    <footer className="users-footer">
      <div className="users-footer-main">
        <div className="users-keyboard-hints" aria-label="Atalhos da planilha">
          <span><kbd>F2</kbd> Editar</span>
          <span><kbd>Tab</kbd> Próxima célula</span>
          <span><kbd>Ctrl+C / V</kbd> Copiar e colar</span>
          <span><kbd>Ctrl+Z</kbd> Desfazer</span>
        </div>
        <div className="users-session-copy">
          {feedback ? <Text variant="body-sm" colorScheme="default" className={feedbackClass(feedback.kind)} role="status" aria-live="polite" aria-atomic="true">{feedback.message}</Text> : null}
          <Text variant="body-sm" colorScheme="muted">Salvar confirma os dados apenas nesta sessão. Recarregar restaura os dados de exemplo.</Text>
        </div>
      </div>
      <div className="users-footer-actions">
        <Button type="button" variant="outline" colorScheme="gray" disabled={disabled} onClick={onDiscard}>
          <Undo size={17} aria-hidden="true" />
          Descartar
        </Button>
        <span id={saveDescriptionId} className="sw:sr-only">Há alterações não salvas.</span>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => void onSave()}
          aria-describedby={isDirty ? saveDescriptionId : undefined}
        >
          {isDirty ? (
            <span className="users-pending-indicator">
              <BadgeDot colorScheme="warning" size="sm" aria-hidden="true" />
            </span>
          ) : null}
          <Save size={17} aria-hidden="true" />
          Salvar alterações
        </Button>
      </div>
    </footer>
  )
}
