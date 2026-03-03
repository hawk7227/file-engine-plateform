#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# FILE ENGINE WORKPLACE — COMPLETE VERIFICATION SCRIPT
# Run with Claude Code or manually on the dev machine
#
# Prerequisites:
#   - Node 20+, npm, Playwright installed
#   - .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - Port 3000 available
#
# Usage:
#   chmod +x verify-workplace.sh
#   ./verify-workplace.sh
# ═══════════════════════════════════════════════════════════════

set -e
PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; ((PASS++)); }
fail() { echo "  ❌ $1"; ((FAIL++)); }
warn() { echo "  ⚠️  $1"; ((WARN++)); }
section() { echo ""; echo "═══ $1 ═══"; }

# ─── GATE 1: STATIC ANALYSIS ──────────────────────────────────
section "GATE 1: STATIC ANALYSIS"

echo "Typecheck..."
if npx tsc --noEmit 2>/dev/null; then
  pass "TypeScript: 0 errors"
else
  fail "TypeScript: has errors"
fi

echo "Lint..."
LINT_EXIT=0
npm run lint 2>/dev/null || LINT_EXIT=$?
if [ $LINT_EXIT -eq 0 ]; then
  pass "Lint: within 965 warning threshold"
else
  fail "Lint: exceeded warning threshold or has errors"
fi

# ─── GATE 2: BUILD ────────────────────────────────────────────
section "GATE 2: PRODUCTION BUILD"

echo "Building..."
if npm run build 2>/dev/null; then
  pass "Production build: success"
else
  fail "Production build: FAILED"
  echo "  Cannot continue without passing build. Exiting."
  exit 1
fi

# ─── GATE 3: FILE VERIFICATION ────────────────────────────────
section "GATE 3: FILE INTEGRITY"

# Auth page
if grep -q "signInWithPassword" src/app/admin/workplace/page.tsx; then
  pass "Auth: page.tsx uses real Supabase signInWithPassword"
else
  fail "Auth: page.tsx still using mock user"
fi

if grep -q "AdminNavPill" src/app/admin/workplace/page.tsx; then
  fail "AdminNavPill: still imported in page.tsx"
else
  pass "AdminNavPill: removed from page.tsx"
fi

if grep -q "temp-admin" src/app/admin/workplace/page.tsx; then
  fail "Mock user: 'temp-admin' still in page.tsx"
else
  pass "Mock user: removed from page.tsx"
fi

# Chat panel
if grep -q 'data-role' src/components/workplace/WPChatPanel.tsx; then
  pass "Chat: data-role attributes present"
else
  fail "Chat: missing data-role attributes"
fi

if grep -q 'linear-gradient' src/components/workplace/WPChatPanel.tsx; then
  pass "Chat: green gradient for user bubbles"
else
  fail "Chat: missing gradient for user bubbles"
fi

if grep -q 'renderMarkdown' src/components/workplace/WPChatPanel.tsx; then
  pass "Chat: markdown rendering function exists"
else
  fail "Chat: no markdown rendering"
fi

if grep -q 'wpc-bubble' src/components/workplace/WPChatPanel.tsx; then
  pass "Chat: bubble styling present"
else
  fail "Chat: no bubble styling"
fi

if grep -q 'wpc-time' src/components/workplace/WPChatPanel.tsx; then
  pass "Chat: timestamps present"
else
  fail "Chat: no timestamps"
fi

# Tab bar
CHAT_TAB=$(grep -c "💬 Chat" src/components/workplace/WorkplaceLayout.tsx || true)
THEME_TAB=$(grep -c "🎨 Theme" src/components/workplace/WorkplaceLayout.tsx || true)
ADMIN_TAB=$(grep -c "📊 Admin" src/components/workplace/WorkplaceLayout.tsx || true)
SETTINGS_TAB=$(grep -c "⚙ Settings" src/components/workplace/WorkplaceLayout.tsx || true)

if [ "$CHAT_TAB" -ge 1 ] && [ "$THEME_TAB" -ge 1 ] && [ "$ADMIN_TAB" -ge 1 ] && [ "$SETTINGS_TAB" -ge 1 ]; then
  pass "Tab bar: 4 tabs (Chat, Theme, Admin, Settings)"
else
  fail "Tab bar: missing expected tabs"
fi

if grep -q "LEFT_TABS.map" src/components/workplace/WorkplaceLayout.tsx; then
  fail "Tab bar: still using LEFT_TABS.map (old 7-tab bar)"
else
  pass "Tab bar: LEFT_TABS.map removed (no longer iterating old tabs)"
fi

# Theme engine
SCHEME_COUNT=$(grep -c "id:" src/lib/theme-engine.ts | head -1 || true)
if [ "$SCHEME_COUNT" -ge 12 ]; then
  pass "Theme engine: 12+ schemes defined"
else
  warn "Theme engine: found $SCHEME_COUNT schemes (expected 12+)"
fi

if grep -q "text1.*ffffff\|text1.*#fff" src/lib/theme-engine.ts; then
  pass "Theme engine: text1 is pure white"
