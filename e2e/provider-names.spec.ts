import { test, expect } from '@playwright/test'

const BANNED_NAMES = ['Claude', 'GPT', 'OpenAI', 'Anthropic', 'Gemini', 'Copilot', 'ChatGPT']

test.describe('White-Label Provider Name Safeguard', () => {
  test('dashboard page contains no provider names', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.textContent('body')
    if (!bodyText) return

    for (const name of BANNED_NAMES) {
      // Allow in admin-only contexts, check main UI
      const regex = new RegExp(`\\b${name}\\b`, 'i')
      // Get all visible text (excluding hidden elements)
      const visibleText = await page.evaluate(() => {
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let text = ''
        while (walk.nextNode()) {
          const el = walk.currentNode.parentElement
          if (el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') {
            text += walk.currentNode.textContent + ' '
          }
        }
        return text
      })

      // Should not contain provider names in visible UI
      expect(regex.test(visibleText), `Found "${name}" in visible dashboard text`).toBe(false)
    }
  })

  test('model selector shows only white-label names', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check model selector buttons exist with correct labels
    const modelButtons = page.locator('button:has-text("Auto"), button:has-text("Fast"), button:has-text("Pro"), button:has-text("Premium")')
    const count = await modelButtons.count()
    expect(count).toBeGreaterThanOrEqual(4)

    // Verify no raw model names appear
    const allButtonTexts = await page.locator('button').allTextContents()
    const joined = allButtonTexts.join(' ')
    for (const name of ['claude', 'gpt-4', 'sonnet', 'opus', 'haiku', 'o1']) {
      expect(joined.toLowerCase()).not.toContain(name)
    }
  })
})
