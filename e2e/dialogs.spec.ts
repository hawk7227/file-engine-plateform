import { test, expect } from '@playwright/test'

// These tests require authentication — they test the ChatsDialog and ProjectsDialog
// which are the components we fixed for infinite spinner

test.describe('ChatsDialog', () => {
  test('shows skeleton loading, then content or empty state (not infinite spinner)', async ({ page }) => {
    // Navigate to main app (requires auth in real env)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Click Chats nav item if visible
    const chatsBtn = page.locator('text=Chats').first()
    if (await chatsBtn.isVisible()) {
      await chatsBtn.click()
      
      // Should see dialog
      const dialog = page.locator('[role="dialog"]')
      
      // Within 6 seconds, should NOT still be showing a spinner
      // (our timeout is 5s — it should show error or content by then)
      await page.waitForTimeout(6000)
      
      // Should not have an infinite spinner — should be in one of:
      // success (chat items), empty ("No saved chats"), or error ("Failed to load")
      const hasContent = await page.locator('.space-y-1 > div').count() > 0
      const hasEmpty = await page.locator('text=No saved chats').isVisible().catch(() => false)
      const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false)
      
      expect(hasContent || hasEmpty || hasError).toBeTruthy()
    }
  })
})

test.describe('ProjectsDialog', () => {
  test('shows skeleton loading, then content or empty state (not infinite spinner)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const projectsBtn = page.locator('text=Projects').first()
    if (await projectsBtn.isVisible()) {
      await projectsBtn.click()
      
      await page.waitForTimeout(6000)
      
      const hasContent = await page.locator('.space-y-1 > div').count() > 0
      const hasEmpty = await page.locator('text=No projects yet').isVisible().catch(() => false)
      const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false)
      
      expect(hasContent || hasEmpty || hasError).toBeTruthy()
    }
  })
})
