import {
  createSpreadsheetNumberParser,
} from 'sbwb-ds-v2-aggrid'
import type { ColumnBinding, SpreadsheetNumberParser } from 'sbwb-ds-v2-aggrid'
import {
  isValidIsoDate,
  parseBirthDateInput,
  USER_ROLES,
  type UserRecord,
  type UserRole,
} from './model.ts'

const parseName = ({ input }: { input: unknown }) =>
  typeof input === 'string'
    ? { ok: true as const, value: input }
    : { ok: false as const, message: 'Nome deve ser um texto.' }

const parseRole = (input: unknown) => {
  if (typeof input !== 'string') {
    return { ok: false as const, message: 'Perfil inválido.' }
  }
  if (input === '') return { ok: true as const, value: '' as const }
  if (USER_ROLES.includes(input as UserRole)) {
    return { ok: true as const, value: input as UserRole }
  }
  return { ok: false as const, message: 'Selecione um perfil válido.' }
}

const parseDate = ({ input }: { input: unknown }) => parseBirthDateInput(input)

export const SALARY_PARSER: SpreadsheetNumberParser<UserRecord> =
  createSpreadsheetNumberParser<UserRecord>({ locale: 'pt-BR' })

export const USER_BINDINGS: readonly ColumnBinding<UserRecord>[] = [
  {
    columnId: 'name',
    read: (row) => row.name,
    parse: parseName,
    write: (row, value) =>
      typeof value === 'string' ? { ...row, name: value } : row,
  },
  {
    columnId: 'role',
    read: (row) => row.role,
    parse: ({ input }) => parseRole(input),
    write: (row, value) =>
      typeof value === 'string' &&
      (value === '' || USER_ROLES.includes(value as UserRole))
        ? { ...row, role: value as UserRecord['role'] }
        : row,
  },
  {
    columnId: 'birthDate',
    read: (row) => row.birthDate,
    parse: parseDate,
    write: (row, value) => {
      if (typeof value !== 'string') return row
      const parsed = parseBirthDateInput(value)
      return parsed.ok && (parsed.value === '' || isValidIsoDate(parsed.value))
        ? { ...row, birthDate: parsed.value }
        : row
    },
  },
  {
    columnId: 'numericValue',
    read: (row) => row.numericValue,
    parse: SALARY_PARSER,
    write: (row, value) =>
      value === null || (typeof value === 'number' && Number.isFinite(value))
        ? { ...row, numericValue: value }
        : row,
  },
] as const
