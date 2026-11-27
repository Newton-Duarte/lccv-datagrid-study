async (page) => {
  const failures = []
  const seedIds = new Set(Array.from({ length: 18 }, (_, index) => `user-${String(index + 1).padStart(3, '0')}`))
  let knownRowIds = new Set(seedIds)
  const externalRequests = []
  const consoleErrors = []

  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith('http://127.0.0.1:5187/') && !url.startsWith('http://127.0.0.1:5187')) {
      externalRequests.push(`${request.method()} ${url}`)
    }
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const assertNear = (actual, expected, message, tolerance = 1) => {
    assert(Math.abs(actual - expected) <= tolerance, `${message}: esperado ${expected} ±${tolerance}, obtido ${actual}`)
  }

  const waitFor = async (condition, message, timeout = 2500) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await condition()) return
      await page.waitForTimeout(40)
    }
    throw new Error(message)
  }

  const button = (name) => page.getByRole('button', { name, exact: true })
  const row = (id) => page.locator(`.ag-row[row-id="${id}"]:visible`).first()
  const cell = (id, column) => row(id).locator(`[col-id="${column}"]`)
  const normalized = (value) => value.replace(/\s+/g, ' ').trim()
  const cellText = async (id, column) => normalized((await cell(id, column).textContent()) ?? '')
  const save = () => page.locator('.users-footer-actions button').filter({ hasText: 'Salvar alterações' })
  const discard = () => button('Descartar')
  const clickSave = async (label) => {
    await waitFor(async () => !(await save().isDisabled()), `${label}: Salvar não foi habilitado após o rascunho`)
    await save().click()
  }
  const clickDiscard = async (label) => {
    await waitFor(async () => !(await discard().isDisabled()), `${label}: Descartar não foi habilitado após o rascunho`)
    await discard().click()
    await waitFor(async () => (await save().isDisabled()) && (await discard().isDisabled()), `${label}: a grade não terminou de restaurar o estado limpo`)
  }

  const fresh = async () => {
    await page.goto('http://127.0.0.1:5187/')
    knownRowIds = new Set(seedIds)
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'A tela inicial não carregou')
  }

  const exerciseSharedControls = async () => {
    await page.goto('http://127.0.0.1:5187/tests/browser/app-controls.html')
    const dateFixture = page.getByRole('region', { name: 'Fixture do seletor de data', exact: true })
    const dateInput = dateFixture.getByRole('textbox', { name: 'Data controlada' })
    const dateOutput = page.getByTestId('controlled-date-output')
    await waitFor(async () => (await dateOutput.textContent()) === '1988-03-14', 'Fixture não iniciou com a data ISO esperada')
    assert(await dateInput.inputValue() === '14/03/1988', 'Fixture não exibiu a data inicial em pt-BR')
    await dateFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    const initialSelectedDateButton = page.getByRole('button', { name: /^segunda-feira, 14 de março de 1988/ })
    assert((await initialSelectedDateButton.getAttribute('aria-label'))?.includes('selecionado') === true, 'O dia selecionado não expôs o modificador acessível em português')
    await dateFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    await waitFor(async () => (await page.locator('[role="dialog"]').count()) === 0, 'O popup inicial não terminou de fechar')

    const fixedFixture = page.getByRole('region', { name: 'Fixture do seletor de data com pai fixo', exact: true })
    const fixedInput = fixedFixture.getByRole('textbox', { name: 'Data com pai fixo' })
    await fixedFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    await page.getByRole('button', { name: /^terça-feira, 15 de março de 1988/ }).click()
    await waitFor(async () => (await page.locator('[role="dialog"]').count()) === 0, 'O popup do pai fixo não fechou após a seleção')
    await fixedFixture.getByRole('button', { name: 'Foco externo fixo', exact: true }).click()
    assert(await fixedInput.inputValue() === '14/03/1988', 'O pai fixo não restaurou o texto aceito após uma proposta recusada')
    await fixedFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    const fixedSelectedDay = page.locator('[role="dialog"] [role="gridcell"][aria-selected="true"] button')
    assert(await fixedSelectedDay.count() === 1, 'O pai fixo deveria manter exatamente um dia selecionado')
    assert((await fixedSelectedDay.getAttribute('aria-label'))?.startsWith('segunda-feira, 14 de março de 1988') === true, 'O pai fixo manteve o dia recusado selecionado')
    await fixedFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    await waitFor(async () => (await page.locator('[role="dialog"]').count()) === 0, 'O popup do pai fixo não terminou de fechar')

    const deferredFixture = page.getByRole('region', { name: 'Fixture do seletor de data com atualização adiada', exact: true })
    const deferredInput = deferredFixture.getByRole('textbox', { name: 'Data controlada adiada' })
    const deferredOutput = page.getByTestId('deferred-date-output')
    const deferredPending = page.getByTestId('deferred-date-pending')
    const deferredBlurs = page.getByTestId('deferred-date-blur-count')
    await deferredInput.click()
    await deferredInput.press('Control+A')
    await deferredInput.press('Backspace')
    await waitFor(async () => (await deferredInput.inputValue()) === '', 'Limpeza adiada não limpou o input visível')
    assert(await deferredOutput.textContent() === '1988-03-14', 'O controle adiado aplicou a limpeza antes do botão Aplicar')
    assert(await deferredPending.textContent() === '', 'O controle adiado não reteve a limpeza pendente')
    await deferredInput.press('Tab')
    await waitFor(async () => (await deferredBlurs.textContent()) === '1', 'Blur público não foi encaminhado após foco sair do controle adiado')
    const deferredTabFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute('aria-label'),
    }))
    assert(deferredTabFocus.tag === 'BUTTON' && deferredTabFocus.label === 'Abrir calendário', 'Tab não moveu o foco para o gatilho do calendário adiado')
    const deferredReject = deferredFixture.getByRole('button', { name: 'Rejeitar valor adiado', exact: true })
    await deferredReject.click()
    await waitFor(async () => (await deferredPending.textContent()) === '1988-03-14', 'O controle adiado não restaurou o valor rejeitado')
    assert(await deferredOutput.textContent() === '1988-03-14', 'Rejeitar alterou o valor controlado')
    assert(await deferredInput.inputValue() === '14/03/1988', 'Rejeitar não restaurou o texto visível aceito')
    const deferredRejectFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim(),
    }))
    assert(deferredRejectFocus.tag === 'BUTTON' && deferredRejectFocus.text === 'Rejeitar valor adiado', 'Rejeitar perdeu o foco para o input')
    await deferredInput.click()
    await deferredInput.press('Control+A')
    await page.keyboard.type('15021990')
    await deferredInput.press('Control+A')
    await deferredInput.press('Backspace')
    await waitFor(async () => (await deferredPending.textContent()) === '', 'O controle adiado não preparou a segunda limpeza pendente')
    await deferredInput.press('Tab')
    await waitFor(async () => (await deferredBlurs.textContent()) === '2', 'O segundo blur público não foi encaminhado após a rejeição')
    const deferredApply = deferredFixture.getByRole('button', { name: 'Aplicar valor adiado', exact: true })
    await deferredApply.click()
    await waitFor(async () => (await deferredOutput.textContent()) === '', 'Aplicar não publicou o valor vazio adiado')
    assert(await deferredInput.inputValue() === '', 'Aplicar não sincronizou o input vazio adiado')
    const deferredApplyFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim(),
    }))
    assert(deferredApplyFocus.tag === 'BUTTON' && deferredApplyFocus.text === 'Aplicar valor adiado', 'Aplicar perdeu o foco para o input remountado')

    await deferredFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    const deferredCalendarDay = page.locator('[role=dialog] [role=gridcell] button').first()
    const deferredCalendarLabel = await deferredCalendarDay.getAttribute('aria-label')
    await deferredCalendarDay.click()
    await waitFor(async () => (await page.locator('[role="dialog"]').count()) === 0, 'O popup adiado não fechou após a seleção')
    await waitFor(async () => (await deferredPending.textContent()) !== '', 'Seleção adiada do calendário não criou um valor pendente')
    assert(await deferredOutput.textContent() === '', 'Seleção adiada do calendário alterou o valor aceito antes da confirmação')
    assert(await deferredInput.inputValue() === '', 'Seleção adiada do calendário exibiu uma proposta não aceita')
    await deferredReject.click()
    await waitFor(async () => (await deferredPending.textContent()) === '', 'Rejeição da seleção de calendário não restaurou o pendente')
    assert(await deferredOutput.textContent() === '', 'Rejeição do calendário alterou o valor aceito')
    await waitFor(async () => (await deferredInput.inputValue()) === '', 'Rejeição do calendário não restaurou o texto vazio aceito')
    await deferredFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    assert(await page.locator('[role=dialog] [aria-selected="true"]').count() === 0, `Rejeição do calendário deixou ${deferredCalendarLabel ?? 'um dia'} selecionado`)
    await deferredFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    await waitFor(async () => (await page.locator('[role="dialog"]').count()) === 0, 'O popup adiado não terminou de fechar')

    await dateInput.click()
    await button('Forçar rerender independente').click()
    await waitFor(async () => (await page.getByTestId('fixture-rerender-version').textContent()) === '1', 'Fixture não realizou o rerender com ref inline')
    const inlineRefRerenderFocus = await page.evaluate(() => ({
      label: document.activeElement?.getAttribute('aria-label'),
      value: document.activeElement instanceof HTMLInputElement ? document.activeElement.value : undefined,
    }))
    assert(inlineRefRerenderFocus.label === 'Data controlada' && inlineRefRerenderFocus.value === '14/03/1988', 'Rerender com ref inline moveu o foco para fora do input')
    await button('Limpar data externa').click()
    await waitFor(async () => (await dateOutput.textContent()) === '', 'Limpeza externa não atualizou o valor ISO')
    assert(await dateInput.inputValue() === '', 'Limpeza externa não limpou o input visível')
    const inlineRefExternalClearFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim(),
    }))
    assert(inlineRefExternalClearFocus.tag === 'BUTTON' && inlineRefExternalClearFocus.text === 'Limpar data externa', 'Limpeza externa após ref inline roubou o foco para o input remountado')

    await dateFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    const selectedDateButton = page.getByRole('button', { name: /^segunda-feira, 14 de março de 1988/ })
    await selectedDateButton.click()
    await waitFor(async () => (await dateOutput.textContent()) === '1988-03-14', 'Seleção do calendário não atualizou o valor ISO')
    assert(await dateInput.inputValue() === '14/03/1988', 'Seleção do calendário não atualizou o input visível')
    await waitFor(async () => (await page.locator('[role=dialog]').count()) === 0, 'Seleção do calendário não fechou o popup')

    await button('Limpar data externa').click()
    await waitFor(async () => (await dateOutput.textContent()) === '', 'A segunda limpeza externa não atualizou o valor ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '', 'A segunda limpeza externa deixou uma data visual antiga')
    assert(await dateInput.getAttribute('placeholder') === 'DD/MM/AAAA', 'O placeholder padrão não informou o formato DD/MM/AAAA')
    await dateFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    assert(await page.locator('[role=dialog] [aria-selected="true"]').count() === 0, 'A segunda limpeza externa deixou um dia selecionado no calendário')
    await dateFixture.getByRole('button', { name: 'Abrir calendário' }).click()
    await button('Restaurar data externa').click()
    assert(await dateOutput.textContent() === '1988-03-14', 'Restauro externo não recuperou o valor ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '14/03/1988', 'Restauro externo não sincronizou o input visível')
    await dateInput.click()
    await dateInput.press('Control+A')
    await page.keyboard.type('1')
    assert(await dateInput.inputValue() === '1', 'Rascunho parcial do fixture não foi mantido antes do rerender')
    assert(await dateOutput.textContent() === '1988-03-14', 'Rascunho parcial do fixture alterou o ISO controlado')
    await button('Limpar data externa').click()
    await waitFor(async () => (await dateOutput.textContent()) === '', 'Limpeza externa após rascunho parcial não atualizou o ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '', 'Limpeza externa após rascunho parcial não limpou o input')
    const externalClearFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim(),
    }))
    assert(externalClearFocus.tag === 'BUTTON' && externalClearFocus.text === 'Limpar data externa', 'Limpeza externa roubou o foco para o input remountado')
    await button('Restaurar data externa').click()
    await waitFor(async () => (await dateInput.inputValue()) === '14/03/1988', 'Restauro após limpeza externa não recuperou o valor')
    await dateInput.click()
    await dateInput.press('Control+A')
    await page.keyboard.type('1')
    await button('Forçar rerender independente').click()
    await waitFor(async () => (await page.getByTestId('fixture-rerender-version').textContent()) === '2', 'Fixture não realizou o segundo rerender independente')
    assert(await dateInput.inputValue() === '1', 'Rerender externo apagou o rascunho parcial do fixture')
    assert(await dateOutput.textContent() === '1988-03-14', 'Rerender externo alterou o ISO sem uma conversão válida')
    await button('Restaurar data externa').click()
    await waitFor(async () => (await dateInput.inputValue()) === '14/03/1988', 'Fixture não restaurou o valor após o rascunho parcial')
    await dateInput.click()
    await dateInput.press('Control+A')
    await dateInput.press('Backspace')
    await waitFor(async () => (await dateOutput.textContent()) === '', 'Limpeza digitada não atualizou o valor ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '', 'Limpeza digitada não limpou o input visível')
    await page.keyboard.type('15021990')
    await waitFor(async () => (await dateInput.inputValue()) === '15/02/1990', 'A digitação sequencial após limpar perdeu o foco do input')
    await waitFor(async () => (await dateOutput.textContent()) === '1990-02-15', 'A digitação sequencial após limpar não publicou o ISO')
    const replacementFocus = await page.evaluate(() => ({
      label: document.activeElement?.getAttribute('aria-label'),
      value: document.activeElement?.value,
    }))
    assert(replacementFocus.label === 'Data controlada' && replacementFocus.value === '15/02/1990', 'A data aceita após limpar não devolveu o foco ao input')

    const boundedInput = page.getByRole('textbox', { name: 'Data com limites' })
    const boundedOutput = page.getByTestId('bounded-date-output')
    assert(await boundedInput.getAttribute('placeholder') === 'Data limitada', 'O placeholder customizado não foi respeitado')
    await boundedInput.fill('31/12/1999')
    await boundedInput.press('Enter')
    await waitFor(async () => (await boundedInput.inputValue()) === '15/06/2000', 'Data digitada abaixo do minDate não voltou ao valor aceito')
    assert(await boundedOutput.textContent() === '2000-06-15', 'Data digitada abaixo do minDate foi publicada')
    await boundedInput.fill('01/01/2001')
    await boundedInput.press('Enter')
    await waitFor(async () => (await boundedInput.inputValue()) === '15/06/2000', 'Data digitada acima do maxDate não voltou ao valor aceito')
    assert(await boundedOutput.textContent() === '2000-06-15', 'Data digitada acima do maxDate foi publicada')

    const boundedFixture = page.getByRole('region', { name: 'Fixture do seletor de data com limites', exact: true })
    await boundedInput.click()
    await boundedInput.press('Tab')
    const boundedTrigger = boundedFixture.getByRole('button', { name: 'Abrir calendário', exact: true })
    await boundedTrigger.press('Enter')
    const boundedKeyboardDay = page.getByRole('button', { name: /^sexta-feira, 16 de junho de 2000/ })
    await boundedKeyboardDay.focus()
    await boundedKeyboardDay.press('Enter')
    await waitFor(async () => (await boundedOutput.textContent()) === '2000-06-16', 'Seleção por teclado não publicou a data limitada')
    await waitFor(async () => (await boundedInput.inputValue()) === '16/06/2000', 'Seleção por teclado não atualizou o texto limitado')
    const boundedFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute('aria-label'),
    }))
    assert(boundedFocus.tag === 'BUTTON' && boundedFocus.label === 'Abrir calendário', 'Seleção por teclado não devolveu o foco ao próprio gatilho')
    await page.keyboard.press('Tab')
    const boundedNextFocus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute('aria-label'),
    }))
    assert(boundedNextFocus.tag !== 'BODY' && boundedNextFocus.label !== 'Data controlada', 'Tab após seleção por teclado perdeu a continuidade do foco')

    const select = page.getByRole('combobox', { name: 'Seleção genérica' })
    const selectOutput = page.getByTestId('controlled-select-output')
    await select.click()
    assert(await page.getByRole('option', { name: 'Opção vazia inválida' }).count() === 0, 'AppSelect renderizou um SelectItem com value vazio')
    await page.getByRole('option', { name: 'Opção A' }).click()
    await waitFor(async () => (await selectOutput.textContent()) === 'a', 'AppSelect não publicou a opção genérica')
    await button('Limpar seleção externa').click()
    await waitFor(async () => (await selectOutput.textContent()) === '', 'AppSelect não limpou a seleção controlada')
    assert(await select.textContent() === 'Escolha uma opção', 'AppSelect não exibiu o placeholder após limpeza')
  }

  const editText = async (id, column, label, value) => {
    await cell(id, column).dblclick()
    const editor = page.locator(`input[aria-label="${label}"]`)
    await editor.fill(value)
    await editor.press('Enter')
    await waitFor(async () => !(await editor.isVisible()), `O editor ${label} não foi finalizado`)
    const expected = column === 'salary' && !value.includes(',') ? `${value},00` : value
    await waitFor(async () => (await cellText(id, column)).includes(expected), `A edição de ${label} (${value}) não foi publicada`)
    await waitFor(() => page.getByRole('status').allTextContents().then((texts) => texts.join(' ').includes('Operação aplicada nesta sessão.')), `A edição de ${label} não anunciou sucesso`)
  }

  const editTextAndSave = async (id, column, label, value) => {
    await cell(id, column).dblclick()
    const editor = page.locator(`input[aria-label="${label}"]`)
    await editor.fill(value)
    assert(await editor.isVisible(), `O editor ${label} deveria permanecer ativo antes de Save`)
    await clickSave(`edição ativa ${column}`)
    await waitFor(() => page.getByText('Alterações salvas nesta sessão', { exact: true }).isVisible(), `Save ativo não anunciou sucesso para ${label}`)
    const expected = column === 'salary' && !value.includes(',') ? `${value},00` : value
    await waitFor(async () => (await cellText(id, column)).includes(expected), `Save ativo não publicou ${label}`)
    assert(await save().isDisabled(), `Save deveria ficar limpo após ${label}`)
  }

  const assertGridFitsCard = async (label) => {
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('.user-card')?.getBoundingClientRect()
      const host = document.querySelector('.user-grid-host')?.getBoundingClientRect()
      if (!card || !host) return null
      return { cardLeft: card.left, cardRight: card.right, hostLeft: host.left, hostRight: host.right }
    })
    assert(geometry !== null, `${label}: não foi possível medir card e grid`)
    assert(geometry.hostLeft >= geometry.cardLeft - 1 && geometry.hostRight <= geometry.cardRight + 1, `${label}: host da grade excede o card`)
  }

  const assertEditorFitsCell = async (label, cellLocator, editorLocator) => {
    await waitFor(async () => {
      const cellBox = await cellLocator.boundingBox()
      const editorBox = await editorLocator.boundingBox()
      return cellBox !== null && editorBox !== null
        && editorBox.x >= cellBox.x - 1
        && editorBox.x + editorBox.width <= cellBox.x + cellBox.width + 1
        && editorBox.y >= cellBox.y - 1
        && editorBox.y + editorBox.height <= cellBox.y + cellBox.height + 1
    }, `${label}: editor não coube na célula`)
  }

  const assertPopupFitsViewport = async (label, popupLocator) => {
    await waitFor(async () => {
      const popupBox = await popupLocator.boundingBox()
      const viewport = page.viewportSize()
      return popupBox !== null && viewport !== null
        && popupBox.x >= -1
        && popupBox.y >= -1
        && popupBox.x + popupBox.width <= viewport.width + 1
        && popupBox.y + popupBox.height <= viewport.height + 1
    }, `${label}: popup excedeu o viewport`)
  }

  const editRoleWithKeyboard = async (id) => {
    await cell(id, 'role').dblclick()
    // AG Grid marks its active body as aria-hidden while a cell editor owns focus.
    // Use the editor's explicit label without requiring it to be in the a11y tree.
    const editor = page.locator('button[role="combobox"][aria-label="Perfil"]')
    await page.locator('.user-role-editor__content [role="option"]').first().waitFor({ state: 'visible' })
    await waitFor(() => page.evaluate(() => document.activeElement?.getAttribute('role') === 'option'), 'O popup de perfil não recebeu o foco de teclado')
    await editor.press('ArrowUp')
    await waitFor(async () => (await page.locator('[role="option"][data-highlighted]').textContent())?.trim() === 'Editor', 'A navegação de teclado não destacou Editor')
    await page.keyboard.press('Enter')
    await waitFor(async () => !(await editor.isVisible()), 'O editor de perfil não foi finalizado')
    await waitFor(async () => (await cellText(id, 'role')).includes('Editor'), 'A edição de perfil não foi publicada')
  }

  const addDraft = async (expectedCount = 19) => {
    await button('Novo usuário').click()
    await waitFor(() => page.getByText(`${expectedCount} registros`, { exact: true }).isVisible(), 'A nova linha não alterou o contador')
    const draftId = await page.locator('.ag-row[row-id]').evaluateAll((nodes, ids) => {
      const known = new Set(ids)
      return nodes.map((node) => node.getAttribute('row-id')).find((id) => id !== null && !known.has(id)) ?? null
    }, [...knownRowIds])
    assert(draftId !== null, 'Não foi possível encontrar o ID estável da nova linha')
    knownRowIds.add(draftId)
    await waitFor(() => page.locator('input[aria-label="Nome do usuário"]').isVisible(), 'A nova linha não abriu o editor de Nome')
    return draftId
  }

  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:5187' })
    await exerciseSharedControls()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await fresh()
    await assertGridFitsCard('desktop inicial')
    const initialStorage = await page.evaluate(() => JSON.stringify({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
    }))

    assert(await button('Salvar alterações').isDisabled(), 'Salvar deveria começar desabilitado')
    assert(await page.getByRole('button', { name: 'Salvar alterações', exact: true }).count() === 1, 'O comando limpo deveria se chamar exatamente Salvar alterações')
    assert(await button('Salvar alterações').getAttribute('aria-describedby') === null, 'O comando limpo não deveria ter descrição de pendência')
    assert(await page.locator('#users-save-description').count() === 0, 'O rodapé limpo não deveria expor a descrição de alterações pendentes')
    assert(await discard().isDisabled(), 'Descartar deveria começar desabilitado')
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'O contador inicial deveria ser 18 registros')
    for (const heading of ['Nome', 'Perfil', 'Data de nascimento', 'Salário mensal (R$)']) {
      assert(await page.getByRole('columnheader', { name: heading }).isVisible(), `Cabeçalho ausente: ${heading}`)
    }
    assert((await page.getByRole('columnheader', { name: 'Ações' }).count()) === 0, 'A grade não pode ter coluna Ações')
    const desktopMetrics = await page.evaluate(() => {
      const styleOf = (selector) => {
        const element = document.querySelector(selector)
        return element === null ? null : getComputedStyle(element)
      }
      const title = styleOf('h1')
      const subtitle = styleOf('.users-title-line + p')
      const badge = styleOf('.users-title-line [data-slot="badge"]')
      const gridCell = styleOf('.ag-cell-value')
      const headerCell = styleOf('.ag-header-cell-text')
      const footerText = [...document.querySelectorAll('.users-keyboard-hints, .users-keyboard-hints kbd, .users-session-copy, .users-footer-actions button')]
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      const headers = [...document.querySelectorAll('.ag-header-cell[col-id]')].map((element) => ({
        id: element.getAttribute('col-id'),
        width: element.getBoundingClientRect().width,
        className: element.className,
      }))
      const salaryCell = document.querySelector('.ag-row[row-id="user-001"] [col-id="salary"]')
      return {
        title: title === null ? null : { fontSize: Number.parseFloat(title.fontSize), fontWeight: title.fontWeight, lineHeight: Number.parseFloat(title.lineHeight) },
        subtitle: subtitle === null ? null : Number.parseFloat(subtitle.fontSize),
        badge: badge === null ? null : Number.parseFloat(badge.fontSize),
        gridCell: gridCell === null ? null : Number.parseFloat(gridCell.fontSize),
        headerCell: headerCell === null ? null : Number.parseFloat(headerCell.fontSize),
        footerText,
        headers,
        salaryCellClass: salaryCell?.className ?? '',
        salaryCellAlign: salaryCell === null ? null : getComputedStyle(salaryCell).textAlign,
      }
    })
    assert(desktopMetrics.title !== null, 'O título não foi renderizado como h1')
    assertNear(desktopMetrics.title.fontSize, 24, 'O título deveria ter 24px')
    assert(desktopMetrics.title.fontWeight === '600', `O título deveria ter peso 600, obteve ${desktopMetrics.title.fontWeight}`)
    assert(desktopMetrics.title.lineHeight <= 31.2, 'O título deveria usar line-height tight')
    assertNear(desktopMetrics.subtitle, 14, 'O subtítulo deveria ter 14px')
    assertNear(desktopMetrics.badge, 12, 'O contador deveria ter 12px')
    assert(desktopMetrics.footerText.every((size) => size >= 12), 'Textos e teclas do rodapé deveriam ter no mínimo 12px')
    assertNear(desktopMetrics.gridCell, 14, 'O texto da grade deveria manter o padrão de 14px')
    assertNear(desktopMetrics.headerCell, 14, 'O cabeçalho da grade deveria manter o padrão de 14px')
    for (const [id, width] of [['role', 190], ['birthDate', 170], ['salary', 180]]) {
      const header = desktopMetrics.headers.find((entry) => entry.id === id)
      assert(header !== undefined, `A coluna ${id} não foi encontrada`)
      assertNear(header.width, width, `A largura da coluna ${id} está incorreta`)
    }
    const desktopNameHeader = desktopMetrics.headers.find((entry) => entry.id === 'name')
    assert(desktopNameHeader !== undefined && desktopNameHeader.width >= 260, 'Nome deveria consumir o espaço restante e respeitar minWidth 260')
    const salaryHeader = desktopMetrics.headers.find((entry) => entry.id === 'salary')
    assert(salaryHeader?.className.includes('ag-right-aligned-header') === true, 'O cabeçalho de salário deveria usar a classe numérica pública')
    assert(desktopMetrics.salaryCellClass.includes('ag-right-aligned-cell'), 'O valor de salário deveria usar a classe numérica pública')
    assert(desktopMetrics.salaryCellAlign === 'right', 'O valor de salário deveria estar alinhado à direita')
    assert(await page.locator('.user-savebar').count() === 0, 'O banner antigo de status não deveria existir')
    assert(await page.getByText('Selecione células para preencher, limpar e desfazer operações.', { exact: true }).count() === 0, 'A legenda antiga da seleção não deveria existir')

    await cell('user-001', 'name').dblclick()
    const unchangedEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    assert(await save().isDisabled(), 'Abrir sem alterar deve manter Salvar desabilitado')
    assert(await discard().isDisabled(), 'Abrir sem alterar deve manter Descartar desabilitado')
    assert(await page.locator('.users-pending-indicator').count() === 0, 'Abrir sem alterar não deveria mostrar o indicador pendente')
    await unchangedEditor.press('Escape')
    await waitFor(async () => !(await unchangedEditor.isVisible()), 'Escape não fechou o editor sem alteração')
    await cell('user-001', 'name').click()
    await page.keyboard.press('F2')
    const f2Editor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await waitFor(() => f2Editor.isVisible(), 'F2 não abriu o editor de uma célula limpa')
    assert(await save().isDisabled() && await discard().isDisabled(), 'F2 sem alteração não deveria habilitar ações')
    await f2Editor.press('Escape')
    await waitFor(async () => !(await f2Editor.isVisible()), 'Escape não fechou o editor aberto por F2')
    assert(await page.locator('.users-pending-indicator').count() === 0, 'F2 e Escape não deveriam criar indicador pendente')

    await fresh()
    await cell('user-001', 'name').click()
    await page.keyboard.type('X')
    const firstNameEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await waitFor(async () => (await firstNameEditor.inputValue()) === 'X', 'A primeira tecla imprimível do Nome não inicializou o editor nativo')
    await waitFor(async () => !(await save().isDisabled()), 'A primeira tecla imprimível do Nome deveria habilitar Salvar')
    await firstNameEditor.press('Escape')
    await waitFor(async () => !(await firstNameEditor.isVisible()), 'Escape não cancelou a edição iniciada pela primeira tecla do Nome')

    await fresh()
    await cell('user-001', 'name').click()
    await page.keyboard.type('E')
    const firstKeyEnterEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await waitFor(async () => (await firstKeyEnterEditor.inputValue()) === 'E', 'A primeira tecla do Nome não ficou disponível para Enter')
    await firstKeyEnterEditor.press('Enter')
    await waitFor(async () => !(await firstKeyEnterEditor.isVisible()), 'Enter não finalizou o editor iniciado pela primeira tecla do Nome')
    await waitFor(async () => (await cellText('user-001', 'name')).startsWith('E'), 'Enter não armazenou o valor iniciado pela primeira tecla do Nome')

    await fresh()
    await cell('user-001', 'name').click()
    await page.keyboard.type('X')
    const firstKeySaveEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await waitFor(async () => (await firstKeySaveEditor.inputValue()) === 'X', 'A primeira tecla não ficou disponível para o Save ativo')
    await clickSave('primeira tecla com editor ativo')
    await waitFor(() => page.getByText('Alterações salvas nesta sessão', { exact: true }).isVisible(), 'Save da primeira tecla não confirmou o baseline')
    assert((await cellText('user-001', 'name')).startsWith('X'), 'Save de primeira tecla não persistiu o Nome armazenado')
    await editText('user-001', 'name', 'Nome do usuário', 'Nome depois da primeira tecla')
    assert(await page.getByRole('button', { name: 'Salvar alterações', exact: true }).count() === 1, 'O comando pendente deveria manter o nome exato')
    assert(await button('Salvar alterações').getAttribute('aria-describedby') === 'users-save-description', 'A pendência deveria ser uma descrição acessível do comando')
    await clickDiscard('baseline da primeira tecla')
    assert((await cellText('user-001', 'name')).startsWith('X'), 'Discard não restaurou o novo baseline da primeira tecla')

    await fresh()
    await cell('user-001', 'salary').click()
    await page.keyboard.type('7')
    const firstSalaryEditor = page.getByRole('textbox', { name: 'Salário mensal em reais', exact: true })
    await waitFor(async () => (await firstSalaryEditor.inputValue()) === '7', 'A primeira tecla imprimível do Salário não inicializou o editor nativo')
    await waitFor(async () => !(await save().isDisabled()), 'A primeira tecla imprimível do Salário deveria habilitar Salvar')
    await firstSalaryEditor.press('Escape')
    await waitFor(async () => !(await firstSalaryEditor.isVisible()), 'Escape não cancelou a edição iniciada pela primeira tecla do Salário')

    await fresh()
    const transitionSourceCell = cell('user-001', 'name')
    const transitionDestinationCell = cell('user-002', 'name')
    const transitionSourceValue = await cellText('user-001', 'name')
    await transitionSourceCell.dblclick()
    await transitionDestinationCell.dblclick()
    const transitionEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await transitionEditor.fill(transitionSourceValue)
    await waitFor(async () => !(await save().isDisabled()), 'A entrada nativa após trocar rapidamente de célula não habilitou Salvar para a célula de destino')
    assert(await transitionEditor.isVisible(), 'A troca rápida de célula perdeu o editor de destino')
    await transitionEditor.press('Escape')
    await waitFor(async () => !(await transitionEditor.isVisible()), 'Escape não cancelou o editor após a troca rápida de célula')
    assert((await cellText('user-002', 'name')).includes('João Pedro dos Santos'), 'A entrada após a troca rápida alterou a linha errada')

    await fresh()
    await cell('user-001', 'name').dblclick()
    assert(await save().isDisabled(), 'Abrir sem alterar deve manter Salvar desabilitado')
    const nameEditor = page.getByRole('textbox', { name: 'Nome do usuário', exact: true })
    await nameEditor.fill('Nome confirmado')
    await waitFor(async () => !(await save().isDisabled()), 'O rascunho alterado deve habilitar Salvar')
    assert(await nameEditor.isVisible(), 'O rascunho deve continuar em edição antes de Salvar')
    await save().click()
    await waitFor(() => page.getByText('Alterações salvas nesta sessão', { exact: true }).isVisible(), 'Save não anunciou o baseline atualizado')
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Save perdeu a edição final do nome')
    await cell('user-001', 'name').click()
    await page.keyboard.press('Control+Z')
    await waitFor(async () => !(await save().isDisabled()), 'Undo após Save não marcou a planilha como pendente')
    await clickDiscard('undo após Save')
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard após Undo não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Discard não restaurou o baseline criado por Save')
    await editText('user-001', 'name', 'Nome do usuário', 'Nome temporário')
    assert(await page.locator('.users-pending-indicator').count() === 1, 'Uma edição confirmada deveria exibir o indicador pendente')
    const pendingDot = page.locator('.users-pending-indicator')
    const pendingDotGeometry = await pendingDot.evaluate((element) => {
      const parent = element.parentElement
      const dot = element.getBoundingClientRect()
      const button = parent?.getBoundingClientRect()
      return { parentTag: parent?.tagName, dot, button, text: parent?.textContent ?? '' }
    })
    assert(pendingDotGeometry.parentTag === 'BUTTON', 'O indicador pendente deveria pertencer ao botão Salvar')
    assert(pendingDotGeometry.button !== undefined && pendingDotGeometry.dot.left >= pendingDotGeometry.button.left && pendingDotGeometry.dot.right <= pendingDotGeometry.button.right, 'O indicador pendente deveria ficar dentro do botão Salvar')
    assert((await save().textContent())?.includes('Salvar alterações') === true, 'O indicador pendente deveria permanecer visível junto ao rótulo Salvar')
    assert(await save().getAttribute('aria-describedby') === 'users-save-description', 'O indicador pendente deveria ser a descrição acessível do comando Salvar')
    await clickDiscard('edição temporária')
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Discard não restaurou o último baseline salvo')

    await cell('user-001', 'name').dblclick()
    const discardedEditor = page.locator('input[aria-label="Nome do usuário"]')
    await discardedEditor.fill('Rascunho cancelado')
    await clickDiscard('editor ativo')
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard do editor ativo não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Discard do editor ativo perdeu o valor salvo')
    assert(await save().isDisabled(), 'Discard do editor ativo deveria deixar a planilha limpa')
    await cell('user-001', 'name').click()
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(120)
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Ctrl+Z após Discard reabriu histórico anterior')
    assert(await save().isDisabled(), 'Ctrl+Z após Discard não deveria marcar a planilha como pendente')
    await page.keyboard.press('Control+Y')
    await page.waitForTimeout(120)
    assert((await cellText('user-001', 'name')).includes('Nome confirmado'), 'Ctrl+Y após Discard alterou o valor salvo')
    assert(await save().isDisabled(), 'Ctrl+Y após Discard não deveria marcar a planilha como pendente')

    await fresh()
    const nameHeader = page.getByRole('columnheader', { name: 'Nome' })
    await nameHeader.click()
    await page.keyboard.press('Enter')
    await waitFor(async () => (await nameHeader.getAttribute('aria-sort')) === 'descending', 'A ordenação reversa não foi aplicada')
    assert(await row('user-002').isVisible(), 'user-002 deveria permanecer visível após ordenar')
    await editTextAndSave('user-002', 'salary', 'Salário mensal em reais', '6.321,75')
    assert((await cellText('user-002', 'salary')).includes('6.321,75'), 'Salário de user-002 não foi atualizado')
    assert(!(await cellText('user-001', 'salary')).includes('6.321,75'), 'A ordenação roteou a edição para outro usuário')

    await fresh()
    await nameHeader.click()
    await page.keyboard.press('Control+Enter')
    const filterInput = page.getByRole('textbox', { name: 'Valor do Filtro' })
    const savedNameBeforeInvalid = await cellText('user-001', 'name')
    const savedSalaryBeforeInvalid = await cellText('user-002', 'salary')
    await filterInput.fill('zzzz')
    await page.keyboard.press('Enter')
    await waitFor(async () => (await page.locator('.ag-row[row-id]:visible').count()) === 0, 'O filtro zzzz não exibiu o estado vazio real')
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'Filtrar não deveria alterar o contador de registros')
    const draftId = await addDraft()
    assert((await page.getByRole('columnheader', { name: 'Nome' }).getAttribute('aria-sort')) === 'none', 'Adicionar deveria limpar a ordenação')
    assert((await page.getByRole('textbox', { name: 'Valor do Filtro' }).count()) === 0, 'Adicionar deveria limpar o filtro')
    assert(await row(draftId).isVisible(), 'A nova linha filtrada não foi revelada')
    assert((await cellText('user-001', 'name')).startsWith(savedNameBeforeInvalid), 'A inserção filtrada alterou o Nome seed')
    assert((await cellText('user-002', 'salary')).startsWith(savedSalaryBeforeInvalid), 'A inserção filtrada alterou o Salário seed')
    assert((await page.getByRole('status').allTextContents()).join(' ').includes('Filtros e ordenação foram limpos'), 'A inserção filtrada não anunciou o reset de visualização')
    await clickSave('inserção filtrada')
    const errorSummary = page.locator('[aria-label="Resumo dos erros"]')
    await waitFor(() => errorSummary.isVisible(), 'Save inválido não revelou o resumo')
    const focused = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(focused.rowId === draftId && focused.columnId === 'name', 'Save inválido não focou a primeira célula inválida')
    assert((await errorSummary.textContent()).includes('Salário mensal'), 'Resumo acessível não identificou o campo inválido')
    assert((await cellText('user-001', 'name')).startsWith(savedNameBeforeInvalid), 'Save inválido alterou o baseline de Nome existente')
    assert((await cellText('user-002', 'salary')).startsWith(savedSalaryBeforeInvalid), 'Save inválido alterou o baseline de Salário existente')
    await clickDiscard('inserção filtrada inválida')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu a linha inválida')
    assert((await cellText('user-001', 'name')).startsWith(savedNameBeforeInvalid), 'Discard perdeu o Nome salvo antes do erro')
    assert((await cellText('user-002', 'salary')).startsWith(savedSalaryBeforeInvalid), 'Discard perdeu o Salário salvo antes do erro')
    await cell('user-001', 'name').click()
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(150)
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'Ctrl+Z reintroduziu uma linha descartada')

    await fresh()
    const namedDraftId = await addDraft()
    const namedDraftEditor = page.locator('input[aria-label="Nome do usuário"]')
    await namedDraftEditor.fill('Primeiro rascunho')
    await namedDraftEditor.press('Enter')
    await waitFor(async () => !(await namedDraftEditor.isVisible()), 'O nome do primeiro rascunho não foi finalizado')
    await waitFor(async () => (await cellText(namedDraftId, 'name')).includes('Primeiro rascunho'), 'O nome do primeiro rascunho não foi publicado')
    const normalEntrySummary = page.locator('[aria-label="Resumo dos erros"]')
    if (await normalEntrySummary.count() > 0) {
      const normalEntryText = (await normalEntrySummary.textContent()) ?? ''
      assert(!normalEntryText.includes('Data de nascimento') && !normalEntryText.includes('Salário mensal'), 'A entrada de Nome exibiu erros intocados')
    }
    const untouchedDraftId = await addDraft(20)
    assert(untouchedDraftId !== namedDraftId, 'Os dois rascunhos deveriam ter IDs distintos')
    if (await normalEntrySummary.count() > 0) {
      const untouchedSummaryText = (await normalEntrySummary.textContent()) ?? ''
      assert(!untouchedSummaryText.includes('Data de nascimento') && !untouchedSummaryText.includes('Salário mensal'), 'Editar outra linha exibiu erros do rascunho intocado')
    }
    await clickSave('dois rascunhos')
    await waitFor(() => normalEntrySummary.isVisible(), 'Save não revelou os erros completos dos rascunhos')
    const savedSummaryText = (await normalEntrySummary.textContent()) ?? ''
    assert(savedSummaryText.includes('Data de nascimento') && savedSummaryText.includes('Salário mensal'), 'Save não revelou os erros intocados')
    await clickDiscard('dois rascunhos')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu os rascunhos de validação')

    await fresh()
    const rejectedDraftId = await addDraft()
    await page.locator('input[aria-label="Nome do usuário"]').press('Escape')
    const combinedSummary = page.locator('[aria-label="Resumo dos erros"]')
    await clickSave('linha vazia antes da edição de data')
    await waitFor(() => combinedSummary.isVisible(), 'Save inicial não revelou os erros da linha vazia')
    await cell(rejectedDraftId, 'birthDate').dblclick()
    const rejectedDraftDate = page.locator('input[aria-label="Data de nascimento"]')
    await rejectedDraftDate.fill('31/02/1990')
    const rejectedDateDescriptions = await rejectedDraftDate.evaluate((input) => {
      const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
      return ids.map((id) => ({ id, text: document.getElementById(id)?.textContent ?? '' }))
    })
    assert(rejectedDateDescriptions.some(({ id, text }) => id === 'user-date-editor-error' && text.includes('não existe')), 'A data inválida não expôs a descrição específica do editor')
    assert(rejectedDateDescriptions.some(({ id, text }) => id !== 'user-date-editor-error' && text.includes('Informe uma data de nascimento válida.')), 'A data inválida perdeu o Alert do campo armazenado')
    await clickSave('rascunho de data inválida com linha vazia')
    await waitFor(() => combinedSummary.isVisible(), 'Save rejeitado não revelou os erros da linha vazia')
    const combinedText = (await combinedSummary.textContent()) ?? ''
    assert(combinedText.includes('Nome') && combinedText.includes('Salário mensal'), 'Save rejeitado não validou o restante da planilha')
    assert(await page.getByText('A edição não foi aplicada. Verifique o valor informado.', { exact: true }).isVisible(), 'Save rejeitado não reteve o feedback da edição')
    const combinedFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(combinedFocus.rowId === rejectedDraftId && combinedFocus.columnId === 'name', 'Save rejeitado não focou o primeiro erro armazenado')
    await clickDiscard('rascunho de data inválida com linha vazia')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não preservou o baseline após Save rejeitado')

    await fresh()
    const blankDraftA = await addDraft()
    const blankDraftB = await addDraft(20)
    assert(blankDraftA !== blankDraftB, 'Os rascunhos vazios deveriam ter IDs de domínio distintos')
    await clickSave('rascunhos vazios')
    const duplicateSummary = page.locator('[aria-label="Resumo dos erros"]')
    await waitFor(() => duplicateSummary.isVisible(), 'Save de dois rascunhos vazios não revelou o resumo')
    const duplicateItems = duplicateSummary.locator('li')
    const duplicateItemTexts = await duplicateItems.allTextContents()
    assert(duplicateItemTexts.some((text) => text.includes('Novo usuário (linha 19)')), 'O primeiro rascunho vazio não recebeu identificador de linha')
    assert(duplicateItemTexts.some((text) => text.includes('Novo usuário (linha 20)')), 'O segundo rascunho vazio não recebeu identificador de linha')
    const duplicateItemIds = await duplicateItems.evaluateAll((items) => items.map((item) => item.id))
    assert(new Set(duplicateItemIds).size === duplicateItemIds.length, 'Itens de erro dos rascunhos receberam IDs duplicados')
    const firstInvalidName = cell(blankDraftA, 'name')
    assert(await firstInvalidName.getAttribute('aria-invalid') === 'true', 'A primeira célula inválida não expôs aria-invalid=true')
    const firstDescriptionId = await firstInvalidName.getAttribute('aria-describedby')
    assert(firstDescriptionId !== null && await page.locator(`#${firstDescriptionId}`).isVisible(), 'A primeira célula inválida não apontou para uma descrição visível')
    const firstInvalidDate = cell(blankDraftA, 'birthDate')
    await firstInvalidDate.click()
    assert(await firstInvalidDate.getAttribute('aria-invalid') === 'true', 'A célula inválida subsequente não expôs aria-invalid=true')
    const dateDescriptionId = await firstInvalidDate.getAttribute('aria-describedby')
    assert(dateDescriptionId !== null && await page.locator(`#${dateDescriptionId}`).isVisible(), 'A célula inválida subsequente não apontou para uma descrição visível')
    const errorCountBeforeCorrection = await duplicateItems.count()
    const consoleErrorsBeforeCorrection = consoleErrors.length
    await firstInvalidName.dblclick()
    const invalidNameEditor = page.locator('input[aria-label="Nome do usuário"]')
    await waitFor(async () => await invalidNameEditor.isVisible(), 'Editor de Nome inválido não abriu')
    await waitFor(async () => (await firstInvalidName.getAttribute('aria-invalid')) === 'true', 'A célula inválida perdeu aria-invalid ao abrir o editor')
    const editingNameDescriptionId = await firstInvalidName.getAttribute('aria-describedby')
    assert(editingNameDescriptionId !== null && await page.locator(`#${editingNameDescriptionId}`).isVisible(), 'A célula inválida perdeu sua descrição visível em edição')
    assert(await invalidNameEditor.getAttribute('aria-invalid') === 'true', 'O editor de Nome inválido não expôs aria-invalid=true')
    assert(await invalidNameEditor.getAttribute('aria-describedby') === editingNameDescriptionId, 'O editor de Nome inválido não apontou para o Alert existente')
    await invalidNameEditor.fill('Rascunho corrigido')
    await invalidNameEditor.press('Enter')
    await waitFor(async () => !(await invalidNameEditor.isVisible()), 'A correção do Nome inválido não finalizou o editor')
    await waitFor(async () => (await cellText(blankDraftA, 'name')).includes('Rascunho corrigido'), 'A correção do Nome inválido não foi publicada')
    await waitFor(async () => (await firstInvalidName.getAttribute('aria-invalid')) === 'false', 'A correção não limpou aria-invalid da célula')
    assert((await firstInvalidName.getAttribute('aria-describedby')) === null, 'A correção deixou aria-describedby obsoleto')
    assert(await duplicateItems.count() === errorCountBeforeCorrection - 1, 'A correção não removeu apenas o erro resolvido')
    const correctedSummaryText = (await duplicateSummary.textContent()) ?? ''
    assert(!correctedSummaryText.includes('Rascunho corrigido · Nome'), 'O erro de Nome corrigido permaneceu no resumo')
    assert(correctedSummaryText.includes('Rascunho corrigido · Data de nascimento'), 'A correção removeu erros não relacionados da primeira linha')
    assert(correctedSummaryText.includes('Novo usuário (linha 20) · Nome'), 'A correção removeu o erro de Nome da segunda linha')
    assert(consoleErrors.length === consoleErrorsBeforeCorrection, 'A correção de um rascunho gerou erro de console')
    await clickDiscard('rascunhos vazios')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu os rascunhos duplicados')

    await fresh()
    const equalDraftA = await addDraft()
    const equalDraftB = await addDraft(20)
    await editText(equalDraftA, 'name', 'Nome do usuário', 'Nomes iguais')
    await editText(equalDraftB, 'name', 'Nome do usuário', 'Nomes iguais')
    await clickSave('rascunhos com nomes iguais')
    const equalSummary = page.locator('[aria-label="Resumo dos erros"]')
    await waitFor(() => equalSummary.isVisible(), 'Save de nomes iguais não revelou o resumo')
    const equalTexts = await equalSummary.locator('li').allTextContents()
    assert(equalTexts.some((text) => text.includes('Nomes iguais (linha 19)')), 'O primeiro nome igual não recebeu rótulo de linha')
    assert(equalTexts.some((text) => text.includes('Nomes iguais (linha 20)')), 'O segundo nome igual não recebeu rótulo de linha')
    const equalIds = await equalSummary.locator('li').evaluateAll((items) => items.map((item) => item.id))
    assert(new Set(equalIds).size === equalIds.length, 'Nomes iguais geraram IDs de erro duplicados')
    await clickDiscard('rascunhos com nomes iguais')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu os rascunhos com nomes iguais')

    await fresh()
    const copySourceA = cell('user-003', 'name')
    const copySourceB = cell('user-004', 'name')
    await copySourceA.click()
    await page.keyboard.down('Shift')
    await copySourceB.click()
    await page.keyboard.up('Shift')
    await page.keyboard.press('Control+C')
    const copiedRange = await page.evaluate(() => navigator.clipboard.readText())
    assert(copiedRange.includes('Conceição Nascimento') && copiedRange.includes('Vinícius Araújo'), 'Ctrl+C não copiou o intervalo selecionado')
    const copyDestinationA = cell('user-005', 'name')
    const copyDestinationB = cell('user-006', 'name')
    await copyDestinationA.click()
    await page.keyboard.down('Shift')
    await copyDestinationB.click()
    await page.keyboard.up('Shift')
    await page.keyboard.press('Control+V')
    await waitFor(async () => (await cellText('user-005', 'name')).includes('Conceição Nascimento'), 'Paste não publicou o primeiro intervalo copiado')
    assert((await cellText('user-006', 'name')).includes('Vinícius Araújo'), 'Paste não publicou o segundo intervalo copiado')
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'Copy/paste alterou a quantidade de linhas')

    await fresh()
    const salaryA = cell('user-003', 'salary')
    const salaryB = cell('user-004', 'salary')
    const originalB = await cellText('user-004', 'salary')
    await salaryA.click()
    await page.keyboard.down('Shift')
    await salaryB.click()
    await page.keyboard.up('Shift')
    await page.evaluate(() => navigator.clipboard.writeText('1.234,56\nabc'))
    await page.keyboard.press('Control+V')
    await waitFor(async () => (await cellText('user-003', 'salary')).includes('1.234,56'), 'Paste não aceitou o salário brasileiro')
    assert((await cellText('user-004', 'salary')).startsWith(originalB), 'Paste inválido alterou o destino rejeitado')
    assert((await page.getByRole('status').allTextContents()).join(' ').includes('Algumas células'), 'Paste misto não anunciou a rejeição')
    await salaryA.click()
    await page.evaluate(() => navigator.clipboard.writeText('2.222,22'))
    await page.keyboard.press('Control+V')
    await waitFor(async () => (await cellText('user-003', 'salary')).includes('2.222,22'), 'Paste válido após rejeição não publicou o salário')
    await waitFor(() => page.getByRole('status').allTextContents().then((texts) => texts.join(' ').includes('Operação aplicada nesta sessão.')), 'Paste válido não substituiu o feedback de rejeição')

    await fresh()
    const fillSource = cell('user-003', 'role')
    await fillSource.click()
    const handle = page.locator('[data-sbwb-handle="fill"]')
    const handleBox = await handle.boundingBox()
    const fillTarget = cell('user-004', 'role')
    const targetBox = await fillTarget.boundingBox()
    assert(handleBox !== null && targetBox !== null, 'Fill handle não foi renderizado')
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 6 })
    await page.mouse.up()
    await waitFor(async () => (await cellText('user-004', 'role')).includes('Visualizador'), 'Fill handle não copiou a célula')
    await waitFor(() => page.getByRole('status').allTextContents().then((texts) => texts.join(' ').includes('Operação aplicada nesta sessão.')), 'Fill válido não anunciou sucesso')

    const deleteCell = cell('user-003', 'salary')
    await deleteCell.click()
    await page.keyboard.press('Delete')
    await waitFor(async () => !(await cellText('user-003', 'salary')).includes('R$'), 'Delete não limpou o salário')
    await page.keyboard.press('Control+Z')
    await waitFor(async () => (await cellText('user-003', 'salary')).includes('3.750,00'), 'Undo não restaurou o salário')
    await page.keyboard.press('Control+Y')
    await waitFor(async () => !(await cellText('user-003', 'salary')).includes('R$'), 'Redo não refez o Delete')
    await editText('user-003', 'salary', 'Salário mensal em reais', '0')
    assert((await cellText('user-003', 'salary')).includes('0,00'), 'Zero deveria permanecer distinto de salário nulo')

    await fresh()
    await editRoleWithKeyboard('user-003')
    assert((await cellText('user-003', 'role')).includes('Editor'), 'Perfil não respondeu ao teclado')
    await cell('user-001', 'role').dblclick()
    const unchangedRoleEditor = page.locator('button[role="combobox"][aria-label="Perfil"]')
    await page.getByRole('option', { name: 'Administrador' }).click()
    await waitFor(async () => !(await unchangedRoleEditor.isVisible()), 'Escolher o perfil já selecionado não encerrou a edição')
    assert((await cellText('user-001', 'role')).includes('Administrador'), 'Escolher o perfil já selecionado alterou o valor')

    await fresh()
    const mouseRoleCell = cell('user-003', 'role')
    await mouseRoleCell.dblclick()
    const mouseRoleEditor = page.locator('button[role="combobox"][aria-label="Perfil"]')
    await assertEditorFitsCell('perfil', mouseRoleCell, mouseRoleEditor)
    await assertPopupFitsViewport('popup de perfil', page.locator('.user-role-editor__content'))
    await page.getByRole('option', { name: 'Administrador' }).click()
    await waitFor(async () => (await cellText('user-003', 'role')).includes('Administrador'), 'A seleção de perfil por mouse não publicou na linha estável')
    assert((await cellText('user-004', 'role')).includes('Editor'), 'A seleção de perfil por mouse alterou outra linha')
    const roleFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(roleFocus.rowId === 'user-003' && roleFocus.columnId === 'role', 'Commit de perfil não devolveu o foco à célula estável')

    await fresh()
    const tabRoleCell = cell('user-003', 'role')
    const tabRoleBefore = await cellText('user-003', 'role')
    await tabRoleCell.dblclick()
    const tabRoleOption = page.locator('.user-role-editor__content [role="option"]').first()
    await tabRoleOption.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Tab')
    await waitFor(async () => (await page.locator('.user-role-editor__content').count()) === 0, 'Tab no popup de Perfil não fechou o editor')
    const tabRoleFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert((await cellText('user-003', 'role')).startsWith(tabRoleBefore), 'Tab no popup de Perfil confirmou uma opção apenas destacada')
    assert(tabRoleFocus.rowId === 'user-003' && tabRoleFocus.columnId === 'birthDate', 'Tab no popup de Perfil não navegou para a próxima célula')

    await tabRoleCell.dblclick()
    const reverseRoleOption = page.locator('.user-role-editor__content [role="option"]').first()
    await reverseRoleOption.focus()
    await page.keyboard.press('Shift+Tab')
    await waitFor(async () => (await page.locator('.user-role-editor__content').count()) === 0, 'Shift+Tab no popup de Perfil não fechou o editor')
    const reverseRoleFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(reverseRoleFocus.rowId === 'user-003' && reverseRoleFocus.columnId === 'name', 'Shift+Tab no popup de Perfil não navegou para a célula anterior')

    await tabRoleCell.dblclick()
    const escapeRoleOption = page.locator('.user-role-editor__content [role="option"]').first()
    await escapeRoleOption.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Escape')
    await waitFor(async () => (await page.locator('.user-role-editor__content').count()) === 0, 'Escape no popup de Perfil não fechou o editor')
    assert((await cellText('user-003', 'role')).startsWith(tabRoleBefore), 'Escape confirmou uma opção de Perfil apenas destacada')

    await cell('user-001', 'birthDate').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('1')
    const firstCharacterDate = page.locator('input[aria-label="Data de nascimento"]')
    await waitFor(async () => (await firstCharacterDate.inputValue()) === '1', 'A primeira tecla não chegou ao editor de data')
    await page.keyboard.type('5021990')
    await waitFor(async () => (await firstCharacterDate.inputValue()) === '15/02/1990', 'A sequência iniciada pelo eventKey perdeu ou duplicou o primeiro dígito')
    await firstCharacterDate.press('Enter')
    await waitFor(async () => (await cellText('user-001', 'birthDate')).includes('15/02/1990'), 'A edição iniciada pelo primeiro caractere não publicou a data completa')

    await fresh()
    const escapeDateCell = cell('user-003', 'birthDate')
    await escapeDateCell.dblclick()
    const escapeDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await escapeDateInput.press('Control+A')
    await page.keyboard.type('15021990')
    await escapeDateInput.press('Escape')
    await waitFor(async () => !(await escapeDateInput.isVisible()), 'Escape não cancelou o editor de data com rascunho válido')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('08/12/1979'), 'Escape publicou uma data válida que deveria ser cancelada')
    const escapeFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(escapeFocus.rowId === 'user-003' && escapeFocus.columnId === 'birthDate', 'Escape não devolveu o foco à célula de data cancelada')

    await escapeDateCell.dblclick()
    const popupEscapeInput = page.locator('input[aria-label="Data de nascimento"]')
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await waitFor(() => page.locator('[role=dialog]').isVisible(), 'O popup de data não abriu antes do Escape')
    await page.keyboard.press('Escape')
    await waitFor(async () => !(await popupEscapeInput.isVisible()), 'Escape no popup não cancelou o editor de data')
    assert((await cellText('user-003', 'birthDate')).includes('08/12/1979'), 'Escape no popup publicou uma data não escolhida')
    const popupEscapeFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(popupEscapeFocus.rowId === 'user-003' && popupEscapeFocus.columnId === 'birthDate', 'Escape no popup não devolveu o foco à célula de data')

    await cell('user-003', 'birthDate').dblclick()
    const sequentialDate = page.locator('input[aria-label="Data de nascimento"]')
    await waitFor(async () => await sequentialDate.isVisible() && await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Data de nascimento'), 'O editor sequencial de data não ficou pronto para receber teclado')
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())))
    await sequentialDate.press('Control+A')
    await page.keyboard.type('29022000')
    await waitFor(async () => (await sequentialDate.inputValue()) === '29/02/2000', 'A máscara de data não acompanhou a digitação sequencial')
    await sequentialDate.press('Enter')
    await waitFor(async () => !(await sequentialDate.isVisible()), 'A data sequencial não foi finalizada')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('29/02/2000'), 'Data não respondeu ao teclado')

    await fresh()
    const tabDateCell = cell('user-003', 'birthDate')
    await tabDateCell.dblclick()
    const tabDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await tabDateInput.press('Control+A')
    await page.keyboard.type('15021990')
    await waitFor(async () => (await tabDateInput.inputValue()) === '15/02/1990', 'A máscara não expôs o valor mais recente antes do Tab')
    await tabDateInput.press('Tab')
    await waitFor(async () => !(await tabDateInput.isVisible()), 'Tab não finalizou a edição de data')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('15/02/1990'), 'Tab não publicou o rascunho de data mais recente')
    const tabFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(tabFocus.rowId === 'user-003' && tabFocus.columnId === 'salary', 'Tab não devolveu o foco à próxima célula da mesma linha')

    await fresh()
    const bulkSource = cell('user-003', 'birthDate')
    const bulkTarget = cell('user-004', 'birthDate')
    await bulkSource.click()
    await page.keyboard.down('Shift')
    await bulkTarget.click()
    await page.keyboard.up('Shift')
    await waitFor(() => page.getByRole('status').allTextContents().then((texts) => texts.join(' ').includes('2 células selecionadas')), 'Ctrl+Enter não manteve o intervalo de datas selecionado')
    await page.keyboard.press('F2')
    const bulkDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await bulkDateInput.press('Control+A')
    await page.keyboard.type('15021990')
    await waitFor(async () => (await bulkDateInput.inputValue()) === '15/02/1990', 'Ctrl+Enter não recebeu o rascunho bruto mais recente')
    await bulkDateInput.press('Control+Enter')
    await waitFor(async () => !(await bulkDateInput.isVisible()), 'Ctrl+Enter não finalizou o editor de data ativo')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('15/02/1990'), 'Ctrl+Enter não publicou o rascunho na primeira célula selecionada')
    await waitFor(async () => (await cellText('user-004', 'birthDate')).includes('15/02/1990'), 'Ctrl+Enter não aplicou o rascunho registrado à segunda célula selecionada')

    await fresh()
    await cell('user-001', 'birthDate').dblclick()
    const maxDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    const maxCalendar = page.locator('.user-date-editor__content')
    const maxNavigation = await page.evaluate(() => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(now.getDate() + 1)
      const format = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        tomorrowMonth: tomorrow.getMonth(),
        tomorrowLabel: format.format(tomorrow),
      }
    })
    await maxCalendar.getByRole('combobox', { name: 'Selecionar ano' }).selectOption(String(maxNavigation.year))
    await maxCalendar.getByRole('combobox', { name: 'Selecionar mês' }).selectOption(String(maxNavigation.month))
    const todayButton = maxCalendar.locator('[data-today="true"] button')
    assert(await todayButton.count() === 1, 'O calendário não expôs o dia atual pela API pública de modificadores')
    assert((await todayButton.getAttribute('aria-label'))?.startsWith('Hoje, ') === true, 'O nome acessível do dia atual não foi localizado em português')
    const nextMonth = maxCalendar.getByRole('button', { name: 'Próximo mês' })
    const tomorrowButton = maxCalendar.locator(`button[aria-label="${maxNavigation.tomorrowLabel}"]`)
    if (maxNavigation.tomorrowMonth === maxNavigation.month) {
      assert(await tomorrowButton.isDisabled(), 'A data posterior a hoje não foi desabilitada pelo maxDate da feature')
    } else {
      assert(await tomorrowButton.count() === 0, 'O calendário exibiu um botão de amanhã fora do mês corrente')
    }
    assert(await maxDateInput.inputValue() === '14/03/1988', 'Navegar até o mês limite alterou a data armazenada')
    assert(await nextMonth.isDisabled(), 'A navegação para um mês além do maxDate não foi bloqueada')
    await maxDateInput.press('Escape')
    await waitFor(async () => !(await maxDateInput.isVisible()), 'Escape não fechou o calendário no limite maxDate')

    await fresh()
    await cell('user-003', 'birthDate').dblclick()
    const calendarDate = page.locator('input[aria-label="Data de nascimento"]')
    await calendarDate.press('Control+A')
    await page.keyboard.type('29022000')
    await waitFor(async () => (await calendarDate.inputValue()) === '29/02/2000', 'A preparação do calendário não manteve a data de referência')
    await assertEditorFitsCell('data', cell('user-003', 'birthDate'), page.locator('.app-datepicker__group'))
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await assertPopupFitsViewport('popup de data desktop', page.locator('.user-date-editor__content'))
    await page.getByRole('button', { name: /^segunda-feira, 14 de fevereiro de 2000/ }).click()
    await waitFor(async () => !(await calendarDate.isVisible()), 'A seleção de calendário não finalizou a data')
    assert((await cellText('user-003', 'birthDate')).includes('14/02/2000'), 'A seleção de calendário não publicou o dia escolhido')
    const calendarFocus = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(calendarFocus.rowId === 'user-003' && calendarFocus.columnId === 'birthDate', 'Commit de calendário não devolveu o foco à célula de data')

    await fresh()
    await cell('user-003', 'birthDate').dblclick()
    const dateEditor = page.locator('input[aria-label="Data de nascimento"]')
    await dateEditor.fill('31/02/2000')
    assert((await dateEditor.getAttribute('aria-describedby'))?.includes('user-date-editor-error') === true, 'Erro de data não teve descrição acessível')
    await dateEditor.press('Escape')

    await fresh()
    const rejectedDateCell = cell('user-003', 'birthDate')
    const rejectedDateBefore = await cellText('user-003', 'birthDate')
    await rejectedDateCell.dblclick()
    const rejectedDateEditor = page.locator('input[aria-label="Data de nascimento"]')
    await rejectedDateEditor.fill('31/02/1990')
    await waitFor(async () => !(await save().isDisabled()), 'Uma data inválida em edição deveria habilitar Salvar para permitir feedback')
    await clickSave('data inválida em edição')
    await waitFor(() => page.getByText('A edição não foi aplicada. Verifique o valor informado.', { exact: true }).isVisible(), 'Save de data inválida deveria anunciar a rejeição da edição')
    assert(!(await page.getByRole('status').allTextContents()).some((text) => text.includes('Alterações salvas nesta sessão')), 'Save de data inválida não poderia anunciar sucesso')
    assert((await cellText('user-003', 'birthDate')).includes(rejectedDateBefore), 'A data inválida não poderia substituir o valor aceito')
    assert(await save().isDisabled(), 'A rejeição da data deveria deixar a planilha sem trabalho pendente')
    await rejectedDateCell.dblclick()
    const correctedDateEditor = page.locator('input[aria-label="Data de nascimento"]')
    await correctedDateEditor.fill('15/02/1990')
    await correctedDateEditor.press('Enter')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('15/02/1990'), 'A correção válida não foi publicada após a rejeição')
    await clickSave('correção de data válida')
    await waitFor(() => page.getByText('Alterações salvas nesta sessão', { exact: true }).isVisible(), 'A correção válida não poderia ser bloqueada pela rejeição anterior')

    await fresh()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(200)
    await assertGridFitsCard('narrow')
    const narrow = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      gridOverflow: [...document.querySelectorAll('.ag-body-horizontal-scroll-viewport')].some((node) => node.scrollWidth > node.clientWidth),
    }))
    assert(!narrow.documentOverflow, 'A página estreita tem overflow horizontal global')
    assert(narrow.gridOverflow, 'A grade estreita perdeu sua rolagem horizontal')
    await cell('user-001', 'birthDate').dblclick()
    const narrowDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await assertEditorFitsCell('data estreita', cell('user-001', 'birthDate'), page.locator('.app-datepicker__group'))
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await page.waitForTimeout(800)
    const narrowPopupBox = await page.locator('.user-date-editor__content').boundingBox()
    const narrowCardBox = await page.locator('.user-card').boundingBox()
    assert(narrowPopupBox !== null && narrowCardBox !== null, 'Popup estreito não permitiu medir viewport e card')
    await assertPopupFitsViewport('popup de data estreito', page.locator('.user-date-editor__content'))
    assert(narrowPopupBox.x >= 0 && narrowPopupBox.x + narrowPopupBox.width <= 391, 'Popup estreito excedeu o viewport de 390px')
    assert(narrowPopupBox.x + narrowPopupBox.width > narrowCardBox.x + narrowCardBox.width, 'Popup estreito não escapou do clipping do card')
    await page.screenshot({ path: '/tmp/users-date-popup-mobile-settled.png' })
    await narrowDateInput.press('Escape')
    await waitFor(async () => !(await narrowDateInput.isVisible()), 'Escape não fechou o popup estreito')
    assert(await button('Descartar').isVisible() && await button('Salvar alterações').isVisible(), 'As ações do rodapé deveriam permanecer visíveis no viewport estreito')
    const narrowFooter = await page.evaluate(() => [...document.querySelectorAll('.users-footer span, .users-footer kbd, .users-footer button')]
      .filter((element) => (element.textContent ?? '').trim().length > 0)
      .map((element) => ({ text: element.textContent?.trim(), width: element.getBoundingClientRect().width, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) })))
    assert(narrowFooter.every((item) => item.width > 0 && item.fontSize >= 12), 'Os rótulos e atalhos do rodapé estreito deveriam permanecer legíveis')
    const narrowColors = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const card = document.querySelector('.user-card')
      const cardStyle = card === null ? null : getComputedStyle(card)
      const saveButton = document.querySelector('.users-footer-actions button:last-child')
      const saveStyle = saveButton === null ? null : getComputedStyle(saveButton)
      return {
        bodyBackground: body.backgroundColor,
        cardBorder: cardStyle?.borderTopColor ?? '',
        saveBackground: saveStyle?.backgroundColor ?? '',
      }
    })
    assert(narrowColors.bodyBackground !== 'rgba(0, 0, 0, 0)' && narrowColors.cardBorder !== '', 'A tela estreita deveria expor cores semânticas do DS')
    await page.screenshot({ path: '/tmp/cadastro-usuarios-narrow.png', fullPage: true })
    await button('Novo usuário').click()
    await waitFor(() => page.getByText('19 registros', { exact: true }).isVisible(), 'O cenário de erro estreito não adicionou a linha')
    const narrowPendingDot = page.locator('.users-pending-indicator')
    await waitFor(async () => await narrowPendingDot.isVisible(), 'A edição pendente estreita não exibiu o indicador')
    const narrowPendingDotGeometry = await narrowPendingDot.evaluate((element) => {
      const parent = element.parentElement
      const dot = element.getBoundingClientRect()
      const button = parent?.getBoundingClientRect()
      return { parentTag: parent?.tagName, dot, button, text: parent?.textContent ?? '' }
    })
    assert(narrowPendingDotGeometry.parentTag === 'BUTTON', 'No viewport estreito, o indicador deveria pertencer ao botão Salvar')
    assert(narrowPendingDotGeometry.button !== undefined && narrowPendingDotGeometry.dot.left >= narrowPendingDotGeometry.button.left && narrowPendingDotGeometry.dot.right <= narrowPendingDotGeometry.button.right && narrowPendingDotGeometry.dot.top >= narrowPendingDotGeometry.button.top && narrowPendingDotGeometry.dot.bottom <= narrowPendingDotGeometry.button.bottom, 'No viewport estreito, o indicador deveria ficar dentro dos limites do botão Salvar')
    await clickSave('estado de erro estreito')
    await waitFor(() => page.locator('[aria-label="Resumo dos erros"]').isVisible(), 'O cenário de erro estreito não revelou o Alert')
    const narrowErrorMetrics = await page.evaluate(() => {
      const alert = document.querySelector('[aria-label="Resumo dos erros"]')?.getBoundingClientRect()
      const card = document.querySelector('.user-card')?.getBoundingClientRect()
      const feedback = document.querySelector('.users-session-copy [role="status"]')
      const probe = document.createElement('span')
      probe.style.color = 'var(--color-red-600)'
      document.body.append(probe)
      const metrics = {
        alert,
        card,
        feedbackColor: feedback === null ? '' : getComputedStyle(feedback).color,
        errorTokenColor: getComputedStyle(probe).color,
        errorToken: getComputedStyle(document.documentElement).getPropertyValue('--color-red-600').trim(),
      }
      probe.remove()
      return metrics
    })
    assert(narrowErrorMetrics.alert !== undefined && narrowErrorMetrics.card !== undefined, 'O cenário de erro estreito não permitiu medir Alert e card')
    assert(narrowErrorMetrics.alert.left >= narrowErrorMetrics.card.left - 1 && narrowErrorMetrics.alert.right <= narrowErrorMetrics.card.right + 1, 'O Alert estreito excedeu os limites horizontais do card')
    assert(narrowErrorMetrics.errorToken.length > 0 && narrowErrorMetrics.feedbackColor === narrowErrorMetrics.errorTokenColor, 'O feedback de erro não usou a cor semântica real do DS')
    await page.screenshot({ path: '/tmp/cadastro-usuarios-error.png', fullPage: true })
    await clickDiscard('estado de erro estreito')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'O cenário de erro estreito não restaurou as linhas')

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('http://127.0.0.1:5187/')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Reload não restaurou os dados seed')
    assert(await cellText('user-001', 'name').then((text) => text.includes('Ana Luísa Ferreira')), 'Reload não restaurou o seed')
    const finalStorage = await page.evaluate(() => JSON.stringify({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
    }))
    assert(finalStorage === initialStorage, 'A aplicação escreveu em browser storage')
    assert(externalRequests.length === 0, `A aplicação realizou requests externos: ${externalRequests.join(', ')}`)
    assert(consoleErrors.length === 0, `O navegador registrou erros: ${consoleErrors.join(' | ')}`)
    await page.screenshot({ path: '/tmp/cadastro-usuarios-desktop.png', fullPage: true })
    console.log('Cadastro de Usuários browser regression: PASS')
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  }

  if (failures.length > 0) throw new Error(failures.join('\n'))
  return { ok: true, screenshots: ['/tmp/cadastro-usuarios-desktop.png', '/tmp/cadastro-usuarios-narrow.png', '/tmp/cadastro-usuarios-error.png'] }
}
