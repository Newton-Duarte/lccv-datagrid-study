import type { USER_FIELDS, USER_ROLES } from './constants.ts'

export type UserRole = (typeof USER_ROLES)[number]
export type UserField = (typeof USER_FIELDS)[number]

export type UserRecord = {
  id: string
  name: string
  role: UserRole | ''
  birthDate: string
  salary: number | null
}

export type UsersFormValues = {
  users: UserRecord[]
}
