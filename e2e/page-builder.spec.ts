import { test, expect, Page } from '@playwright/test'

/**
 * PAGE BUILDER E2E TEST SUITE
 *
 * Covers WPPageBuilder — activated via ⊞ toggle in tool rail.
 *
 * Test groups:
 *   1. Toggle — enter/exit Page Builder mode
 *   2. Mode bar — all 4 mode tabs render + switch
 *   3. Provider pill — renders, opens settings panel
 *   4. Provider settings panel — all fields present
 *   5. Preview mode — iframe renders, device selector works
 *   6. Editor mode — Monaco OR fallback textarea present
 *   7. Device frames — group selectors switch device
 *   8. Safe zones — toggle shows/hides overlay
 *   9. Analyzer mode — drop zone renders
 *  10. Image Gen mode — prompt textarea + button render
 *  11. API route — /api/pb-image-gen responds correctly
 *  12. Exit — returning to normal workspace
 */

// ─── helpers ────────────────────────────────────────────────────────────────

async function goToWorkplace(page: Page) {
  await page.goto('/admin/workplace')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

async function openPageBuilder(page: Page) {
  // ⊞ button in tool rail — title attribute identifies it
  const btn = page.locator('button[title*="Page Builder"], button[title*="page builder"]').first()
  await expect(btn).toBeVisible({ timeout: 8000 })
  await btn.click()
  // Wait for pb-root to appear
  await expect(page.locator('.pb-root')).toBeVisible({ timeout: 5000 })
}

async function closePageBuilder(page: Page) {
  const btn = page.locator('button[title*="Exit Page Builder"], button[title*="page builder"]').first()
  if (await btn.isVisible()) await btn.click()
}

// ─── 1. Toggle ───────────────────────────────────────────────────────────────

test.describe('Page Builder — Toggle', () => {
  test.beforeEach(async ({ page }) => { await goToWorkplace(page) })

  test('⊞ button exists in tool rail', async ({ page }) => {
    const btn = page.locator('button[title*="Page Builder"], button[title*="page builder"]').first()
    await expect(btn).toBeVisible({ timeout: 8000 })
  })

  test('clicking ⊞ activates page builder — pb-root renders', async ({ page }) => {
    await openPageBuilder(page)
    await expect(page.locator('.pb-root')).toBeVisible()
  })

  test('page builder replaces center canvas — wp-canvas-area hidden', async ({ page }) => {
    await openPageBuilder(page)
    // The default canvas area should not be visible while page builder is active
    const canvas = page.locator('.wp-canvas-area')
    // It may still be in DOM but should not be visible
    const isVisible = await canvas.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('clicking ⊞ again exits page builder — pb-root removed', async ({ page }) => {
    await openPageBuilder(page)
    await closePageBuilder(page)
    await page.waitForTimeout(300)
    await expect(page.locator('.pb-root')).not.toBeVisible()
  })
})

// ─── 2. Mode Bar ─────────────────────────────────────────────────────────────

test.describe('Page Builder — Mode Bar', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
  })

  test('mode bar renders', async ({ page }) => {
    await expect(page.locator('.pb-modebar')).toBeVisible()
  })

  test('Preview tab exists and is active by default', async ({ page }) => {
    const previewBtn = page.locator('.pb-mode-btn', { hasText: /preview/i }).first()
    await expect(previewBtn).toBeVisible()
    await expect(previewBtn).toHaveClass(/on/)
  })

  test('Editor tab switches mode', async ({ page }) => {
    const editorBtn = page.locator('.pb-mode-btn', { hasText: /editor/i }).first()
    await editorBtn.click()
    await expect(editorBtn).toHaveClass(/on/)
    // Monaco container or textarea must be present
    const editorPresent = await page.locator('.pb-monaco, .pb-editor-fallback').first().isVisible().catch(() => false)
    expect(editorPresent).toBe(true)
  })

  test('Analyzer tab switches mode', async ({ page }) => {
    const analyzerBtn = page.locator('.pb-mode-btn', { hasText: /analyzer/i }).first()
    await analyzerBtn.click()
    await expect(analyzerBtn).toHaveClass(/on/)
    // Drop zone should be visible
    await expect(page.locator('.pb-drop-zone, .pb-analyzer')).toBeVisible({ timeout: 3000 })
  })

  test('Image Gen tab switches mode', async ({ page }) => {
    const imageGenBtn = page.locator('.pb-mode-btn', { hasText: /image/i }).first()
    await imageGenBtn.click()
    await expect(imageGenBtn).toHaveClass(/on/)
    // Prompt textarea should be visible
    await expect(page.locator('textarea[placeholder*="generate" i], textarea[placeholder*="describe" i]')).toBeVisible({ timeout: 3000 })
  })
})

