import { test, expect } from '@playwright/test'

test.describe('API Routes', () => {
  test('GET /api/status does not 500', async ({ request }) => {
    const res = await request.get('/api/status')
    expect(res.status()).toBeLessThan(500)
  })

  test('GET /api/admin/permissions requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/permissions')
    // Should return 401 (no auth) not 500 (crash)
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/permissions requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/permissions', {
      data: { feature: 'test' }
    })
    expect(res.status()).toBe(401)
  })
})
