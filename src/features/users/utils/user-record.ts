import type { UserRecord, UsersFormValues } from '../types.ts'

export function cloneUserRecord(row: UserRecord): UserRecord {
  return { ...row }
}

export function cloneUserRows(rows: readonly UserRecord[]): UserRecord[] {
  return rows.map(cloneUserRecord)
}

export function cloneUsers(values: UsersFormValues): UsersFormValues {
  return { users: cloneUserRows(values.users) }
}

export function createUserDraft(): UserRecord {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: 'Visualizador',
    birthDate: '',
    salary: null,
  }
}