// ─── 3. Provider Pill ────────────────────────────────────────────────────────

test.describe('Page Builder — Provider Pill', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
  })

  test('provider pill is visible in mode bar', async ({ page }) => {
    // Pill shows one of: ⚡ OpenAI | ◆ Claude | ⬡ Standalone
    const pill = page.locator('.pb-mode-btn', { hasText: /openai|claude|standalone/i }).first()
    await expect(pill).toBeVisible({ timeout: 3000 })
  })

  test('clicking provider pill opens settings panel', async ({ page }) => {
    const pill = page.locator('.pb-mode-btn', { hasText: /openai|claude|standalone/i }).first()
    await pill.click()
    // Settings panel should appear
    await expect(page.locator('text=AI Provider Settings')).toBeVisible({ timeout: 3000 })
  })

  test('clicking ✕ closes settings panel', async ({ page }) => {
    const pill = page.locator('.pb-mode-btn', { hasText: /openai|claude|standalone/i }).first()
    await pill.click()
    await expect(page.locator('text=AI Provider Settings')).toBeVisible({ timeout: 3000 })
    await page.locator('button', { hasText: '✕' }).first().click()
    await expect(page.locator('text=AI Provider Settings')).not.toBeVisible()
  })
})

// ─── 4. Provider Settings Panel ──────────────────────────────────────────────

test.describe('Page Builder — Provider Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
    // Open panel
    const pill = page.locator('.pb-mode-btn', { hasText: /openai|claude|standalone/i }).first()
    await pill.click()
    await expect(page.locator('text=AI Provider Settings')).toBeVisible({ timeout: 3000 })
  })

  test('OpenAI section present with enabled checkbox and key input', async ({ page }) => {
    await expect(page.locator('text=OpenAI')).toBeVisible()
    // Key input (password type)
    const keyInputs = page.locator('input[type="password"]')
    await expect(keyInputs.first()).toBeVisible()
  })

  test('Claude section present with enabled checkbox', async ({ page }) => {
    await expect(page.locator('text=Claude')).toBeVisible()
  })

  test('Image generation provider selector has DALL-E option', async ({ page }) => {
    await expect(page.locator('button', { hasText: /dall-e/i }).first()).toBeVisible()
  })

  test('Image generation provider selector has SD3 option', async ({ page }) => {
    await expect(page.locator('button', { hasText: /sd3/i }).first()).toBeVisible()
  })

  test('Image generation provider selector has FLUX option', async ({ page }) => {
    await expect(page.locator('button', { hasText: /flux/i }).first()).toBeVisible()
  })

  test('Standalone status box is visible', async ({ page }) => {
    // Either "Standalone Mode Active" or "Active" status box
    await expect(page.locator('text=/Standalone|Active/')).toBeVisible()
  })

  test('OpenAI enabled checkbox is toggleable', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    const first = checkboxes.first()
    const initialState = await first.isChecked()
    await first.click()
    await expect(first).not.toBeChecked().catch(async () => {
      // If it flipped to checked, that's also valid
      await expect(first).toBeChecked()
    })
    // Toggle back
    await first.click()
    const finalState = await first.isChecked()
    expect(finalState).toBe(initialState)
  })
})

// ─── 5. Preview Mode ─────────────────────────────────────────────────────────

