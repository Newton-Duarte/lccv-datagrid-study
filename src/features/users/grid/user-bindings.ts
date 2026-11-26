import { createSpreadsheetNumberParser } from 'sbwb-ds-v2-aggrid'
import type { ColumnBinding, SpreadsheetNumberParser } from 'sbwb-ds-v2-aggrid'
import { USER_ROLES } from '../constants.ts'
import type { UserRecord, UserRole } from '../types.ts'
import { isValidIsoDate, parseDateInput } from '../../../utils/date.ts'

const parseName = ({ input }: { input: unknown }) =>
  typeof input === 'string'
    ? { ok: true as const, value: input }
    : { ok: false as const, message: 'Nome deve ser um texto.' }

const parseRole = (input: unknown) => {
  if (typeof input !== 'string') return { ok: false as const, message: 'Perfil inválido.' }
  if (input === '') return { ok: true as const, value: '' as const }
  if (USER_ROLES.includes(input as UserRole)) return { ok: true as const, value: input as UserRole }
  return { ok: false as const, message: 'Selecione um perfil válido.' }
}

export const SALARY_PARSER: SpreadsheetNumberParser<UserRecord> =
  createSpreadsheetNumberParser<UserRecord>({ locale: 'pt-BR' })

export const USER_BINDINGS: readonly ColumnBinding<UserRecord>[] = [
  {
    columnId: 'name',
    read: (row) => row.name,
    parse: parseName,
    write: (row, value) => (typeof value === 'string' ? { ...row, name: value } : row),
  },
  {
    columnId: 'role',
    read: (row) => row.role,
    parse: ({ input }) => parseRole(input),
    write: (row, value) =>
      typeof value === 'string' && (value === '' || USER_ROLES.includes(value as UserRole))
        ? { ...row, role: value as UserRecord['role'] }
        : row,
  },
  {
    columnId: 'birthDate',
    read: (row) => row.birthDate,
    parse: ({ input }) => parseDateInput(input),
    write: (row, value) => {
      if (typeof value !== 'string') return row
      const parsed = parseDateInput(value)
      return parsed.ok && (parsed.value === '' || isValidIsoDate(parsed.value))
        ? { ...row, birthDate: parsed.value }
        : row
    },
  },
  {
    columnId: 'salary',
    read: (row) => row.salary,
    parse: SALARY_PARSER,
    write: (row, value) =>
      value === null || (typeof value === 'number' && Number.isFinite(value))
        ? { ...row, salary: value }
        : row,
  },
] as const