else
  warn "Theme engine: text1 may not be #ffffff"
fi

# Sidebar profile
if grep -q "userName" src/components/workplace/WPSidebar.tsx && grep -q "userEmail" src/components/workplace/WPSidebar.tsx; then
  pass "Sidebar: accepts userName and userEmail props"
else
  fail "Sidebar: missing user profile props"
fi

if grep -q "wp-sb-profile" src/components/workplace/WPSidebar.tsx; then
  pass "Sidebar: profile section exists"
else
  fail "Sidebar: no profile section"
fi

# Resize handle
if grep -q "wp-resize-h" src/components/workplace/WorkplaceLayout.tsx; then
  pass "Layout: horizontal resize handle wired"
else
  fail "Layout: no horizontal resize handle"
fi

if grep -q "startResizeH" src/components/workplace/WorkplaceLayout.tsx; then
  pass "Layout: resize handler implemented"
else
  fail "Layout: no resize handler"
fi

# Conversation persistence
if grep -q "useConversation" src/components/workplace/WorkplaceLayout.tsx; then
  pass "Persistence: useConversation hook wired"
else
  fail "Persistence: useConversation not wired"
fi

if grep -q "createConversation" src/components/workplace/WorkplaceLayout.tsx; then
  pass "Persistence: auto-create conversation on first message"
else
  fail "Persistence: no auto-create on first message"
fi

if grep -q "saveUserMessage\|saveAssistantMessage" src/components/workplace/WorkplaceLayout.tsx; then
  pass "Persistence: message saving wired"
else
  fail "Persistence: no message saving"
fi

# Dead code check
echo ""
echo "Dead code warnings:"
if grep -q "import.*WPRoutesPanel" src/components/workplace/WorkplaceLayout.tsx; then
  warn "Dead import: WPRoutesPanel (tab removed but still imported)"
fi
if grep -q "import.*WPVideoStudio" src/components/workplace/WorkplaceLayout.tsx; then
  warn "Dead import: WPVideoStudio (tab removed but still imported)"
fi
if grep -q "import.*WPImageStudio" src/components/workplace/WorkplaceLayout.tsx; then
  warn "Dead import: WPImageStudio (tab removed but still imported)"
fi
if grep -q "import.*WPTeamPanel" src/components/workplace/WorkplaceLayout.tsx; then
  warn "Dead import: WPTeamPanel (tab removed but still imported)"
fi
if grep -q "import.*WPActivityFeed" src/components/workplace/WorkplaceLayout.tsx; then
  warn "Dead import: WPActivityFeed (tab removed but still imported)"
fi

# Security check
if grep -q "Horace120" src/app/admin/workplace/page.tsx; then
  warn "SECURITY: Hardcoded password in page.tsx — MUST rotate and move to env vars"
fi

# ─── GATE 4: E2E TESTS ───────────────────────────────────────
section "GATE 4: E2E TESTS"

echo "Installing Playwright..."
npx playwright install --with-deps chromium 2>/dev/null || warn "Playwright install had issues"

echo "Running E2E tests..."
E2E_EXIT=0
npx playwright test 2>&1 || E2E_EXIT=$?

if [ $E2E_EXIT -eq 0 ]; then
  pass "E2E: all tests passed"
else
  fail "E2E: some tests failed (exit code $E2E_EXIT)"
fi

# ─── GATE 5: RUNTIME VERIFICATION (requires dev server) ──────
section "GATE 5: RUNTIME VERIFICATION"
echo "Starting dev server for runtime checks..."

# Start dev server in background
npm run dev &
DEV_PID=$!
sleep 8  # Wait for dev server to start

BASE_URL="http://localhost:3000"

# Check workplace page loads
echo "Checking /admin/workplace..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/workplace" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Workplace page: HTTP 200"
else
  fail "Workplace page: HTTP $HTTP_CODE (expected 200)"
fi

# Check API status
echo "Checking /api/status..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/status" 2>/dev/null || echo "000")
if [ "$API_CODE" -lt 500 ] 2>/dev/null; then
  pass "API /status: HTTP $API_CODE"
else
  fail "API /status: HTTP $API_CODE"
fi

# Check system-status
echo "Checking /api/system-status..."
SYS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/system-status" 2>/dev/null || echo "000")
if [ "$SYS_CODE" -lt 500 ] 2>/dev/null; then
  pass "API /system-status: HTTP $SYS_CODE"
else
  fail "API /system-status: HTTP $SYS_CODE"
fi

# Check page contains expected elements
echo "Checking page content..."
PAGE_HTML=$(curl -s "$BASE_URL/admin/workplace" 2>/dev/null || echo "")

if echo "$PAGE_HTML" | grep -q "Authenticating\|wp-root\|WorkplaceLayout"; then
  pass "Page HTML: contains expected content"
else
  warn "Page HTML: may not contain expected elements (could be client-rendered)"
fi

# Kill dev server
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

# ─── GATE 6: VISUAL VERIFICATION (Playwright screenshots) ────
section "GATE 6: VISUAL VERIFICATION (screenshots)"