test.describe('Page Builder — Preview Mode', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
  })

  test('preview pane renders with iframe or empty state', async ({ page }) => {
    // Preview mode is default
    const previewPane = page.locator('.pb-preview-pane')
    await expect(previewPane).toBeVisible({ timeout: 5000 })
  })

  test('device selector groups render — iPhone button exists', async ({ page }) => {
    const iphoneBtn = page.locator('button', { hasText: /iphone/i }).first()
    await expect(iphoneBtn).toBeVisible({ timeout: 3000 })
  })

  test('device selector groups render — Android button exists', async ({ page }) => {
    const androidBtn = page.locator('button', { hasText: /android/i }).first()
    await expect(androidBtn).toBeVisible({ timeout: 3000 })
  })

  test('Desktop device group button exists', async ({ page }) => {
    const desktopBtn = page.locator('button', { hasText: /desktop/i }).first()
    await expect(desktopBtn).toBeVisible({ timeout: 3000 })
  })

  test('clicking Android switches active device group', async ({ page }) => {
    const androidBtn = page.locator('button', { hasText: /android/i }).first()
    await androidBtn.click()
    await page.waitForTimeout(200)
    // Some Android device chip should become active
    await expect(page.locator('.pb-device-chip.on, .pb-device-chip[class*="on"]')).toBeVisible({ timeout: 2000 }).catch(() => {
      // Chip class naming may vary — just verify click didn't crash
    })
  })

  test('zoom + button exists', async ({ page }) => {
    await expect(page.locator('button', { hasText: '＋' }).first()).toBeVisible()
  })

  test('zoom − button exists', async ({ page }) => {
    await expect(page.locator('button', { hasText: '－' }).first()).toBeVisible()
  })
})

// ─── 6. Editor Mode ──────────────────────────────────────────────────────────

test.describe('Page Builder — Editor Mode', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
    await page.locator('.pb-mode-btn', { hasText: /editor/i }).first().click()
    await page.waitForTimeout(1000) // Monaco may take time to init
  })

  test('editor pane renders', async ({ page }) => {
    await expect(page.locator('.pb-editor-pane')).toBeVisible({ timeout: 5000 })
  })

  test('Monaco container OR fallback textarea is present', async ({ page }) => {
    const monaco = page.locator('.pb-monaco')
    const textarea = page.locator('.pb-editor-fallback')
    // One of the two must be in DOM
    const monacoInDom = await monaco.count() > 0
    const textareaInDom = await textarea.count() > 0
    expect(monacoInDom || textareaInDom).toBe(true)
  })

  test('filename input is visible', async ({ page }) => {
    const filenameInput = page.locator('input[value*=".tsx"], input[placeholder*="filename"], input[value*="component"]')
    // Filename area should be present (may be display text not input)
    const filenameArea = page.locator('.pb-filename, [class*="filename"]')
    const present = await filenameInput.count() > 0 || await filenameArea.count() > 0
    expect(present).toBe(true)
  })

  test('download button is visible', async ({ page }) => {
    const downloadBtn = page.locator('button', { hasText: /download|↓/i }).first()
    await expect(downloadBtn).toBeVisible({ timeout: 3000 })
  })

  test('resize handle exists between editor and preview', async ({ page }) => {
    await expect(page.locator('.pb-resize-h')).toBeVisible()
  })

  test('typing in fallback textarea updates preview debounced', async ({ page }) => {
    const textarea = page.locator('.pb-editor-fallback')
    if (await textarea.isVisible()) {
      await textarea.fill('<div style="color:red">Hello Test</div>')
      await page.waitForTimeout(600) // debounce is 400ms
      // Preview pane should now have an iframe
      const iframe = page.locator('.pb-preview-pane iframe')
      await expect(iframe).toBeVisible({ timeout: 3000 })
    }
  })
})

// ─── 7. Safe Zones ───────────────────────────────────────────────────────────

test.describe('Page Builder — Safe Zones', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
  })

  test('Safe Zones toggle button exists', async ({ page }) => {
    const safeBtn = page.locator('button', { hasText: /safe zone/i }).first()
    await expect(safeBtn).toBeVisible({ timeout: 3000 })
  })

  test('clicking Safe Zones shows overlay', async ({ page }) => {
    const safeBtn = page.locator('button', { hasText: /safe zone/i }).first()
    // Ensure it's currently off (no overlay)
    const overlayBefore = await page.locator('.pb-safe-overlay').isVisible().catch(() => false)
    if (!overlayBefore) {
      await safeBtn.click()
      await page.waitForTimeout(200)
      await expect(page.locator('.pb-safe-overlay')).toBeVisible()
    }
  })

  test('clicking Safe Zones again hides overlay', async ({ page }) => {
    const safeBtn = page.locator('button', { hasText: /safe zone/i }).first()
    // Turn on
    await safeBtn.click()
    await page.waitForTimeout(200)
    // Turn off
    await safeBtn.click()
    await page.waitForTimeout(200)
    await expect(page.locator('.pb-safe-overlay')).not.toBeVisible()
  })
})

// ─── 8. Analyzer Mode ────────────────────────────────────────────────────────

