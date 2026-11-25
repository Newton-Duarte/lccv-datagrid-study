export type UserRole = 'Administrador' | 'Editor' | 'Visualizador'

export type UserRecord = {
  id: string
  name: string
  role: UserRole | ''
  birthDate: string
  numericValue: number | null
}

export type UsersFormValues = {
  users: UserRecord[]
}

export type DateInputResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

export const USER_ROLES = [
  'Administrador',
  'Editor',
  'Visualizador',
] as const satisfies readonly UserRole[]

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
    return leap ? 29 : 28
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

export function createUserDraft(): UserRecord {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: 'Visualizador',
    birthDate: '',
    numericValue: null,
  }
}

export function cloneUsers(values: UsersFormValues): UsersFormValues {
  return {
    users: values.users.map((user) => ({ ...user })),
  }
}

export function parseBirthDateInput(input: unknown): DateInputResult {
  if (input === '') return { ok: true, value: '' }

  if (typeof input !== 'string') {
    return {
      ok: false,
      message: 'Informe uma data no formato DD/MM/AAAA ou AAAA-MM-DD.',
    }
  }

  const brMatch = BR_DATE_PATTERN.exec(input)
  if (brMatch) {
    const day = Number(brMatch[1])
    const month = Number(brMatch[2])
    const year = Number(brMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)) {
      return { ok: true, value: `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}` }
    }

    return { ok: false, message: 'A data informada não existe.' }
  }

  if (ISO_DATE_PATTERN.test(input)) {
    if (isValidIsoDate(input)) return { ok: true, value: input }
    return { ok: false, message: 'A data informada não existe.' }
  }

  return {
    ok: false,
    message: 'Informe uma data no formato DD/MM/AAAA ou AAAA-MM-DD.',
  }
}

export function formatBirthDate(iso: string): string {
  if (!isValidIsoDate(iso)) return ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export const salaryFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
