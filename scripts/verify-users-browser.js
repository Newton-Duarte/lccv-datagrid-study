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
  const save = () => button('Salvar alterações')
  const discard = () => button('Descartar')

  const fresh = async () => {
    await page.goto('http://127.0.0.1:5187/')
    knownRowIds = new Set(seedIds)
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'A tela inicial não carregou')
  }

  const exerciseSharedControls = async () => {
    await page.goto('http://127.0.0.1:5187/tests/browser/app-controls.html')
    const dateInput = page.getByRole('textbox', { name: 'Data controlada' })
    const dateOutput = page.getByTestId('controlled-date-output')
    await waitFor(async () => (await dateOutput.textContent()) === '1988-03-14', 'Fixture não iniciou com a data ISO esperada')
    assert(await dateInput.inputValue() === '14/03/1988', 'Fixture não exibiu a data inicial em pt-BR')

    await button('Limpar data externa').click()
    await waitFor(async () => (await dateOutput.textContent()) === '', 'Limpeza externa não atualizou o valor ISO')
    assert(await dateInput.inputValue() === '', 'Limpeza externa não limpou o input visível')

    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await page.getByRole('button', { name: 'segunda-feira, 14 de março de 1988' }).click()
    await waitFor(async () => (await dateOutput.textContent()) === '1988-03-14', 'Seleção do calendário não atualizou o valor ISO')
    assert(await dateInput.inputValue() === '14/03/1988', 'Seleção do calendário não atualizou o input visível')
    await waitFor(async () => (await page.locator('[role=dialog]').count()) === 0, 'Seleção do calendário não fechou o popup')

    await button('Limpar data externa').click()
    await button('Restaurar data externa').click()
    assert(await dateOutput.textContent() === '1988-03-14', 'Restauro externo não recuperou o valor ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '14/03/1988', 'Restauro externo não sincronizou o input visível')
    await dateInput.click()
    await dateInput.press('Control+A')
    await page.keyboard.type('1')
    assert(await dateInput.inputValue() === '1', 'Rascunho parcial do fixture não foi mantido antes do rerender')
    assert(await dateOutput.textContent() === '1988-03-14', 'Rascunho parcial do fixture alterou o ISO controlado')
    await button('Forçar rerender independente').click()
    await waitFor(async () => (await page.getByTestId('fixture-rerender-version').textContent()) === '1', 'Fixture não realizou o rerender independente')
    assert(await dateInput.inputValue() === '1', 'Rerender externo apagou o rascunho parcial do fixture')
    assert(await dateOutput.textContent() === '1988-03-14', 'Rerender externo alterou o ISO sem uma conversão válida')
    await button('Restaurar data externa').click()
    await waitFor(async () => (await dateInput.inputValue()) === '14/03/1988', 'Fixture não restaurou o valor após o rascunho parcial')
    await dateInput.click()
    await dateInput.press('Control+A')
    await dateInput.press('Backspace')
    await waitFor(async () => (await dateOutput.textContent()) === '', 'Limpeza digitada não atualizou o valor ISO')
    await waitFor(async () => (await dateInput.inputValue()) === '', 'Limpeza digitada não limpou o input visível')

    const select = page.getByRole('combobox', { name: 'Seleção genérica' })
    const selectOutput = page.getByTestId('controlled-select-output')
    await select.click()
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
    await waitFor(async () => (await cellText(id, column)).includes(expected), `A edição de ${label} não foi publicada`)
    await waitFor(() => page.getByRole('status').allTextContents().then((texts) => texts.join(' ').includes('Operação aplicada nesta sessão.')), `A edição de ${label} não anunciou sucesso`)
  }

  const editTextAndSave = async (id, column, label, value) => {
    await cell(id, column).dblclick()
    const editor = page.locator(`input[aria-label="${label}"]`)
    await editor.fill(value)
    assert(await editor.isVisible(), `O editor ${label} deveria permanecer ativo antes de Save`)
    await save().click()
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
    assert(await discard().isDisabled(), 'Descartar deveria começar desabilitado')
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'O contador inicial deveria ser 18 registros')
    for (const heading of ['Nome', 'Perfil', 'Data de nascimento', 'Salário mensal (R$)']) {
      assert(await page.getByRole('columnheader', { name: heading }).isVisible(), `Cabeçalho ausente: ${heading}`)
    }
    assert((await page.getByRole('columnheader', { name: 'Ações' }).count()) === 0, 'A grade não pode ter coluna Ações')

    await editTextAndSave('user-001', 'name', 'Nome do usuário', 'Ana Luísa Ferreira Revisada')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Save perdeu a edição final do nome')
    await cell('user-001', 'name').click()
    await page.keyboard.press('Control+Z')
    await waitFor(async () => !(await save().isDisabled()), 'Undo após Save não marcou a planilha como pendente')
    await discard().click()
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard após Undo não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Discard não restaurou o baseline criado por Save')
    await editText('user-001', 'name', 'Nome do usuário', 'Nome temporário')
    await discard().click()
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Discard não restaurou o último baseline salvo')

    await cell('user-001', 'name').dblclick()
    const discardedEditor = page.locator('input[aria-label="Nome do usuário"]')
    await discardedEditor.fill('Rascunho cancelado')
    await discard().click()
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard do editor ativo não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Discard do editor ativo perdeu o valor salvo')
    assert(await save().isDisabled(), 'Discard do editor ativo deveria deixar a planilha limpa')
    await cell('user-001', 'name').click()
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(120)
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Ctrl+Z após Discard reabriu histórico anterior')
    assert(await save().isDisabled(), 'Ctrl+Z após Discard não deveria marcar a planilha como pendente')
    await page.keyboard.press('Control+Y')
    await page.waitForTimeout(120)
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Ctrl+Y após Discard alterou o valor salvo')
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
    await save().click()
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
    await discard().click()
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
    await save().click()
    await waitFor(() => normalEntrySummary.isVisible(), 'Save não revelou os erros completos dos rascunhos')
    const savedSummaryText = (await normalEntrySummary.textContent()) ?? ''
    assert(savedSummaryText.includes('Data de nascimento') && savedSummaryText.includes('Salário mensal'), 'Save não revelou os erros intocados')
    await discard().click()
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu os rascunhos de validação')

    await fresh()
    const blankDraftA = await addDraft()
    const blankDraftB = await addDraft(20)
    assert(blankDraftA !== blankDraftB, 'Os rascunhos vazios deveriam ter IDs de domínio distintos')
    await save().click()
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
    await editText(blankDraftA, 'name', 'Nome do usuário', 'Rascunho corrigido')
    await waitFor(async () => (await firstInvalidName.getAttribute('aria-invalid')) === 'false', 'A correção não limpou aria-invalid da célula')
    assert((await firstInvalidName.getAttribute('aria-describedby')) === null, 'A correção deixou aria-describedby obsoleto')
    assert(await duplicateItems.count() === errorCountBeforeCorrection - 1, 'A correção não removeu apenas o erro resolvido')
    const correctedSummaryText = (await duplicateSummary.textContent()) ?? ''
    assert(!correctedSummaryText.includes('Rascunho corrigido · Nome'), 'O erro de Nome corrigido permaneceu no resumo')
    assert(correctedSummaryText.includes('Rascunho corrigido · Data de nascimento'), 'A correção removeu erros não relacionados da primeira linha')
    assert(correctedSummaryText.includes('Novo usuário (linha 20) · Nome'), 'A correção removeu o erro de Nome da segunda linha')
    assert(consoleErrors.length === consoleErrorsBeforeCorrection, 'A correção de um rascunho gerou erro de console')
    await discard().click()
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu os rascunhos duplicados')

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

    await cell('user-001', 'birthDate').click()
    await page.keyboard.type('1')
    const firstCharacterDate = page.locator('input[aria-label="Data de nascimento"]')
    await waitFor(async () => (await firstCharacterDate.inputValue()) === '1', 'A primeira tecla não chegou ao editor de data')
    await firstCharacterDate.press('Escape')

    await cell('user-003', 'birthDate').dblclick()
    const sequentialDate = page.locator('input[aria-label="Data de nascimento"]')
    await sequentialDate.press('Control+A')
    await page.keyboard.type('29022000')
    assert(await sequentialDate.inputValue() === '29/02/2000', 'A máscara de data não acompanhou a digitação sequencial')
    await sequentialDate.press('Enter')
    await waitFor(async () => !(await sequentialDate.isVisible()), 'A data sequencial não foi finalizada')
    await waitFor(async () => (await cellText('user-003', 'birthDate')).includes('29/02/2000'), 'Data não respondeu ao teclado')

    await fresh()
    const tabDateCell = cell('user-003', 'birthDate')
    await tabDateCell.dblclick()
    const tabDateInput = page.locator('input[aria-label="Data de nascimento"]')
    await tabDateInput.press('Control+A')
    await page.keyboard.type('15021990')
    assert(await tabDateInput.inputValue() === '15/02/1990', 'A máscara não expôs o valor mais recente antes do Tab')
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
    assert(await bulkDateInput.inputValue() === '15/02/1990', 'Ctrl+Enter não recebeu o rascunho bruto mais recente')
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
        months: (now.getFullYear() - 1988) * 12 + now.getMonth() - 2,
        tomorrowLabel: format.format(tomorrow),
      }
    })
    const nextMonth = maxCalendar.getByRole('button', { name: 'Próximo mês' })
    for (let month = 0; month < maxNavigation.months; month += 1) await nextMonth.click()
    const tomorrowButton = maxCalendar.locator(`button[aria-label="${maxNavigation.tomorrowLabel}"]`)
    assert(await tomorrowButton.isDisabled(), 'A data posterior a hoje não foi desabilitada pelo maxDate da feature')
    assert(await maxDateInput.inputValue() === '14/03/1988', 'Navegar até o mês limite alterou a data armazenada')
    await nextMonth.click()
    const futureMonthDays = maxCalendar.locator('button[aria-label*=" de "]')
    const futureDaysDisabled = await futureMonthDays.evaluateAll((buttons) => {
      const dayButtons = buttons.filter((button) => !button.getAttribute('aria-label')?.includes('Mês'))
      return dayButtons.length > 0 && dayButtons.every((button) => button.disabled)
    })
    assert(futureDaysDisabled, 'A navegação para o mês futuro expôs dias selecionáveis além do maxDate')
    await maxDateInput.press('Escape')
    await waitFor(async () => !(await maxDateInput.isVisible()), 'Escape não fechou o calendário no limite maxDate')

    await fresh()
    await cell('user-003', 'birthDate').dblclick()
    const calendarDate = page.locator('input[aria-label="Data de nascimento"]')
    await calendarDate.press('Control+A')
    await page.keyboard.type('29022000')
    assert(await calendarDate.inputValue() === '29/02/2000', 'A preparação do calendário não manteve a data de referência')
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await page.getByRole('button', { name: 'segunda-feira, 14 de fevereiro de 2000' }).click()
    await waitFor(async () => !(await calendarDate.isVisible()), 'A seleção de calendário não finalizou a data')
    assert((await cellText('user-003', 'birthDate')).includes('14/02/2000'), 'A seleção de calendário não publicou o dia escolhido')

    await fresh()
    await cell('user-003', 'birthDate').dblclick()
    const dateEditor = page.locator('input[aria-label="Data de nascimento"]')
    await dateEditor.fill('31/02/2000')
    assert((await dateEditor.getAttribute('aria-describedby'))?.includes('user-date-editor-error') === true, 'Erro de data não teve descrição acessível')
    await dateEditor.press('Escape')

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
    await page.screenshot({ path: '/tmp/cadastro-usuarios-narrow.png', fullPage: true })

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
  return { ok: true, screenshots: ['/tmp/cadastro-usuarios-desktop.png', '/tmp/cadastro-usuarios-narrow.png'] }
}
