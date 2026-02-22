import { Page, expect } from '@playwright/test'

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * Assert no error boundaries or crash screens
 */
export async function assertNoErrors(page: Page) {
  await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  await expect(page.locator('text=Application error')).not.toBeVisible()
  await expect(page.locator('text=500')).not.toBeVisible()
}

/**
 * Assert page is not blank
 */
export async function assertNotBlank(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text.trim().length).toBeGreaterThan(10)
}