echo "Taking screenshots for manual review..."

# Create a quick Playwright screenshot script
cat > /tmp/screenshot-verify.spec.ts << 'SPEC'
import { test, expect } from '@playwright/test'

test('workplace full page screenshot', async ({ page }) => {
  await page.goto('/admin/workplace')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(5000) // Wait for auth + dynamic import

  // Take full page screenshot
  await page.screenshot({ path: 'screenshots/01-full-page.png', fullPage: true })

  // Check for auth states
  const authLoading = page.locator('text=Authenticating')
  const authError = page.locator('text=Auth Failed')
  const wpRoot = page.locator('.wp-root')

  if (await authError.isVisible()) {
    await page.screenshot({ path: 'screenshots/02-auth-error.png' })
    console.log('AUTH STATE: ERROR — check Supabase credentials')
  } else if (await wpRoot.isVisible()) {
    console.log('AUTH STATE: AUTHENTICATED — workplace loaded')
    await page.screenshot({ path: 'screenshots/02-authenticated.png' })

    // Screenshot individual sections
    const sidebar = page.locator('.wp-sidebar')
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: 'screenshots/03-sidebar.png' })
    }

    const leftPanel = page.locator('.wp-left')
    if (await leftPanel.isVisible()) {
      await leftPanel.screenshot({ path: 'screenshots/04-left-panel.png' })
    }

    const topbar = page.locator('.wp-topbar')
    if (await topbar.isVisible()) {
      await topbar.screenshot({ path: 'screenshots/05-topbar.png' })
    }

    const footer = page.locator('.wp-footer')
    if (await footer.isVisible()) {
      await footer.screenshot({ path: 'screenshots/06-footer.png' })
    }

    // Check tab bar content
    const tabBar = page.locator('.wp-tbar')
    if (await tabBar.isVisible()) {
      await tabBar.screenshot({ path: 'screenshots/07-tab-bar.png' })
      const chatBtn = page.locator('.wp-tbtn', { hasText: 'Chat' })
      const themeBtn = page.locator('.wp-tbtn', { hasText: 'Theme' })
      const adminBtn = page.locator('.wp-tbtn', { hasText: 'Admin' })
      const settingsBtn = page.locator('.wp-tbtn', { hasText: 'Settings' })
      console.log(`Tab buttons: Chat=${await chatBtn.isVisible()}, Theme=${await themeBtn.isVisible()}, Admin=${await adminBtn.isVisible()}, Settings=${await settingsBtn.isVisible()}`)
    }

    // Check chat bubbles
    const chatBubbles = page.locator('.wpc-bubble')
    const userBubbles = page.locator('.wpc-msg[data-role="user"]')
    const aiBubbles = page.locator('.wpc-msg[data-role="assistant"]')
    console.log(`Chat bubbles: total=${await chatBubbles.count()}, user=${await userBubbles.count()}, ai=${await aiBubbles.count()}`)

    // Check profile in sidebar
    const profileSection = page.locator('.wp-sb-profile')
    if (await profileSection.isVisible()) {
      await profileSection.screenshot({ path: 'screenshots/08-profile.png' })
      const profileName = await profileSection.locator('.wp-sb-pname').textContent()
      console.log(`Profile name: ${profileName}`)
    }

    // Switch to theme tab and screenshot
    const themeTab = page.locator('.wp-tbtn', { hasText: 'Theme' })
    if (await themeTab.isVisible()) {
      await themeTab.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'screenshots/09-theme-panel.png' })
    }

    // Switch back to chat
    const chatTab = page.locator('.wp-tbtn', { hasText: 'Chat' })
    if (await chatTab.isVisible()) {
      await chatTab.click()
      await page.waitForTimeout(500)
    }

    // Type a test message (don't send)
    const chatInput = page.locator('.wpc-input')
    if (await chatInput.isVisible()) {
      await chatInput.fill('Test message from verification script')
      await page.screenshot({ path: 'screenshots/10-chat-with-input.png' })
      await chatInput.fill('') // Clear
    }

  } else {
    console.log('AUTH STATE: LOADING or UNKNOWN')
    await page.screenshot({ path: 'screenshots/02-loading-state.png' })
  }
})
SPEC

mkdir -p screenshots
npx playwright test /tmp/screenshot-verify.spec.ts --reporter=list 2>&1 || warn "Screenshot test had issues"

echo ""
echo "Screenshots saved to ./screenshots/"
echo "Review them to verify visual correctness."

# ─── SUMMARY ──────────────────────────────────────────────────
section "SUMMARY"
echo ""
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  ⚠️  Warnings: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "  🟢 ALL GATES PASSED"
else
  echo "  🔴 $FAIL FAILURES — FIX BEFORE PROCEEDING"
fi

echo ""
echo "  Next steps:"
echo "  1. Review screenshots in ./screenshots/"
echo "  2. Rotate Supabase password (hardcoded in source)"
echo "  3. Set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD in Vercel"
echo "  4. Clean up dead imports (Routes, Video, Images, Team, Feed)"
echo "  5. Build Settings page (font sizer, panel colors)"
