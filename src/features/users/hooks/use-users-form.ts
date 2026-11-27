import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useRef, useState } from 'react'
import { useForm, useFormState, useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { createMockUsers } from '../data/mock-users.ts'
import { usersFormSchema } from '../schema.ts'
import type { UserGridControls, UserFeedback } from '../grid/types.ts'
import type { UsersFormValues } from '../types.ts'
import { cloneUsers, createUserDraft } from '../utils/user-record.ts'
import { getVisibleUserErrors } from '../utils/validation.ts'

export type UsersFormController = {
  form: UseFormReturn<UsersFormValues>
  users: UsersFormValues['users']
  errors: ReturnType<typeof getVisibleUserErrors>
  isDirty: boolean
  hasPendingWork: boolean
  busy: boolean
  showAllErrors: boolean
  feedback: UserFeedback | null
  gridInstanceKey: number
  addUser(): Promise<void>
  save(): Promise<void>
  discard(): void
  onReady(controls: UserGridControls | null): void
  onFeedback(feedback: UserFeedback): void
  onPendingDraftChange(changed: boolean): void
}

export function useUsersForm(): UsersFormController {
  const [initialValues] = useState<UsersFormValues>(() => ({ users: createMockUsers() }))
  const savedBaselineRef = useRef<UsersFormValues>(cloneUsers(initialValues))
  const controlsRef = useRef<UserGridControls | null>(null)
  const transitionRef = useRef(false)
  const pendingDraftRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [pendingDraft, setPendingDraft] = useState(false)
  const [feedback, setFeedback] = useState<UserFeedback | null>({
    kind: 'info',
    message: 'Pronto para editar.',
  })
  const [gridInstanceKey, setGridInstanceKey] = useState(0)

  const form = useForm<UsersFormValues>({
    defaultValues: initialValues,
    shouldUnregister: false,
    resolver: zodResolver(usersFormSchema),
  })
  const watchedUsers = useWatch({ control: form.control, name: 'users' })
  const users = watchedUsers ?? []
  const formState = useFormState({ control: form.control })
  const isDirty = formState.isDirty
  const errors = getVisibleUserErrors(form, showAllErrors)
  const hasPendingWork = isDirty || pendingDraft
  const rejectedEditMessage = 'A edição não foi aplicada. Verifique o valor informado.'

  const onReady = useCallback((controls: UserGridControls | null) => {
    controlsRef.current = controls
  }, [])

  const onFeedback = useCallback((nextFeedback: UserFeedback) => {
    setFeedback(nextFeedback)
  }, [])

  const onPendingDraftChange = useCallback((changed: boolean) => {
    pendingDraftRef.current = changed
    setPendingDraft((current) => (current === changed ? current : changed))
  }, [])

  const addUser = useCallback(async () => {
    if (transitionRef.current) return
    transitionRef.current = true
    setBusy(true)
    try {
      const hadPendingDraft = pendingDraftRef.current
      const accepted = await controlsRef.current?.finishEditing() ?? true
      if (hadPendingDraft && !accepted) {
        setPendingDraft(false)
        pendingDraftRef.current = false
        onFeedback({ kind: 'error', message: rejectedEditMessage })
        return
      }
      const draft = createUserDraft()
      form.setValue('users', [...form.getValues('users'), draft], {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      })
      controlsRef.current?.synchronizeExternalData()
      const viewWasReset = controlsRef.current?.revealNewRow(draft.id) ?? false
      setPendingDraft(false)
      pendingDraftRef.current = false
      setShowAllErrors(false)
      onFeedback({
        kind: 'success',
        message: viewWasReset
          ? 'Novo usuário adicionado. Filtros e ordenação foram limpos para revelar a nova linha.'
          : 'Novo usuário adicionado. Digite o nome para começar.',
      })
    } finally {
      transitionRef.current = false
      setBusy(false)
    }
  }, [form, onFeedback])

  const save = useCallback(async () => {
    if (transitionRef.current || (!form.formState.isDirty && !pendingDraftRef.current)) return
    transitionRef.current = true
    setBusy(true)
    try {
      const hadPendingDraft = pendingDraftRef.current
      const accepted = await controlsRef.current?.finishEditing() ?? true
      const rejectedDraft = hadPendingDraft && !accepted
      if (rejectedDraft) {
        setPendingDraft(false)
        pendingDraftRef.current = false
      }
      const snapshot = cloneUsers(form.getValues())
      const valid = (await form.trigger()) && usersFormSchema.safeParse(snapshot).success
      if (!valid) {
        setShowAllErrors(true)
        onFeedback({
          kind: 'error',
          message: rejectedDraft ? rejectedEditMessage : 'Corrija os campos destacados antes de salvar.',
        })
        controlsRef.current?.focusFirstError()
        return
      }
      if (rejectedDraft) {
        onFeedback({ kind: 'error', message: rejectedEditMessage })
        return
      }
      savedBaselineRef.current = cloneUsers(snapshot)
      form.resetDefaultValues(snapshot, { keepIsValid: true })
      setPendingDraft(false)
      pendingDraftRef.current = false
      setShowAllErrors(false)
      onFeedback({ kind: 'success', message: 'Alterações salvas nesta sessão' })
    } finally {
      transitionRef.current = false
      setBusy(false)
    }
  }, [form, onFeedback])

  const discard = useCallback(() => {
    if (transitionRef.current || (!form.formState.isDirty && !pendingDraftRef.current)) return
    transitionRef.current = true
    setBusy(true)
    try {
      controlsRef.current?.cancelEditing()
      form.reset(cloneUsers(savedBaselineRef.current))
      controlsRef.current?.synchronizeExternalData()
      setGridInstanceKey((key) => key + 1)
      setPendingDraft(false)
      pendingDraftRef.current = false
      setShowAllErrors(false)
      onFeedback({ kind: 'info', message: 'Alterações descartadas' })
    } finally {
      transitionRef.current = false
      setBusy(false)
    }
  }, [form, onFeedback])

  return {
    form,
    users,
    errors,
    isDirty,
    hasPendingWork,
    busy,
    showAllErrors,
    feedback,
    gridInstanceKey,
    addUser,
    save,
    discard,
    onReady,
    onFeedback,
    onPendingDraftChange,
  }
}
