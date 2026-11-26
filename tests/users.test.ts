import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockUsers } from '../src/features/users/data/mock-users.ts'
import {
  cloneUsers,
  createUserDraft,
} from '../src/features/users/utils/user-record.ts'
import type { UserRecord, UsersFormValues } from '../src/features/users/types.ts'
import { usersFormSchema } from '../src/features/users/schema.ts'
import { SALARY_PARSER, USER_BINDINGS } from '../src/features/users/grid/user-bindings.ts'
import { BRL_FORMAT } from '../src/utils/currency.ts'
import { formatDateBR, parseDateInput } from '../src/utils/date.ts'

function rowContext(row: UserRecord, input: unknown) {
  return {
    input,
    row,
    address: { rowId: row.id, columnId: 'salary' },
    source: 'paste' as const,
  }
}

function validValues(): UsersFormValues {
  return { users: createMockUsers() }
}

test('parses and formats Brazilian calendar dates without timezone conversion', () => {
  assert.equal(parseDateInput('29/02/2000').ok, true)
  assert.deepEqual(parseDateInput('14/03/1988'), {
    ok: true,
    value: '1988-03-14',
  })
  assert.deepEqual(parseDateInput('2000-02-29'), {
    ok: true,
    value: '2000-02-29',
  })
  assert.deepEqual(parseDateInput(''), { ok: true, value: '' })
  assert.equal(parseDateInput('29/02/2001').ok, false)
  assert.equal(parseDateInput('31/04/1994').ok, false)
  assert.equal(parseDateInput('14/3/1988').ok, false)
  assert.equal(parseDateInput('March 14, 1988').ok, false)
  assert.equal(formatDateBR('1988-03-14'), '14/03/1988')
  assert.equal(formatDateBR(''), '')
})

test('creates drafts and independent seed records with stable domain ids', () => {
  const draft = createUserDraft()
  assert.match(draft.id, /^[0-9a-f-]{36}$/)
  assert.deepEqual(
    { name: draft.name, role: draft.role, birthDate: draft.birthDate, salary: draft.salary },
    { name: '', role: 'Visualizador', birthDate: '', salary: null },
  )

  const first = createMockUsers()
  const second = createMockUsers()
  assert.equal(first.length, 18)
  assert.equal(new Set(first.map(({ id }) => id)).size, 18)
  assert.deepEqual(first, second)
  first[0]!.name = 'Nome alterado'
  assert.notEqual(first[0]!.name, second[0]!.name)

  const clone = cloneUsers({ users: first })
  clone.users[0]!.salary = 0.123456789
  assert.notEqual(clone.users[0]!.salary, first[0]!.salary)
})

test('validates complete saved sheets while retaining draft-compatible types', () => {
  assert.equal(usersFormSchema.safeParse(validValues()).success, true)

  const zero = validValues()
  zero.users[0]!.salary = 0
  assert.equal(usersFormSchema.safeParse(zero).success, true)

  const missingSalary = validValues()
  missingSalary.users[0]!.salary = null
  assert.equal(usersFormSchema.safeParse(missingSalary).success, false)

  const negativeSalary = validValues()
  negativeSalary.users[0]!.salary = -1
  assert.equal(usersFormSchema.safeParse(negativeSalary).success, false)

  const futureDate = validValues()
  futureDate.users[0]!.birthDate = '9999-12-31'
  assert.equal(usersFormSchema.safeParse(futureDate).success, false)

  const blankRole = validValues()
  blankRole.users[0]!.role = ''
  assert.equal(usersFormSchema.safeParse(blankRole).success, false)

  const blankName = validValues()
  blankName.users[0]!.name = '   '
  assert.equal(usersFormSchema.safeParse(blankName).success, false)
})

test('exposes stable immutable bindings with localized numeric parsing', () => {
  assert.deepEqual(
    USER_BINDINGS.map(({ columnId }) => columnId),
    ['name', 'role', 'birthDate', 'salary'],
  )
  assert.equal(BRL_FORMAT.format(5420.5), 'R$\u00a05.420,50')

  const sourceRow = createMockUsers()[0]!
  const parsed = SALARY_PARSER(rowContext(sourceRow, '5.420,50'))
  assert.deepEqual(parsed, { ok: true, value: 5420.5 })
  assert.deepEqual(SALARY_PARSER(rowContext(sourceRow, '')), { ok: true, value: null })
  assert.equal(SALARY_PARSER(rowContext(sourceRow, 'abc')).ok, false)
  assert.equal(SALARY_PARSER(rowContext(sourceRow, 'R$ 5.420,50')).ok, false)
  assert.deepEqual(
    SALARY_PARSER(rowContext(sourceRow, '0,123456789')),
    { ok: true, value: 0.123456789 },
  )

  const nameBinding = USER_BINDINGS[0]!
  assert.deepEqual(
    nameBinding.parse!({
      input: 'Nome colado',
      row: sourceRow,
      address: { rowId: sourceRow.id, columnId: 'name' },
      source: 'paste',
    }),
    { ok: true, value: 'Nome colado' },
  )
  const changedName = nameBinding.write!(sourceRow, 'Novo nome')
  assert.equal(changedName.name, 'Novo nome')
  assert.equal(sourceRow.name, 'Ana Luísa Ferreira')
  assert.equal(nameBinding.write!(sourceRow, 123), sourceRow)

  const roleBinding = USER_BINDINGS[1]!
  assert.deepEqual(
    roleBinding.parse!({
      input: '',
      row: sourceRow,
      address: { rowId: sourceRow.id, columnId: 'role' },
      source: 'delete',
    }),
    { ok: true, value: '' },
  )
  assert.equal(roleBinding.write!(sourceRow, 'Perfil inválido'), sourceRow)

  const dateBinding = USER_BINDINGS[2]!
  assert.deepEqual(
    dateBinding.parse!({
      input: '14/03/1988',
      row: sourceRow,
      address: { rowId: sourceRow.id, columnId: 'birthDate' },
      source: 'paste',
    }),
    { ok: true, value: '1988-03-14' },
  )
  const changedDate = dateBinding.write!(sourceRow, '14/03/1988')
  assert.equal(changedDate.birthDate, '1988-03-14')
  assert.equal(dateBinding.write!(sourceRow, null), sourceRow)

  const salaryBinding = USER_BINDINGS[3]!
  const changedSalary = salaryBinding.write!(sourceRow, 0.123456789)
  assert.equal(changedSalary.salary, 0.123456789)
  assert.equal(sourceRow.salary, 9850)
  assert.equal(salaryBinding.write!(sourceRow, '5.420,50'), sourceRow)
})
