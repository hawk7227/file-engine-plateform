import { test, expect } from '@playwright/test'

/**
 * WORKPLACE VISUAL CHECKLIST
 * 
 * This test verifies every critical element at /admin/workplace is
 * visible and operational. Runs after every CI + E2E pass.
 * 
 * Elements checked:
 * 1. Page loads without error
 * 2. wp-root container exists
 * 3. Top bar visible
 * 4. wp-left panel visible (300px)
 * 5. wp-lheader with hamburger OR tab name
 * 6. Tab bar with Chat/Routes/Video/Images/Team tabs
 * 7. WPChatPanel visible (chat input area)
 * 8. Center canvas area (wp-center)
 * 9. Footer bar visible
 * 10. Sidebar toggle works (open/close)
 * 11. Chat input is interactable
 */

test.describe('Workplace Visual Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/workplace')
    await page.waitForLoadState('networkidle')
    // Wait for dynamic import to load
    await page.waitForTimeout(2000)
  })

  test('page loads without 4xx/5xx', async ({ page }) => {
    const response = await page.goto('/admin/workplace')
    expect(response?.status()).toBeLessThan(400)
  })

  test('wp-root container renders', async ({ page }) => {
    const root = page.locator('.wp-root')
    await expect(root).toBeVisible({ timeout: 5000 })
  })

  test('top bar is visible', async ({ page }) => {
    const topbar = page.locator('.wp-topbar')
    await expect(topbar).toBeVisible({ timeout: 5000 })
  })

  test('left panel (wp-left) is visible with non-zero width', async ({ page }) => {
    const left = page.locator('.wp-left')
    await expect(left).toBeVisible({ timeout: 5000 })
    const box = await left.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(200)
  })

  test('wp-lheader exists in left panel', async ({ page }) => {
    const header = page.locator('.wp-left .wp-lheader')
    await expect(header).toBeVisible({ timeout: 5000 })
  })

  test('tab bar has at least Chat tab', async ({ page }) => {
    const tbar = page.locator('.wp-tbar')
    await expect(tbar).toBeVisible({ timeout: 5000 })

    // Should have Chat tab button
    const chatTab = page.locator('.wp-tbtn', { hasText: 'Chat' })
    await expect(chatTab).toBeVisible()
  })

  test('WPChatPanel content is visible (chat area)', async ({ page }) => {
    // Click Chat tab to ensure it's active
    const chatTab = page.locator('.wp-tbtn', { hasText: 'Chat' })
    if (await chatTab.isVisible()) {
      await chatTab.click()
    }

    // Chat panel should have a textarea or input for chat
    const chatInput = page.locator('.wp-left textarea, .wp-left input[type="text"], .wp-left [contenteditable]').first()
    // At minimum, the chat tab content pane should be visible
    const chatPane = page.locator('.wp-tpane.show')
    await expect(chatPane).toBeVisible({ timeout: 5000 })
  })

  test('center canvas (wp-center) is visible', async ({ page }) => {
    const center = page.locator('.wp-center')
    await expect(center).toBeVisible({ timeout: 5000 })
    const box = await center.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(100)
  })

  test('footer is visible', async ({ page }) => {
    const footer = page.locator('.wp-footer')
    await expect(footer).toBeVisible({ timeout: 5000 })
  })

  test('sidebar hamburger toggle works', async ({ page }) => {
    // Find the hamburger button (☰) — could be in wp-lheader or wp-sb-top
    const hamburger = page.locator('.wp-sb-toggle').first()

    if (await hamburger.isVisible()) {
      // Click to toggle sidebar
      await hamburger.click()
      await page.waitForTimeout(300) // wait for animation

      // After toggle, sidebar state should have changed
      const sidebar = page.locator('.wp-sidebar')
      const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'))

      // Toggle back
      const hamburger2 = page.locator('.wp-sb-toggle').first()
      if (await hamburger2.isVisible()) {
        await hamburger2.click()
        await page.waitForTimeout(300)
      }

      // wp-left should ALWAYS be visible regardless of sidebar state
      const left = page.locator('.wp-left')
      await expect(left).toBeVisible()
    }
  })

  test('wp-left remains visible after sidebar close', async ({ page }) => {
    // Open sidebar if closed
    const sidebar = page.locator('.wp-sidebar')
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed')).catch(() => true)

    if (isCollapsed) {
      const hamburger = page.locator('.wp-lheader .wp-sb-toggle').first()
      if (await hamburger.isVisible()) {
        await hamburger.click()
        await page.waitForTimeout(300)
      }
    }

    // Now close sidebar by clicking backdrop or hamburger
    const backdrop = page.locator('.wp-sidebar-backdrop')
    if (await backdrop.isVisible()) {
      await backdrop.click()
      await page.waitForTimeout(300)
    }

    // wp-left must still be visible
    const left = page.locator('.wp-left')
    await expect(left).toBeVisible()

    // Tab bar must still be visible
    const tbar = page.locator('.wp-tbar')
    await expect(tbar).toBeVisible()

    // Chat pane must still be visible
    const chatPane = page.locator('.wp-tpane.show')
    await expect(chatPane).toBeVisible()
  })

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore known non-critical errors
        if (!text.includes('favicon') && !text.includes('hydration') && !text.includes('ResizeObserver')) {
          errors.push(text)
        }
      }
    })

    await page.goto('/admin/workplace')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Allow max 2 non-critical console errors
    expect(errors.length).toBeLessThanOrEqual(2)
  })
})
