import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sbwb-design-system/ui-core'
import { forwardRef } from 'react'
import type { ReactElement, RefObject } from 'react'
import type { SelectContentProps, SelectTriggerProps } from '@sbwb-design-system/ui-core'

export type AppSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type AppSelectProps = {
  value: string
  options: readonly AppSelectOption[]
  onValueChange(value: string): void
  ariaLabel: string
  density?: 'default' | 'cell'
  disabled?: boolean
  placeholder?: string
  open?: boolean
  onOpenChange?(open: boolean): void
  contentRef?: RefObject<HTMLDivElement | null>
  triggerProps?: Omit<SelectTriggerProps, 'children' | 'aria-label' | 'disabled'>
  contentProps?: Omit<SelectContentProps, 'children'>
}

export const AppSelect = forwardRef<HTMLButtonElement, AppSelectProps>(function AppSelect(
  {
    value,
    options,
    onValueChange,
    ariaLabel,
    density = 'default',
    disabled = false,
    placeholder = 'Selecione uma opção',
    open,
    onOpenChange,
    contentRef,
    triggerProps,
    contentProps,
  },
  ref,
): ReactElement {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={onOpenChange}
      size="md"
    >
      <SelectTrigger
        {...triggerProps}
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled}
        fullWidth={triggerProps?.fullWidth ?? true}
        className={[
          'app-select__trigger sw:min-w-0',
          density === 'cell' ? 'app-select__trigger--cell' : undefined,
          triggerProps?.className,
        ].filter(Boolean).join(' ')}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent {...contentProps} ref={contentRef}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})

AppSelect.displayName = 'AppSelect'
