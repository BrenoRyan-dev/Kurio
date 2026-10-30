import { test, expect } from '@playwright/test'
import { addEmerald, login } from './helpers'
// Gere as baselines com: npx playwright test visual --update-snapshots
test('visual: início', async ({ page }) => { await page.goto('/'); await expect(page.getByTestId('nft-grid').getByRole('listitem').first()).toBeVisible(); await expect(page).toHaveScreenshot('home.png', { fullPage: false }) })
test('visual: detalhe', async ({ page }) => { await page.goto('/nft/emerald-ape-042'); await expect(page.getByTestId('price')).toBeVisible(); await expect(page).toHaveScreenshot('detail.png') })
test('visual: carrinho', async ({ page }) => { await login(page); await addEmerald(page, 2); await page.goto('/cart'); await expect(page.getByTestId('total')).toBeVisible(); await expect(page).toHaveScreenshot('cart.png') })
