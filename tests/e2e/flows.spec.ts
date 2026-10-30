import { test, expect } from '@playwright/test'
import { addEmerald, emit, fillCheckout, login } from './helpers'

test('catálogo: filtros combinados, ordenação e paginação vivem na URL e sobrevivem ao histórico', async ({ page }) => {
  await page.goto('/'); await expect(page.getByTestId('nft-grid').getByRole('listitem').first()).toBeVisible()
  await page.getByRole('button', { name: 'Próxima' }).click(); await expect(page).toHaveURL(/page=2/)
  await page.getByLabel('Ordenar por:').selectOption('price-desc'); await expect(page).toHaveURL(/sort=price-desc/); await expect(page).not.toHaveURL(/page=/) // filtro reinicia paginação
  await page.getByLabel('Violet Nomads', { exact: false }).check(); await expect(page).toHaveURL(/collections=Violet/)
  await page.goBack(); await expect(page).not.toHaveURL(/collections=/); await page.reload(); await expect(page).toHaveURL(/sort=price-desc/)
})

test('busca sem resultado mostra estado vazio', async ({ page }) => {
  await page.goto('/?q=zzzz'); await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
})

test('detalhe: NFT inexistente', async ({ page }) => {
  await page.goto('/nft/nao-existe'); await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('rota privada redireciona ao login e retorna ao fluxo anterior', async ({ page }) => {
  await page.goto('/profile'); await expect(page).toHaveURL(/\/login\?redirect/)
  await page.getByLabel('E-mail').fill('ana@kurio.test'); await page.getByLabel('Senha').fill('Kurio@123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/profile/)
})

test('compra completa: catálogo → carrinho → pagamento → recibo confirmado', async ({ page }) => {
  await login(page); await addEmerald(page, 2); await page.goto('/cart')
  await page.getByLabel('Código promocional').fill('KURIO10'); await page.getByRole('button', { name: 'Aplicar' }).click(); await expect(page.getByText('KURIO10 aplicado')).toBeVisible()
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click(); await fillCheckout(page)
  await page.getByRole('button', { name: /Confirmar compra/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Seus NFTs agora estão na sua carteira', { timeout: 15_000 })
  await expect(page.getByRole('dialog')).toContainText('Emerald Ape #042')
})

test('tempo real: preço muda no checkout e a confirmação exige nova revisão', async ({ page }) => {
  await login(page); await addEmerald(page, 1); await page.goto('/checkout'); await fillCheckout(page)
  await expect(page.getByRole('button', { name: /Confirmar compra/ })).toBeVisible()
  await emit(page, { type: 'price', nftId: 'emerald-ape-042', price: '2.50' })
  await expect(page.getByText('O valor mudou desde a sua revisão')).toBeVisible()
  await expect(page.getByRole('button', { name: /Confirmar compra/ })).toHaveCount(0)
})

test('eventos duplicados e antigos não regridem o estado', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042'); await expect(page.getByTestId('price')).toHaveText('1.19 ETH')
  await emit(page, { type: 'price', nftId: 'emerald-ape-042', price: '2.50' }); await expect(page.getByTestId('price')).toHaveText('2.50 ETH')
  await emit(page, { type: 'stale', nftId: 'emerald-ape-042' }); await page.waitForTimeout(500); await expect(page.getByTestId('price')).toHaveText('2.50 ETH')
})

test('carrinho do visitante é preservado ao autenticar', async ({ page }) => {
  await addEmerald(page, 1); await login(page); await page.goto('/cart'); await expect(page.getByText('Emerald Ape #042')).toBeVisible()
})

test('perfil: erro de validação da senha atual', async ({ page }) => {
  await login(page); await page.goto('/profile'); await page.getByLabel('Senha atual').fill('errada'); await page.getByLabel('Nova senha', { exact: true }).fill('Nova@1234'); await page.getByLabel('Confirmar nova senha').fill('Nova@1234')
  await page.getByRole('button', { name: 'Alterar senha' }).click(); await expect(page.getByText('Senha atual incorreta.')).toBeVisible()
})
