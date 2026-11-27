export type DateInputResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

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

export function parseDateInput(input: unknown): DateInputResult {
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

function invalidDateError(value: unknown): RangeError {
  return new RangeError(`Data inválida: ${String(value)}`)
}

function createLocalCalendarDate(year: number, month: number, day: number): Date {
  // setFullYear avoids Date's special treatment of years 0 through 99.
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatDateBR(iso: string): string {
  if (!isValidIsoDate(iso)) return ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export function isoToLocalDate(iso: string): Date | undefined {
  if (iso === '') return undefined
  if (!isValidIsoDate(iso)) throw invalidDateError(iso)

  const match = ISO_DATE_PATTERN.exec(iso)
  if (match === null) throw invalidDateError(iso)
  return createLocalCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

export function localDateToIso(date: Date | undefined): string {
  // A local Date cannot represent a skipped civil day such as Pacific/Apia
  // 2011-12-30; the screen documents this rare round-trip limitation.
  if (date === undefined) return ''
  if (Number.isNaN(date.getTime())) throw invalidDateError(date)

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (year < 0 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw invalidDateError(date)
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

export function getTodayIsoDate(now: Date = new Date()): string {
  return localDateToIso(now)
}
