import { Add, Person, Save, Undo } from 'sbwb-icons'
import { Badge, Button, Card, Text } from '@sbwb-design-system/ui-core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { UserGrid } from './components/UserGrid.tsx'
import type { UserGridControls } from './components/UserGrid.tsx'
import { createMockUsers } from './data/mockUsers.ts'
import { cloneUsers, createUserDraft, type UsersFormValues } from './users/model.ts'
import { usersFormSchema } from './users/schema.ts'

const ERROR_FIELDS = ['name', 'role', 'birthDate', 'numericValue'] as const
type ErrorField = (typeof ERROR_FIELDS)[number]
const ERROR_FIELD_LABELS: Record<ErrorField, string> = {
  name: 'Nome',
  role: 'Perfil / Cargo',
  birthDate: 'Data de nascimento',
  numericValue: 'Salário mensal',
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) return undefined
  const message = error.message
  return typeof message === 'string' ? message : undefined
}

export function App(): ReactElement {
  const [initialValues] = useState<UsersFormValues>(() => ({ users: createMockUsers() }))
  const savedBaselineRef = useRef<UsersFormValues>(cloneUsers(initialValues))
  const gridControlsRef = useRef<UserGridControls | null>(null)
  const transitionRef = useRef(false)
  const [transitioning, setTransitioning] = useState(false)
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [editing, setEditing] = useState(false)
  const [operationMessage, setOperationMessage] = useState('')

  const form = useForm<UsersFormValues>({
    defaultValues: initialValues,
    shouldUnregister: false,
    resolver: zodResolver(usersFormSchema),
  })
  const watchedUsers = useWatch({ control: form.control, name: 'users' })
  const users = useMemo(() => watchedUsers ?? [], [watchedUsers])
  const formState = form.formState
  const { isDirty } = formState

  const onReady = useCallback((controls: UserGridControls) => {
    gridControlsRef.current = controls
  }, [])
  const onStatus = useCallback((message: string) => setOperationMessage(message), [])
  const onEditingChange = useCallback((active: boolean) => setEditing(active), [])

  const errorSummary = useMemo(() => {
    const items: string[] = []
    users.forEach((user, index) => {
      ERROR_FIELDS.forEach((field) => {
        const message = getErrorMessage(form.getFieldState(`users.${index}.${field}`, formState).error)
        if (message === undefined) return
        const userLabel = user.name.trim() || 'Novo usuário'
        items.push(`${userLabel} · ${ERROR_FIELD_LABELS[field]}: ${message}`)
      })
    })
    return items
  }, [form, formState, users])

  const handleAddUser = useCallback(async () => {
    if (transitionRef.current) return
    transitionRef.current = true
    setTransitioning(true)
    setOperationMessage('Preparando uma nova linha…')
    try {
      await gridControlsRef.current?.finishEditing()
      const draft = createUserDraft()
      const current = form.getValues('users')
      form.setValue('users', [...current, draft], {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      })
      gridControlsRef.current?.synchronizeExternalData()
      gridControlsRef.current?.revealNewRow(draft.id)
      setShowAllErrors(false)
      setOperationMessage('Novo usuário adicionado. Digite o nome para começar.')
    } finally {
      transitionRef.current = false
      setTransitioning(false)
    }
  }, [form])

  const handleSave = useCallback(async () => {
    if (transitionRef.current || (!isDirty && !editing)) return
    transitionRef.current = true
    setTransitioning(true)
    setOperationMessage('Validando alterações…')
    try {
      await gridControlsRef.current?.finishEditing()
      const snapshot = cloneUsers(form.getValues())
      const valid = (await form.trigger()) && usersFormSchema.safeParse(snapshot).success
      if (!valid) {
        setShowAllErrors(true)
        setOperationMessage('Corrija os campos destacados antes de salvar.')
        gridControlsRef.current?.focusFirstError()
        return
      }
      savedBaselineRef.current = cloneUsers(snapshot)
      form.resetDefaultValues(snapshot, { keepIsValid: true })
      setShowAllErrors(false)
      setOperationMessage('Alterações salvas nesta sessão')
    } finally {
      transitionRef.current = false
      setTransitioning(false)
    }
  }, [editing, form, isDirty])

  const handleDiscard = useCallback(() => {
    if (transitionRef.current || (!isDirty && !editing)) return
    transitionRef.current = true
    setTransitioning(true)
    try {
      gridControlsRef.current?.cancelEditing()
      form.reset(cloneUsers(savedBaselineRef.current))
      gridControlsRef.current?.synchronizeExternalData()
      setShowAllErrors(false)
      setOperationMessage('Alterações descartadas')
    } finally {
      transitionRef.current = false
      setTransitioning(false)
    }
  }, [editing, form, isDirty])

  const hasAction = isDirty || editing
  const statusTitle = isDirty
    ? 'Alterações pendentes'
    : editing
      ? 'Edição em andamento'
      : 'Nenhuma alteração pendente'
  const statusDetail = isDirty
    ? 'Revise os valores e salve para confirmar nesta sessão.'
    : editing
      ? 'Finalize ou descarte a edição atual.'
      : 'Os dados estão confirmados nesta sessão.'

  return (
    <main className="sw:container user-page">
      <Card className="user-card">
        <header className="user-header">
          <div className="user-title-group">
            <div className="user-title-icon" aria-hidden="true"><Person size={26} /></div>
            <div>
              <div className="user-title-line">
                <Text as="h1" variant="h2" className="user-title">Usuários</Text>
                <Badge variant="fill" colorScheme="gray" size="sm">{users.length} registros</Badge>
              </div>
              <Text variant="body-sm" colorScheme="muted">
                Cadastre e atualize os dados diretamente nas células.
              </Text>
            </div>
          </div>
          <Button type="button" onClick={() => void handleAddUser()}>
            <Add size={18} aria-hidden="true" />
            Novo usuário
          </Button>
        </header>

        <section className={`user-savebar${showAllErrors ? ' user-savebar--invalid' : ''}`} aria-label="Confirmação da planilha">
          <div className="user-status-copy">
            <span className="user-status-dot" aria-hidden="true" />
            <div>
              <Text variant="body-sm" colorScheme={showAllErrors ? 'error' : 'default'}>{statusTitle}</Text>
              <Text variant="caption" colorScheme="muted">{statusDetail}</Text>
            </div>
          </div>
          <div className="user-actions">
            <Button type="button" variant="outline" colorScheme="gray" disabled={!hasAction || transitioning} onClick={handleDiscard}>
              <Undo size={17} aria-hidden="true" />
              Descartar
            </Button>
            <Button type="button" disabled={!hasAction || transitioning} onClick={() => void handleSave()}>
              <Save size={17} aria-hidden="true" />
              Salvar alterações
            </Button>
          </div>
        </section>

        <div className="user-live-region" role="status" aria-live="polite" aria-atomic="true">{operationMessage}</div>

        {errorSummary.length > 0 ? (
          <section className="user-error-summary" aria-label="Resumo dos erros" role="alert">
            <Text variant="body-sm" colorScheme="error">Corrija os campos abaixo para salvar:</Text>
            <ul>{errorSummary.map((message) => <li key={message}>{message}</li>)}</ul>
          </section>
        ) : null}

        <UserGrid form={form} showAllErrors={showAllErrors} onReady={onReady} onStatus={onStatus} onEditingChange={onEditingChange} />

        <footer className="user-grid-footer">
          <div className="user-keyboard-hints" aria-label="Atalhos da planilha">
            <span><kbd>F2</kbd> Editar</span>
            <span><kbd>Tab</kbd> Próxima célula</span>
            <span><kbd>Ctrl+C / V</kbd> Copiar e colar</span>
            <span><kbd>Ctrl+Z</kbd> Desfazer</span>
          </div>
          <Text variant="caption" colorScheme="muted">Selecione células para preencher, limpar e desfazer operações.</Text>
        </footer>
      </Card>
      <Text variant="body-sm" colorScheme="muted" className="user-session-note">
        Salvar confirma os dados apenas nesta sessão. Recarregar a página restaura os dados de exemplo.
      </Text>
    </main>
  )
}
