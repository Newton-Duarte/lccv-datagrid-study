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
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  placeholder?: string
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
  labelDayButton: (date, modifiers) => {
    let label = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
    if (modifiers.today) label = `Hoje, ${label}`
    if (modifiers.selected) label = `${label}, selecionado`
    return label
  },
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
    placeholder = 'DD/MM/AAAA',
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
  const minimumDate = useMemo(() => dateFromIso(minDate), [minDate])
  const maximumDate = useMemo(() => dateFromIso(maxDate), [maxDate])
  const inputKey = value === '' ? 'empty' : 'filled'
  const inputNodeRef = useRef<HTMLInputElement | null>(null)
  const inputGroupRef = useRef<HTMLDivElement | null>(null)
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreInputFocusRef = useRef(false)
  const reconciliationPendingRef = useRef(false)
  const acceptedValueRef = useRef(value)
  acceptedValueRef.current = value
  const [reconciliationVersion, setReconciliationVersion] = useState(0)
  const pickerDate = useMemo(() => dateFromIso(value), [value])
  const pickerKey = `${inputKey}-${reconciliationVersion}`
  const effectiveCalendarProps = {
    ...calendarProps,
    captionLayout: calendarProps?.captionLayout ?? 'dropdown',
    startMonth: minimumDate ?? calendarProps?.startMonth,
    endMonth: maximumDate ?? calendarProps?.endMonth,
  }

  const setInputRef = useCallback((node: HTMLInputElement | null): void => {
    if (node === null) {
      restoreInputFocusRef.current = inputNodeRef.current !== null && document.activeElement === inputNodeRef.current
    }
    inputNodeRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const reconcileInput = useCallback((): void => {
    const input = inputNodeRef.current
    if (input === null) return

    const acceptedDisplay = formatDateBR(acceptedValueRef.current)
    if (input.value === acceptedDisplay) {
      reconciliationPendingRef.current = false
      return
    }

    const activeElement = document.activeElement
    const focusInsideControl = activeElement === input
      || inputGroupRef.current?.contains(activeElement) === true
      || contentRef?.current?.contains(activeElement) === true
    if (focusInsideControl || reconciliationPendingRef.current) return

    reconciliationPendingRef.current = true
    setReconciliationVersion((version) => version + 1)
  }, [contentRef])

  const scheduleReconciliation = useCallback((): void => {
    queueMicrotask(reconcileInput)
  }, [reconcileInput])

  useLayoutEffect(() => {
    if (restoreInputFocusRef.current) {
      restoreInputFocusRef.current = false
      inputNodeRef.current?.focus({ preventScroll: true })
    }
    reconcileInput()
  })

  const handlePickerChange = (date: Date | undefined): void => {
    const nextValue = localDateToIso(date)
    onValueChange(nextValue)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.currentTarget.value
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
    if (parsed.ok) {
      onValueChange(parsed.value)
    }
    inputProps?.onChange?.(event)
  }

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>): void => {
    inputProps?.onBlur?.(event)
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof HTMLElement && inputGroupRef.current?.contains(relatedTarget) === true) {
      relatedTarget.focus({ preventScroll: true })
    }
    scheduleReconciliation()
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    inputProps?.onKeyDown?.(event)
    if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') scheduleReconciliation()
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    onOpenChange?.(nextOpen)
    if (!nextOpen) scheduleReconciliation()
  }

  const handleCalendarSelect = (date: Date | undefined): void => {
    scheduleReconciliation()
    queueMicrotask(() => {
      const activeElement = document.activeElement
      if (activeElement === document.body || contentRef?.current?.contains(activeElement) === true) {
        calendarTriggerRef.current?.focus({ preventScroll: true })
      }
    })
    onCalendarSelect?.(localDateToIso(date))
  }

  return (
    <DatePicker
      key={pickerKey}
      value={pickerDate}
      minDate={minimumDate}
      maxDate={maximumDate}
      open={open}
      onOpenChange={handleOpenChange}
      onChange={handlePickerChange}
      size="md"
    >
      <DatePickerInputGroup
        {...inputGroupProps}
        ref={inputGroupRef}
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
          placeholder={inputProps?.placeholder ?? placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        <DatePickerIconTrigger
          {...iconTriggerProps}
          ref={calendarTriggerRef}
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
