import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerIconTrigger,
  DatePickerInput,
  DatePickerInputGroup,
} from '@sbwb-design-system/ui-core'
import type {
  DatePickerCalendarProps,
  DatePickerContentProps,
  DatePickerIconTriggerProps,
  DatePickerInputGroupProps,
  DatePickerInputProps,
} from '@sbwb-design-system/ui-core'
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, RefObject } from 'react'
import {
  isValidIsoDate,
  isoToLocalDate,
  localDateToIso,
  parseDateInput,
} from '../utils/date.ts'
import type { DateInputResult } from '../utils/date.ts'

export type AppDatePickerProps = {
  value: string
  onValueChange(value: string): void
  ariaLabel: string
  onDraftChange?(raw: string, parsed: DateInputResult): void
  onCalendarSelect?(value: string): void
  density?: 'default' | 'cell'
  disabled?: boolean
  minDate?: string
  maxDate?: string
  open?: boolean
  onOpenChange?(open: boolean): void
  contentRef?: RefObject<HTMLDivElement | null>
  inputProps?: Omit<DatePickerInputProps, 'value' | 'defaultValue' | 'aria-label' | 'disabled'>
  inputGroupProps?: Omit<DatePickerInputGroupProps, 'children'>
  iconTriggerProps?: Omit<DatePickerIconTriggerProps, 'aria-label' | 'disabled'>
  contentProps?: Omit<DatePickerContentProps, 'children'>
  calendarProps?: Omit<DatePickerCalendarProps, 'onDateSelect'>
}

const calendarLabels: NonNullable<DatePickerCalendarProps['labels']> = {
  labelNav: () => 'Navegação do calendário',
  labelMonthDropdown: () => 'Selecionar mês',
  labelYearDropdown: () => 'Selecionar ano',
  labelNext: () => 'Próximo mês',
  labelPrevious: () => 'Mês anterior',
}

function dateFromIso(value: string): Date | undefined {
  return value === '' || !isValidIsoDate(value) ? undefined : isoToLocalDate(value)
}

function isWithinBounds(value: string, minDate: string, maxDate: string): boolean {
  return (minDate === '' || value >= minDate) && (maxDate === '' || value <= maxDate)
}

export const AppDatePicker = forwardRef<HTMLInputElement, AppDatePickerProps>(function AppDatePicker(
  {
    value,
    onValueChange,
    ariaLabel,
    onDraftChange,
    onCalendarSelect,
    density = 'default',
    disabled = false,
    minDate = '',
    maxDate = '',
    open,
    onOpenChange,
    contentRef,
    inputProps,
    inputGroupProps,
    iconTriggerProps,
    contentProps,
    calendarProps,
  },
  ref,
): ReactElement {
  const selectedDate = useMemo(() => dateFromIso(value), [value])
  const minimumDate = useMemo(() => dateFromIso(minDate), [minDate])
  const maximumDate = useMemo(() => dateFromIso(maxDate), [maxDate])
  const inputKey = value === '' ? 'empty' : 'filled'
  const inputNodeRef = useRef<HTMLInputElement | null>(null)
  const restoreInputFocusRef = useRef(false)
  const effectiveCalendarProps = {
    ...calendarProps,
    captionLayout: calendarProps?.captionLayout ?? 'dropdown',
    startMonth: minimumDate ?? calendarProps?.startMonth,
    endMonth: maximumDate ?? calendarProps?.endMonth,
  }

  const setInputRef = useCallback((node: HTMLInputElement | null): void => {
    inputNodeRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  useLayoutEffect(() => {
    if (!restoreInputFocusRef.current) return
    restoreInputFocusRef.current = false
    inputNodeRef.current?.focus({ preventScroll: true })
  }, [inputKey])

  const handlePickerChange = (date: Date | undefined): void => {
    onValueChange(localDateToIso(date))
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.currentTarget.value
    if (document.activeElement === event.currentTarget) restoreInputFocusRef.current = true
    const syntax = parseDateInput(raw)
    const parsed = syntax.ok && syntax.value !== '' && !isWithinBounds(syntax.value, minDate, maxDate)
      ? {
        ok: false as const,
        message: minDate !== '' && syntax.value < minDate
          ? 'A data informada está antes do limite permitido.'
          : 'A data informada está depois do limite permitido.',
      }
      : syntax
    onDraftChange?.(raw, parsed)
    if (parsed.ok) onValueChange(parsed.value)
    inputProps?.onChange?.(event)
  }

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>): void => {
    inputProps?.onBlur?.(event)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    inputProps?.onKeyDown?.(event)
  }

  const handleCalendarSelect = (date: Date | undefined): void => {
    onCalendarSelect?.(localDateToIso(date))
  }

  return (
    <DatePicker
      key={inputKey}
      value={selectedDate}
      minDate={minimumDate}
      maxDate={maximumDate}
      open={open}
      onOpenChange={onOpenChange}
      onChange={handlePickerChange}
      size="md"
    >
      <DatePickerInputGroup
        {...inputGroupProps}
        fullWidth={inputGroupProps?.fullWidth ?? true}
        className={[
          'app-datepicker__group sw:min-w-0',
          density === 'cell' ? 'app-datepicker__group--cell' : undefined,
          inputGroupProps?.className,
        ].filter(Boolean).join(' ')}
      >
        <DatePickerInput
          {...inputProps}
          ref={setInputRef}
          aria-label={ariaLabel}
          disabled={disabled}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        <DatePickerIconTrigger
          {...iconTriggerProps}
          disabled={disabled}
          aria-label="Abrir calendário"
        />
      </DatePickerInputGroup>
      <DatePickerContent {...contentProps} ref={contentRef}>
        <DatePickerCalendar
          {...effectiveCalendarProps}
          labels={{ ...calendarLabels, ...calendarProps?.labels }}
          closeOnSelect
          onDateSelect={handleCalendarSelect}
        />
      </DatePickerContent>
    </DatePicker>
  )
})

AppDatePicker.displayName = 'AppDatePicker'
