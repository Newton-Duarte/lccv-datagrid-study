async (page) => {
  const failures = []
  const seedIds = new Set(Array.from({ length: 18 }, (_, index) => `user-${String(index + 1).padStart(3, '0')}`))
  const externalRequests = []

  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith('http://127.0.0.1:5187/') && !url.startsWith('http://127.0.0.1:5187')) {
      externalRequests.push(`${request.method()} ${url}`)
    }
  })

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
  const row = (id) => page.locator(`.ag-row[row-id="${id}"]`)
  const cell = (id, column) => row(id).locator(`[col-id="${column}"]`)
  const normalized = (value) => value.replace(/\s+/g, ' ').trim()
  const cellText = async (id, column) => normalized((await cell(id, column).textContent()) ?? '')
  const save = () => button('Salvar alterações')
  const discard = () => button('Descartar')

  const fresh = async () => {
    await page.goto('http://127.0.0.1:5187/')
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'A tela inicial não carregou')
  }

  const editText = async (id, column, label, value) => {
    await cell(id, column).dblclick()
    const editor = page.locator(`input[aria-label="${label}"]`)
    await editor.fill(value)
    await editor.press('Enter')
    await waitFor(async () => !(await editor.isVisible()), `O editor ${label} não foi finalizado`)
    const expected = column === 'numericValue' && !value.includes(',') ? `${value},00` : value
    await waitFor(async () => (await cellText(id, column)).includes(expected), `A edição de ${label} não foi publicada`)
  }

  const editRoleWithKeyboard = async (id) => {
    await cell(id, 'role').dblclick()
    const editor = page.locator('select[aria-label="Perfil / Cargo"]')
    await editor.press('ArrowUp')
    await editor.press('Enter')
    await waitFor(async () => !(await editor.isVisible()), 'O editor de perfil não foi finalizado')
    await waitFor(async () => (await cellText(id, 'role')).includes('Editor'), 'A edição de perfil não foi publicada')
  }

  const addDraft = async () => {
    await button('Novo usuário').click()
    await waitFor(() => page.getByText('19 registros', { exact: true }).isVisible(), 'A nova linha não alterou o contador')
    const draftId = await page.locator('.ag-row[row-id]').evaluateAll((nodes, ids) => {
      const known = new Set(ids)
      return nodes.map((node) => node.getAttribute('row-id')).find((id) => id !== null && !known.has(id)) ?? null
    }, [...seedIds])
    assert(draftId !== null, 'Não foi possível encontrar o ID estável da nova linha')
    await waitFor(() => page.locator('input[aria-label="Nome do usuário"]').isVisible(), 'A nova linha não abriu o editor de Nome')
    return draftId
  }

  try {
    await fresh()
    const initialStorage = await page.evaluate(() => JSON.stringify({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
    }))

    assert(await button('Salvar alterações').isDisabled(), 'Salvar deveria começar desabilitado')
    assert(await discard().isDisabled(), 'Descartar deveria começar desabilitado')
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'O contador inicial deveria ser 18 registros')
    for (const heading of ['Nome', 'Perfil / Cargo', 'Data de nascimento', 'Salário mensal (R$)']) {
      assert(await page.getByRole('columnheader', { name: heading }).isVisible(), `Cabeçalho ausente: ${heading}`)
    }
    assert((await page.getByRole('columnheader', { name: 'Ações' }).count()) === 0, 'A grade não pode ter coluna Ações')

    await editText('user-001', 'name', 'Nome do usuário', 'Ana Luísa Ferreira Revisada')
    await save().click()
    await waitFor(() => page.getByText('Alterações salvas nesta sessão', { exact: true }).isVisible(), 'Save não anunciou sucesso')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Save perdeu a edição final do nome')
    assert(await save().isDisabled(), 'Save deveria ficar limpo após confirmar')
    await editText('user-001', 'name', 'Nome do usuário', 'Nome temporário')
    await discard().click()
    await waitFor(() => page.getByText('Alterações descartadas', { exact: true }).isVisible(), 'Discard não anunciou restauração')
    assert((await cellText('user-001', 'name')).includes('Ana Luísa Ferreira Revisada'), 'Discard não restaurou o último baseline salvo')

    await fresh()
    const nameHeader = page.getByRole('columnheader', { name: 'Nome' })
    await nameHeader.click()
    await page.keyboard.press('Enter')
    await waitFor(async () => (await nameHeader.getAttribute('aria-sort')) === 'descending', 'A ordenação reversa não foi aplicada')
    assert(await row('user-002').isVisible(), 'user-002 deveria permanecer visível após ordenar')
    await editText('user-002', 'numericValue', 'Salário mensal em reais', '6.321,75')
    assert((await cellText('user-002', 'numericValue')).includes('6.321,75'), 'Salário de user-002 não foi atualizado')
    assert(!(await cellText('user-001', 'numericValue')).includes('6.321,75'), 'A ordenação roteou a edição para outro usuário')
    await discard().click()

    await fresh()
    await nameHeader.click()
    await page.keyboard.press('Control+Enter')
    const filterInput = page.getByRole('textbox', { name: 'Valor do Filtro' })
    await filterInput.fill('zzzz')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    const draftId = await addDraft()
    assert((await page.getByRole('columnheader', { name: 'Nome' }).getAttribute('aria-sort')) === 'none', 'Adicionar deveria limpar a ordenação')
    assert((await page.getByRole('textbox', { name: 'Valor do Filtro' }).count()) === 0, 'Adicionar deveria limpar o filtro')
    assert(await row(draftId).isVisible(), 'A nova linha filtrada não foi revelada')
    await save().click()
    const errorSummary = page.locator('[aria-label="Resumo dos erros"]')
    await waitFor(() => errorSummary.isVisible(), 'Save inválido não revelou o resumo')
    const focused = await page.evaluate(() => ({
      rowId: document.activeElement?.closest('.ag-row')?.getAttribute('row-id'),
      columnId: document.activeElement?.closest('.ag-cell')?.getAttribute('col-id'),
    }))
    assert(focused.rowId === draftId && focused.columnId === 'name', 'Save inválido não focou a primeira célula inválida')
    assert((await errorSummary.textContent()).includes('Salário mensal'), 'Resumo acessível não identificou o campo inválido')
    await discard().click()
    await waitFor(() => page.getByText('18 registros', { exact: true }).isVisible(), 'Discard não removeu a linha inválida')
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(150)
    assert(await page.getByText('18 registros', { exact: true }).isVisible(), 'Ctrl+Z reintroduziu uma linha descartada')

    await fresh()
    const salaryA = cell('user-003', 'numericValue')
    const salaryB = cell('user-004', 'numericValue')
    const originalB = await cellText('user-004', 'numericValue')
    await salaryA.click()
    await page.keyboard.down('Shift')
    await salaryB.click()
    await page.keyboard.up('Shift')
    await page.evaluate(() => navigator.clipboard.writeText('1.234,56\nabc'))
    await page.keyboard.press('Control+V')
    await waitFor(async () => (await cellText('user-003', 'numericValue')).includes('1.234,56'), 'Paste não aceitou o salário brasileiro')
    assert((await cellText('user-004', 'numericValue')).startsWith(originalB), 'Paste inválido alterou o destino rejeitado')
    assert((await page.getByRole('status').allTextContents()).join(' ').includes('Algumas células'), 'Paste misto não anunciou a rejeição')

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

    const deleteCell = cell('user-003', 'numericValue')
    await deleteCell.click()
    await page.keyboard.press('Delete')
    await waitFor(async () => !(await cellText('user-003', 'numericValue')).includes('R$'), 'Delete não limpou o salário')
    await page.keyboard.press('Control+Z')
    await waitFor(async () => (await cellText('user-003', 'numericValue')).includes('3.750,00'), 'Undo não restaurou o salário')
    await page.keyboard.press('Control+Y')
    await waitFor(async () => !(await cellText('user-003', 'numericValue')).includes('R$'), 'Redo não refez o Delete')
    await editText('user-003', 'numericValue', 'Salário mensal em reais', '0')
    assert((await cellText('user-003', 'numericValue')).includes('0,00'), 'Zero deveria permanecer distinto de salário nulo')

    await fresh()
    await editRoleWithKeyboard('user-003')
    assert((await cellText('user-003', 'role')).includes('Editor'), 'Perfil não respondeu ao teclado')
    await editText('user-003', 'birthDate', 'Data de nascimento', '29/02/2000')
    assert((await cellText('user-003', 'birthDate')).includes('29/02/2000'), 'Data não respondeu ao teclado')
    await cell('user-003', 'birthDate').dblclick()
    const dateEditor = page.locator('input[aria-label="Data de nascimento"]')
    await dateEditor.fill('31/02/2000')
    assert((await dateEditor.getAttribute('aria-describedby'))?.includes('user-date-editor-error') === true, 'Erro de data não teve descrição acessível')
    await dateEditor.press('Escape')

    await fresh()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(200)
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
    await page.screenshot({ path: '/tmp/cadastro-usuarios-desktop.png', fullPage: true })
    console.log('Cadastro de Usuários browser regression: PASS')
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  }

  if (failures.length > 0) throw new Error(failures.join('\n'))
  return { ok: true, screenshots: ['/tmp/cadastro-usuarios-desktop.png', '/tmp/cadastro-usuarios-narrow.png'] }
}
