/* eslint-disable react-refresh/only-export-components */
import { Button, Text } from '@sbwb-design-system/ui-core'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppDatePicker } from '../../src/components/app-datepicker.tsx'
import { AppSelect } from '../../src/components/app-select.tsx'
import { isoToLocalDate } from '../../src/utils/date.ts'
import '../../src/globals.css'
import 'sbwb-ds-v2-aggrid/styles/theme.css'

const OPTIONS = [
  { value: 'a', label: 'Opção A' },
  { value: 'b', label: 'Opção B' },
] as const

function AppControlsHarness() {
  const [date, setDate] = useState('1988-03-14')
  const [selection, setSelection] = useState('')

  return (
    <main className="sw:flex sw:flex-col sw:gap-6 sw:p-6">
      <section aria-label="Fixture do seletor de data" className="sw:flex sw:flex-col sw:gap-3">
        <Text as="h1" variant="title-md">Controles compartilhados</Text>
        <AppDatePicker
          value={date}
          onValueChange={setDate}
          ariaLabel="Data controlada"
          calendarProps={{ defaultMonth: isoToLocalDate('1988-03-14') }}
        />
        <div className="sw:flex sw:flex-wrap sw:gap-2">
          <Button type="button" onClick={() => setDate('')}>Limpar data externa</Button>
          <Button type="button" onClick={() => setDate('1988-03-14')}>Restaurar data externa</Button>
        </div>
        <output aria-label="Valor ISO controlado" data-testid="controlled-date-output">
          {date}
        </output>
      </section>

      <section aria-label="Fixture do seletor de perfil" className="sw:flex sw:flex-col sw:gap-3">
        <AppSelect
          value={selection}
          options={OPTIONS}
          onValueChange={setSelection}
          ariaLabel="Seleção genérica"
          placeholder="Escolha uma opção"
        />
        <Button type="button" onClick={() => setSelection('')}>Limpar seleção externa</Button>
        <output aria-label="Valor da seleção controlada" data-testid="controlled-select-output">
          {selection}
        </output>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppControlsHarness />
  </StrictMode>,
)
