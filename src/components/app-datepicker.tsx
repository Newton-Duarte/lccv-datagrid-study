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
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, RefObject } from 'react'
import {
  formatDateBR,
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
  const inputNodeRef = useRef<HTMLInputElement | null>(null)
  const previousValueRef = useRef(value)
  const selectedDate = useMemo(() => dateFromIso(value), [value])
  const minimumDate = useMemo(() => dateFromIso(minDate), [minDate])
  const maximumDate = useMemo(() => dateFromIso(maxDate), [maxDate])

  const setInputRef = useCallback((node: HTMLInputElement | null): void => {
    inputNodeRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  useEffect(() => {
    if (previousValueRef.current === value) return
    previousValueRef.current = value
    const input = inputNodeRef.current
    if (input === null) return
    const next = value === '' ? '' : formatDateBR(value)
    const syncInput = window.setTimeout(() => {
      if (input.value !== next) input.value = next
    }, 0)
    return () => window.clearTimeout(syncInput)
  }, [value])

  const handlePickerChange = (date: Date | undefined): void => {
    onValueChange(localDateToIso(date))
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.currentTarget.value
    const parsed = parseDateInput(raw)
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
          {...calendarProps}
          labels={{ ...calendarLabels, ...calendarProps?.labels }}
          closeOnSelect
          onDateSelect={handleCalendarSelect}
        />
      </DatePickerContent>
    </DatePicker>
  )
})

AppDatePicker.displayName = 'AppDatePicker'
