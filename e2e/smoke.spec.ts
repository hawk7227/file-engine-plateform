import { test, expect } from '@playwright/test'
import { assertNoErrors, assertNotBlank } from './helpers/test-utils'

// Public pages (no auth required)
const publicPages = [
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/signup', name: 'Signup' },
]

for (const p of publicPages) {
  test(`${p.name} (${p.path}) loads without errors`, async ({ page }) => {
    const response = await page.goto(p.path)
    expect(response?.status()).toBeLessThan(400)
    await assertNotBlank(page)
    await assertNoErrors(page)
  })
}

// API health checks
const apiRoutes = [
  '/api/status',
]

for (const route of apiRoutes) {
  test(`API ${route} responds`, async ({ request }) => {
    const response = await request.get(route)
    expect(response.status()).toBeLessThan(500)
  })
}
