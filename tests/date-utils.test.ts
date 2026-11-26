import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatDateBR,
  getTodayIsoDate,
  isoToLocalDate,
  localDateToIso,
  parseDateInput,
} from '../src/utils/date.ts'

test('parses exact Brazilian and ISO calendar input', () => {
  assert.deepEqual(parseDateInput('14/03/1988'), { ok: true, value: '1988-03-14' })
  assert.deepEqual(parseDateInput('1988-03-14'), { ok: true, value: '1988-03-14' })
  assert.deepEqual(parseDateInput(''), { ok: true, value: '' })
  assert.equal(parseDateInput('29/02/2001').ok, false)
  assert.equal(parseDateInput('2001-02-29').ok, false)
  assert.equal(formatDateBR('1988-03-14'), '14/03/1988')
})

test('round-trips local calendar fields without UTC shifts', () => {
  const date = isoToLocalDate('1988-03-14')
  assert.ok(date)
  assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate()], [1988, 3, 14])
  assert.equal(localDateToIso(date), '1988-03-14')
  assert.equal(isoToLocalDate(''), undefined)
  assert.equal(localDateToIso(undefined), '')
  assert.throws(() => isoToLocalDate('2001-02-29'), RangeError)
})

test('preserves calendar years below 100 and rejects invalid conversion values', () => {
  const date = isoToLocalDate('0001-03-14')
  assert.ok(date)
  assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate()], [1, 3, 14])
  assert.equal(localDateToIso(date), '0001-03-14')
  assert.throws(() => isoToLocalDate('not-a-date'), RangeError)
  assert.throws(() => localDateToIso(new Date(Number.NaN)), RangeError)
  assert.equal(typeof getTodayIsoDate(new Date()), 'string')
})
