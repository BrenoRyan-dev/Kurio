import { expect, type Page } from '@playwright/test'
export const ADDR = `0x${'a'.repeat(40)}`
export async function login(page: Page, email = 'ana@kurio.test') {
  await page.goto('/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}
export const emit = (page: Page, body: object) => page.evaluate((b) => fetch('/__mock/emit', { method: 'POST', body: JSON.stringify(b) }), body)
export async function addEmerald(page: Page, qty = 2) {
  await page.goto('/nft/emerald-ape-042'); await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  for (let i = 1; i < qty; i++) await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Adicionado' })).toBeVisible()
}
export async function fillCheckout(page: Page) {
  await page.getByLabel('Rede', { exact: false }).first().selectOption('Ethereum'); await page.getByLabel('Tipo de carteira').selectOption('MetaMask')
  await page.getByLabel('Endereço da carteira').fill(ADDR); await page.getByRole('button', { name: 'Conectar carteira' }).click(); await expect(page.getByText('Carteira conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
}