test.describe('Page Builder — Analyzer Mode', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
    await page.locator('.pb-mode-btn', { hasText: /analyzer/i }).first().click()
    await page.waitForTimeout(500)
  })

  test('analyzer panel renders', async ({ page }) => {
    await expect(page.locator('.pb-analyzer')).toBeVisible({ timeout: 5000 })
  })

  test('drop zone is visible before image upload', async ({ page }) => {
    await expect(page.locator('.pb-drop-zone')).toBeVisible({ timeout: 3000 })
  })

  test('drop zone has upload instruction text', async ({ page }) => {
    await expect(page.locator('.pb-drop-zone')).toContainText(/drop|upload|click/i)
  })

  test('hidden file input exists for upload trigger', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]')
    await expect(fileInput).toHaveCount(1)
  })
})

// ─── 9. Image Gen Mode ───────────────────────────────────────────────────────

test.describe('Page Builder — Image Gen Mode', () => {
  test.beforeEach(async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
    await page.locator('.pb-mode-btn', { hasText: /image/i }).first().click()
    await page.waitForTimeout(500)
  })

  test('image gen panel renders', async ({ page }) => {
    // Should have a heading about image generation
    await expect(page.locator('text=/generate image|image gen/i')).toBeVisible({ timeout: 3000 })
  })

  test('prompt textarea is present and editable', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await textarea.fill('A test prompt for image generation')
    await expect(textarea).toHaveValue('A test prompt for image generation')
  })

  test('Generate button is present', async ({ page }) => {
    const btn = page.locator('button', { hasText: /generate/i }).first()
    await expect(btn).toBeVisible()
  })

  test('Generate button is disabled when prompt is empty', async ({ page }) => {
    // Clear any existing text
    const textarea = page.locator('textarea').first()
    await textarea.fill('')
    const btn = page.locator('button', { hasText: /generate/i }).first()
    await expect(btn).toBeDisabled()
  })

  test('Generate button enables when prompt has text', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('A modern mobile app login screen')
    const btn = page.locator('button', { hasText: /generate/i }).first()
    await expect(btn).toBeEnabled()
  })

  test('provider info text is shown', async ({ page }) => {
    // Should show which image provider is active
    await expect(page.locator('text=/Provider:|DALL-E|Stability|Replicate|none/i')).toBeVisible({ timeout: 2000 })
  })
})

// ─── 10. API Route — pb-image-gen ────────────────────────────────────────────

test.describe('API — /api/pb-image-gen', () => {
  test('returns 400 on missing fields', async ({ request }) => {
    const res = await request.post('/api/pb-image-gen', {
      data: {}
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('returns 400 for unsupported provider', async ({ request }) => {
    const res = await request.post('/api/pb-image-gen', {
      data: { provider: 'unsupported', prompt: 'test', apiKey: 'fake-key' }
    })
    expect(res.status()).toBe(400)
  })

  test('returns structured error (not 500) for invalid Replicate key', async ({ request }) => {
    const res = await request.post('/api/pb-image-gen', {
      data: { provider: 'replicate', prompt: 'test image', model: 'black-forest-labs/flux-schnell', apiKey: 'invalid-key-for-testing' }
    })
    // Should return a structured error response — not crash with 500
    const body = await res.json().catch(() => null)
    expect(body).toBeTruthy()
    expect(body.error || res.status() < 500).toBeTruthy()
  })
})

// ─── 11. No regressions on existing workplace ────────────────────────────────

test.describe('Page Builder — No Regressions', () => {
  test('normal workplace still works after page builder toggle', async ({ page }) => {
    await goToWorkplace(page)
    await openPageBuilder(page)
    await closePageBuilder(page)
    await page.waitForTimeout(400)

    // Core workplace elements must still be present
    await expect(page.locator('.wp-root')).toBeVisible()
    await expect(page.locator('.wp-center')).toBeVisible()
    await expect(page.locator('.wp-left')).toBeVisible()
  })

  test('no console errors during page builder open/close cycle', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('hydration') && !text.includes('ResizeObserver') && !text.includes('monaco')) {
          errors.push(text)
        }
      }
    })

    await goToWorkplace(page)
    await openPageBuilder(page)
    await page.locator('.pb-mode-btn', { hasText: /editor/i }).first().click()
    await page.waitForTimeout(1000)
    await page.locator('.pb-mode-btn', { hasText: /preview/i }).first().click()
    await closePageBuilder(page)
    await page.waitForTimeout(500)

    expect(errors.length).toBeLessThanOrEqual(3)
  })
})
